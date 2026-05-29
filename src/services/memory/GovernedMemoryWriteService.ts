import { eventBus } from "../eventBus";
import { approvalRequestCenterService, type ApprovalRequestCenterService } from "../provenance/ApprovalRequestCenterService";
import { provenanceGateService, type ProvenanceGateService } from "../provenance/ProvenanceGateService";
import { runtimeInboxService, type RuntimeInboxService, sanitizeRuntimeMetadata } from "../runtime/RuntimeInboxService";
import { memoryGovernanceService, type MemoryGovernanceService } from "./MemoryGovernanceService";
import { memoryProposalService, type MemoryProposalService, redactSecrets } from "./MemoryProposalService";
import type { ActionInstanceIdentity } from "../../types/provenance";
import type { MemoryNode } from "../../types";
import {
  MEMORY_PROPOSAL_MAX_MEMORY_LENGTH,
  MEMORY_PROPOSAL_WRITABLE_RISK_LEVELS,
  type MemoryProposalKind,
  type MemoryProposalRecord,
  type MemoryWriteDiagnosticsSummary,
  type MemoryWriteRecord,
} from "../../types/memoryProposal";

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const STORAGE_KEY = "LUCA_GOVERNED_MEMORY_WRITES_V1";
const MAX_WRITES = 300;

function nowIso(): string {
  return new Date().toISOString();
}

function getStorage(): StorageLike | undefined {
  if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  if (typeof localStorage !== "undefined") return localStorage;
  return undefined;
}

function readWrites(store: StorageLike | undefined): MemoryWriteRecord[] {
  try {
    const raw = store?.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const MEMORY_CATEGORY_FOR_KIND: Record<MemoryProposalKind, MemoryNode["category"]> = {
  user_fact: "FACT",
  preference: "USER_STATE",
  project_context: "SEMANTIC",
  session_summary: "SESSION_STATE",
  agent_state: "AGENT_STATE",
  correction: "FACT",
  reminder_context: "SEMANTIC",
  other: "SEMANTIC",
};

// Minimal safe wrapper around the existing memoryService write path. This does
// NOT rewrite memoryService; it only forwards a sanitized key/value/category to
// the established saveMemory method.
export interface SafeMemoryWriter {
  saveMemory(
    key: string,
    value: string,
    category: MemoryNode["category"],
  ): Promise<{ id: string } | null>;
}

// Lazily resolve the existing memoryService so importing this module never
// eagerly pulls the browser-only memory stack into non-DOM environments.
const lazyMemoryWriter: SafeMemoryWriter = {
  async saveMemory(key, value, category) {
    const { memoryService } = await import("../memoryService");
    return memoryService.saveMemory(key, value, category);
  },
};

export interface CanWriteResult {
  allowed: boolean;
  reason: string;
  blockedBy: string[];
}

export interface GovernedMemoryWriteDependencies {
  storage?: StorageLike;
  proposals: Pick<MemoryProposalService, "getProposal" | "markWritten" | "blockProposal">;
  approvals: Pick<ApprovalRequestCenterService, "getRequest" | "hasApprovedOnce">;
  provenance: Pick<ProvenanceGateService, "canActionRun" | "checkWhetherActionCanRun" | "listRecords" | "computeActionDigest">;
  memoryGovernance: Pick<MemoryGovernanceService, "attachGovernanceRecord" | "markProposalWritten">;
  inbox: Pick<RuntimeInboxService, "ingestEvent">;
  bus: Pick<typeof eventBus, "emitEvent" | "emit">;
  memory: SafeMemoryWriter;
}

export class GovernedMemoryWriteService {
  private writes: MemoryWriteRecord[];

  constructor(
    private readonly deps: GovernedMemoryWriteDependencies = {
      storage: getStorage(),
      proposals: memoryProposalService,
      approvals: approvalRequestCenterService,
      provenance: provenanceGateService,
      memoryGovernance: memoryGovernanceService,
      inbox: runtimeInboxService,
      bus: eventBus,
      memory: lazyMemoryWriter,
    },
  ) {
    this.writes = readWrites(this.deps.storage);
  }

  canWriteProposal(proposalId: string): CanWriteResult {
    const proposal = this.deps.proposals.getProposal(proposalId);
    if (!proposal) return { allowed: false, reason: "Memory proposal not found.", blockedBy: ["missing_proposal"] };
    if (proposal.status === "written") return { allowed: false, reason: "This memory has already been saved.", blockedBy: ["already_written"] };
    if (proposal.status !== "approved_waiting_write") {
      return { allowed: false, reason: "This proposal has not been approved for writing.", blockedBy: ["not_approved"] };
    }
    if (!MEMORY_PROPOSAL_WRITABLE_RISK_LEVELS.includes(proposal.riskLevel)) {
      return { allowed: false, reason: "Blocked for safety: elevated/high-risk proposals cannot be written yet.", blockedBy: ["risk_too_high"] };
    }
    if (!proposal.approvalRequestId || !this.deps.approvals.hasApprovedOnce(proposal.approvalRequestId)) {
      return { allowed: false, reason: "A one-time approval is required before saving this memory.", blockedBy: ["approval_required"] };
    }
    const provenanceCheck = this.checkProvenanceChain(proposal);
    if (!provenanceCheck.allowed) return provenanceCheck;

    const runCheck = this.deps.provenance.canActionRun(this.buildActionIdentity(proposal));
    if (!runCheck.allowed) {
      return { allowed: false, reason: runCheck.userSafeReason, blockedBy: runCheck.blockedBy };
    }
    return { allowed: true, reason: "Approved memory is ready to save once.", blockedBy: [] };
  }

  async writeApprovedProposal(proposalId: string): Promise<MemoryWriteRecord> {
    const proposal = this.deps.proposals.getProposal(proposalId);
    if (!proposal) {
      return this.recordWrite(proposalId, undefined, "blocked", "Memory proposal not found.", ["missing_proposal"], false);
    }

    const precheck = this.canWriteProposal(proposalId);
    if (!precheck.allowed) {
      this.deps.proposals.blockProposal(proposalId, precheck.reason);
      return this.recordWriteForProposal(proposal, undefined, "blocked", precheck.reason, precheck.blockedBy, false);
    }

    // Consume the one-shot approval at actual write time.
    const consume = this.deps.provenance.checkWhetherActionCanRun(this.buildActionIdentity(proposal));
    if (!consume.allowed) {
      this.deps.proposals.blockProposal(proposalId, consume.userSafeReason || "Approval consumption failed.");
      return this.recordWriteForProposal(proposal, undefined, "blocked", consume.userSafeReason || "Approval consumption failed.", consume.blockedBy, false);
    }

    try {
      const value = redactSecrets(proposal.proposedMemory).slice(0, MEMORY_PROPOSAL_MAX_MEMORY_LENGTH);
      const key = redactSecrets(proposal.title).slice(0, 160) || `luca-memory:${proposal.kind}`;
      const category = MEMORY_CATEGORY_FOR_KIND[proposal.kind] ?? "SEMANTIC";
      const node = await this.deps.memory.saveMemory(key, value, category);

      if (!node) {
        this.deps.proposals.blockProposal(proposalId, "Memory write was filtered by the safe write path.");
        return this.recordWriteForProposal(proposal, undefined, "failed", "Memory write was filtered by the safe write path.", ["write_filtered"], true);
      }

      this.deps.memoryGovernance.attachGovernanceRecord({
        memoryId: node.id,
        source: proposal.source,
        category,
        confidence: proposal.confidence,
        writePolicy: "local_only",
        retrievalPolicy: "normal",
        reviewState: "user_approved",
      });
      this.deps.memoryGovernance.markProposalWritten(proposal.proposalId, node.id);
      this.deps.proposals.markWritten(proposal.proposalId, node.id);

      return this.recordWriteForProposal(proposal, node.id, "succeeded", `Memory saved once with provenance: ${key}`, undefined, true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown memory write error";
      this.deps.proposals.blockProposal(proposalId, `Memory write failed: ${message}`);
      return this.recordWriteForProposal(proposal, undefined, "failed", `Memory write failed: ${message}`, ["write_error"], true);
    }
  }

  listMemoryWrites(): MemoryWriteRecord[] {
    return [...this.writes];
  }

  getDiagnosticsSummary(): MemoryWriteDiagnosticsSummary {
    const succeeded = this.writes.filter((item) => item.status === "succeeded");
    return {
      totalWrites: this.writes.length,
      succeededWrites: succeeded.length,
      blockedWrites: this.writes.filter((item) => item.status === "blocked").length,
      failedWrites: this.writes.filter((item) => item.status === "failed").length,
      lastWriteAt: succeeded.length > 0 ? succeeded[0].createdAt : undefined,
    };
  }

  private checkProvenanceChain(proposal: MemoryProposalRecord): CanWriteResult {
    const records = this.deps.provenance.listRecords();
    for (const provId of proposal.provenanceIds) {
      const record = records.find((item) => item.provenanceId === provId);
      if (!record) return { allowed: false, reason: "Provenance record not found.", blockedBy: ["missing_provenance"] };
      if (record.quarantineState === "quarantined") return { allowed: false, reason: "Provenance record is quarantined.", blockedBy: ["quarantined_provenance"] };
      if (record.revocationState === "revoked") return { allowed: false, reason: "Provenance record has been revoked.", blockedBy: ["revoked_provenance"] };
      if (record.expiresAt && Date.parse(record.expiresAt) <= Date.now()) return { allowed: false, reason: "Provenance record has expired.", blockedBy: ["expired_provenance"] };
    }
    return { allowed: true, reason: "Provenance verified.", blockedBy: [] };
  }

  private buildActionIdentity(proposal: MemoryProposalRecord): ActionInstanceIdentity {
    return {
      actionInstanceId: `memory-proposal:${proposal.kind}:${proposal.createdAt}`,
      actionType: "memory_write",
      target: `memory:${proposal.kind}`,
      parameters: sanitizeRuntimeMetadata({ kind: proposal.kind, source: proposal.source }),
      provenanceChain: [...proposal.provenanceIds],
      timestampBucket: proposal.createdAt.slice(0, 16),
    };
  }

  private recordWriteForProposal(
    proposal: MemoryProposalRecord,
    memoryId: string | undefined,
    status: MemoryWriteRecord["status"],
    summary: string,
    blockedBy: string[] | undefined,
    consumedApproval: boolean,
  ): MemoryWriteRecord {
    const record: MemoryWriteRecord = {
      writeId: `memory-write:${proposal.actionDigest.slice(-8)}:${nowIso()}`,
      proposalId: proposal.proposalId,
      memoryId,
      approvalRequestId: proposal.approvalRequestId,
      actionDigest: proposal.actionDigest,
      provenanceIds: [...proposal.provenanceIds],
      riskLevel: proposal.riskLevel,
      status,
      summary,
      blockedBy: blockedBy && blockedBy.length > 0 ? blockedBy : undefined,
      consumedApproval,
      createdAt: nowIso(),
    };
    this.persistWrite(record);
    this.emitAndNotify(proposal, record);
    return record;
  }

  private recordWrite(
    proposalId: string,
    memoryId: string | undefined,
    status: MemoryWriteRecord["status"],
    summary: string,
    blockedBy: string[] | undefined,
    consumedApproval: boolean,
  ): MemoryWriteRecord {
    const record: MemoryWriteRecord = {
      writeId: `memory-write:unknown:${nowIso()}`,
      proposalId,
      memoryId,
      actionDigest: "unknown",
      provenanceIds: [],
      riskLevel: "low",
      status,
      summary,
      blockedBy: blockedBy && blockedBy.length > 0 ? blockedBy : undefined,
      consumedApproval,
      createdAt: nowIso(),
    };
    this.persistWrite(record);
    return record;
  }

  private emitAndNotify(proposal: MemoryProposalRecord, record: MemoryWriteRecord): void {
    const eventType =
      record.status === "succeeded"
        ? "memory_write_succeeded"
        : record.status === "blocked"
          ? "memory_write_blocked"
          : "memory_write_failed";
    this.deps.inbox.ingestEvent({
      source: "memory",
      sourceTrustLevel: "local",
      title: proposal.title,
      body: record.summary,
      eventType,
      provenance: {
        provenanceId: proposal.provenanceIds[0] ?? "unknown",
        sourceType: "memory",
        sourceId: proposal.proposalId,
        sourceTrustLevel: "local",
        createdBy: proposal.source,
        createdAt: nowIso(),
        digest: proposal.actionDigest,
        parentProvenanceIds: proposal.provenanceIds,
        quarantineState: "clear",
        approvalState: record.status === "succeeded" ? "expired" : "pending",
        revocationState: "active",
      },
      requiresApproval: false,
      metadata: sanitizeRuntimeMetadata({ proposalId: proposal.proposalId, status: record.status, memoryId: record.memoryId }),
    });
    this.deps.bus.emitEvent({
      type: eventType,
      message: `${eventType}: ${proposal.title}`,
      priority: record.status === "succeeded" ? "MEDIUM" : "HIGH",
      context: { timestamp: Date.now(), proposalId: proposal.proposalId, status: record.status },
    });
    this.deps.bus.emit(eventType, { proposalId: proposal.proposalId, memoryId: record.memoryId, status: record.status });
  }

  private persistWrite(record: MemoryWriteRecord): void {
    this.writes = [record, ...this.writes.filter((item) => item.writeId !== record.writeId)];
    if (this.writes.length > MAX_WRITES) this.writes = this.writes.slice(0, MAX_WRITES);
    this.deps.storage?.setItem(STORAGE_KEY, JSON.stringify(this.writes));
  }
}

export const governedMemoryWriteService = new GovernedMemoryWriteService();

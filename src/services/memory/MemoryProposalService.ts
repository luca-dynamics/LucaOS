import { eventBus } from "../eventBus";
import { approvalRequestCenterService, type ApprovalRequestCenterService } from "../provenance/ApprovalRequestCenterService";
import { provenanceGateService, type ProvenanceGateService } from "../provenance/ProvenanceGateService";
import { runtimeInboxService, type RuntimeInboxService, sanitizeRuntimeMetadata } from "../runtime/RuntimeInboxService";
import { memoryGovernanceService, type MemoryGovernanceService } from "./MemoryGovernanceService";
import type { ActionInstanceIdentity } from "../../types/provenance";
import {
  MEMORY_PROPOSAL_MAX_MEMORY_LENGTH,
  MEMORY_PROPOSAL_MAX_SUMMARY_LENGTH,
  type MemoryProposalDiagnosticsSummary,
  type MemoryProposalKind,
  type MemoryProposalRecord,
  type MemoryProposalRiskLevel,
} from "../../types/memoryProposal";

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const STORAGE_KEY = "LUCA_MEMORY_PROPOSALS_V1";
const MAX_RECORDS = 500;

// Patterns that must never be persisted from a proposed memory.
const SECRET_PATTERNS = [
  /sk-[A-Za-z0-9_-]{8,}/g,
  /gh[pousr]_[A-Za-z0-9_]{12,}/g,
  /AIza[A-Za-z0-9_-]{12,}/g,
  /token[:=][^\s]+/gi,
  /api[_-]?key[:=][^\s]+/gi,
  /password[:=][^\s]+/gi,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/g,
];

// Higher-signal patterns that indicate the content is fundamentally unsafe to
// persist (raw secrets, mnemonics, wallet keys, hidden system prompts).
const BLOCKING_PATTERNS = [
  /sk-[A-Za-z0-9_-]{8,}/,
  /gh[pousr]_[A-Za-z0-9_]{12,}/,
  /AIza[A-Za-z0-9_-]{12,}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\b(?:[a-z]+\s+){11,}[a-z]+\b/i, // long lowercase word sequences (mnemonic-like)
  /\b(mnemonic|seed phrase|private key|secret key)\b/i,
  /\b(system prompt|hidden prompt|you are luca[, ].*system)\b/i,
];

function nowIso(): string {
  return new Date().toISOString();
}

function getStorage(): StorageLike | undefined {
  if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  if (typeof localStorage !== "undefined") return localStorage;
  return undefined;
}

function readRecords(store: StorageLike | undefined): MemoryProposalRecord[] {
  try {
    const raw = store?.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function redactSecrets(value: string): string {
  return SECRET_PATTERNS.reduce((current, pattern) => current.replace(pattern, "[redacted]"), value);
}

export function containsBlockingSecret(value: string): boolean {
  return BLOCKING_PATTERNS.some((pattern) => pattern.test(value));
}

function sanitizeText(value: string, maxLength: number): string {
  return redactSecrets(value).slice(0, maxLength);
}

export interface CreateMemoryProposalInput {
  title: string;
  summary: string;
  proposedMemory: string;
  kind: MemoryProposalKind;
  source: string;
  sourceId?: string;
  provenanceIds: string[];
  riskLevel?: MemoryProposalRiskLevel;
  confidence?: number;
  reason?: string;
  expiresAt?: string;
  metadata?: Record<string, unknown>;
  createApprovalRequest?: boolean;
}

export interface MemoryProposalServiceDependencies {
  storage?: StorageLike;
  provenance: Pick<ProvenanceGateService, "computeActionDigest">;
  approvals: Pick<ApprovalRequestCenterService, "createApprovalRequest" | "approveOnce" | "reject" | "revoke">;
  inbox: Pick<RuntimeInboxService, "ingestEvent">;
  memoryGovernance: Pick<
    MemoryGovernanceService,
    "createGovernanceRecordForProposal" | "markProposalApproved" | "markProposalRejected"
  >;
  bus: Pick<typeof eventBus, "emitEvent" | "emit">;
}

export class MemoryProposalService {
  private proposals: MemoryProposalRecord[];

  constructor(
    private readonly deps: MemoryProposalServiceDependencies = {
      storage: getStorage(),
      provenance: provenanceGateService,
      approvals: approvalRequestCenterService,
      inbox: runtimeInboxService,
      memoryGovernance: memoryGovernanceService,
      bus: eventBus,
    },
  ) {
    this.proposals = readRecords(this.deps.storage);
  }

  createProposal(input: CreateMemoryProposalInput): MemoryProposalRecord {
    if (input.provenanceIds.length === 0) {
      throw new Error("Memory proposals require provenance.");
    }

    const timestamp = nowIso();
    const summary = sanitizeText(input.summary, MEMORY_PROPOSAL_MAX_SUMMARY_LENGTH);
    const proposedMemory = sanitizeText(input.proposedMemory, MEMORY_PROPOSAL_MAX_MEMORY_LENGTH);
    const isUnsafe = containsBlockingSecret(input.proposedMemory) || containsBlockingSecret(input.summary);
    const riskLevel: MemoryProposalRiskLevel = isUnsafe ? "high" : input.riskLevel ?? "low";

    const actionIdentity: ActionInstanceIdentity = {
      actionInstanceId: `memory-proposal:${input.kind}:${timestamp}`,
      actionType: "memory_write",
      target: `memory:${input.kind}`,
      parameters: sanitizeRuntimeMetadata({ kind: input.kind, source: input.source }),
      provenanceChain: [...input.provenanceIds],
      timestampBucket: timestamp.slice(0, 16),
    };
    const actionDigest = this.deps.provenance.computeActionDigest(actionIdentity);

    const proposal: MemoryProposalRecord = {
      proposalId: `memory-proposal:${actionDigest.slice(-8)}:${timestamp}`,
      title: sanitizeText(input.title, 160),
      summary,
      proposedMemory,
      kind: input.kind,
      source: input.source,
      sourceId: input.sourceId,
      provenanceIds: [...input.provenanceIds],
      actionDigest,
      status: isUnsafe ? "blocked" : "proposed",
      riskLevel,
      confidence: typeof input.confidence === "number" ? Math.max(0, Math.min(1, input.confidence)) : 0.6,
      reason: sanitizeText(input.reason ?? "Luca proposed a memory for your review.", 400),
      createdAt: timestamp,
      updatedAt: timestamp,
      expiresAt: input.expiresAt,
      blockedBy: isUnsafe ? ["secret_like_content"] : undefined,
      metadata: sanitizeRuntimeMetadata(input.metadata ?? {}),
    };

    if (isUnsafe) {
      this.upsert(proposal);
      this.createInboxEvent(proposal, "memory_write_blocked", "Memory proposal blocked because it contained secret-like content.");
      this.emit("memory_write_blocked", proposal, { reason: "secret_like_content" });
      return proposal;
    }

    if (input.createApprovalRequest ?? true) {
      const approval = this.deps.approvals.createApprovalRequest(actionIdentity, {
        title: proposal.title,
        description: summary,
        riskLevel: this.toApprovalRiskLevel(riskLevel),
        requestedBy: input.source,
        sourceType: "memory_write",
        sourceId: proposal.proposalId,
        actionPreview: { kind: input.kind, summary },
      });
      proposal.approvalRequestId = approval.approvalRequestId;
      proposal.status = "approval_required";
    }

    this.upsert(proposal);
    this.deps.memoryGovernance.createGovernanceRecordForProposal(proposal);
    this.createInboxEvent(proposal, "memory_proposal_created", proposal.reason);
    this.emit("memory_proposal_created", proposal);
    return proposal;
  }

  listProposals(): MemoryProposalRecord[] {
    return [...this.proposals];
  }

  getProposal(proposalId: string): MemoryProposalRecord | undefined {
    return this.proposals.find((item) => item.proposalId === proposalId);
  }

  approveProposal(proposalId: string): MemoryProposalRecord | undefined {
    const proposal = this.getProposal(proposalId);
    if (!proposal) return undefined;
    if (proposal.status === "blocked" || proposal.status === "rejected" || proposal.status === "revoked") {
      return proposal;
    }
    if (proposal.approvalRequestId) {
      this.deps.approvals.approveOnce(proposal.approvalRequestId);
    }
    return this.markApprovedWaitingWrite(proposalId);
  }

  /**
   * Sync the proposal to approved_waiting_write when its ApprovalRequest was
   * already approved elsewhere (e.g. the generic Pending approvals list).
   * This intentionally does NOT call approveOnce again — the one-shot approval
   * has already been granted — and never writes memory.
   */
  syncApprovedFromApprovalRequest(proposalId: string): MemoryProposalRecord | undefined {
    const proposal = this.getProposal(proposalId);
    if (!proposal) return undefined;
    if (proposal.status === "blocked" || proposal.status === "rejected" || proposal.status === "revoked" || proposal.status === "written") {
      return proposal;
    }
    return this.markApprovedWaitingWrite(proposalId);
  }

  private markApprovedWaitingWrite(proposalId: string): MemoryProposalRecord | undefined {
    const updated = this.update(proposalId, { status: "approved_waiting_write" });
    if (updated) {
      this.deps.memoryGovernance.markProposalApproved(updated.proposalId);
      this.createInboxEvent(updated, "memory_proposal_approved", "Memory proposal approved — ready to save once.");
      this.emit("memory_proposal_approved", updated);
    }
    return updated;
  }

  rejectProposal(proposalId: string): MemoryProposalRecord | undefined {
    const proposal = this.getProposal(proposalId);
    if (!proposal) return undefined;
    if (proposal.approvalRequestId) {
      this.deps.approvals.reject(proposal.approvalRequestId);
    }
    const updated = this.update(proposalId, { status: "rejected" });
    if (updated) {
      this.deps.memoryGovernance.markProposalRejected(updated.proposalId);
      this.createInboxEvent(updated, "memory_proposal_rejected", "Memory proposal rejected.");
      this.emit("memory_proposal_rejected", updated);
    }
    return updated;
  }

  revokeProposal(proposalId: string): MemoryProposalRecord | undefined {
    const proposal = this.getProposal(proposalId);
    if (!proposal) return undefined;
    if (proposal.approvalRequestId) {
      this.deps.approvals.revoke(proposal.approvalRequestId);
    }
    const updated = this.update(proposalId, { status: "revoked" });
    if (updated) {
      this.deps.memoryGovernance.markProposalRejected(updated.proposalId);
      this.createInboxEvent(updated, "memory_proposal_rejected", "Memory proposal revoked.");
      this.emit("memory_proposal_rejected", updated);
    }
    return updated;
  }

  blockProposal(proposalId: string, reason: string): MemoryProposalRecord | undefined {
    const updated = this.update(proposalId, { status: "blocked", blockedBy: [reason] });
    if (updated) {
      this.createInboxEvent(updated, "memory_write_blocked", `Memory proposal blocked: ${reason}`);
      this.emit("memory_write_blocked", updated, { reason });
    }
    return updated;
  }

  markWritten(proposalId: string, memoryId: string): MemoryProposalRecord | undefined {
    const updated = this.update(proposalId, {
      status: "written",
      memoryId,
      writtenAt: nowIso(),
    });
    if (updated) {
      // Close the proposal loop: surface a durable inbox event and bus signal so
      // chat / activity / pilot can refresh and show "remembered" feedback.
      this.createInboxEvent(
        updated,
        "memory_write_succeeded",
        `Remembered: ${updated.title}`,
      );
      this.emit("memory_write_succeeded", updated, { memoryId });
    }
    return updated;
  }

  expireOldProposals(at: string = nowIso()): MemoryProposalRecord[] {
    const expired = this.proposals.filter(
      (item) =>
        (item.status === "proposed" || item.status === "approval_required") &&
        item.expiresAt !== undefined &&
        Date.parse(item.expiresAt) <= Date.parse(at),
    );
    expired.forEach((item) => this.update(item.proposalId, { status: "expired" }));
    return expired.map((item) => ({ ...item, status: "expired" as const }));
  }

  getDiagnosticsSummary(): MemoryProposalDiagnosticsSummary {
    return {
      totalProposals: this.proposals.length,
      proposedProposals: this.proposals.filter((item) => item.status === "proposed").length,
      approvalRequiredProposals: this.proposals.filter((item) => item.status === "approval_required").length,
      approvedWaitingWriteProposals: this.proposals.filter((item) => item.status === "approved_waiting_write").length,
      writtenProposals: this.proposals.filter((item) => item.status === "written").length,
      rejectedProposals: this.proposals.filter((item) => item.status === "rejected").length,
      blockedProposals: this.proposals.filter((item) => item.status === "blocked").length,
      revokedProposals: this.proposals.filter((item) => item.status === "revoked").length,
      expiredProposals: this.proposals.filter((item) => item.status === "expired").length,
    };
  }

  private toApprovalRiskLevel(riskLevel: MemoryProposalRiskLevel): "low" | "medium" | "high" | "critical" {
    switch (riskLevel) {
      case "safe":
      case "low":
        return "low";
      case "elevated":
        return "high";
      case "high":
        return "critical";
      default:
        return "medium";
    }
  }

  private createInboxEvent(proposal: MemoryProposalRecord, eventType: string, body: string): void {
    this.deps.inbox.ingestEvent({
      source: "memory",
      sourceTrustLevel: "local",
      title: `${proposal.title}`,
      body,
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
        approvalState: proposal.status === "approved_waiting_write" ? "approved_once" : "pending",
        revocationState: "active",
      },
      requiresApproval: proposal.status === "approval_required",
      metadata: sanitizeRuntimeMetadata({ proposalId: proposal.proposalId, kind: proposal.kind, riskLevel: proposal.riskLevel }),
    });
  }

  private emit(type: string, proposal: MemoryProposalRecord, extra: Record<string, unknown> = {}): void {
    this.deps.bus.emitEvent({
      type,
      message: `${type}: ${proposal.title}`,
      priority: type === "memory_write_blocked" ? "HIGH" : "MEDIUM",
      context: { timestamp: Date.now(), proposalId: proposal.proposalId, ...extra },
    });
    this.deps.bus.emit(type, { proposalId: proposal.proposalId, ...extra });
  }

  private update(proposalId: string, update: Partial<MemoryProposalRecord>): MemoryProposalRecord | undefined {
    const existing = this.getProposal(proposalId);
    if (!existing) return undefined;
    const next: MemoryProposalRecord = {
      ...existing,
      ...update,
      proposalId: existing.proposalId,
      createdAt: existing.createdAt,
      updatedAt: nowIso(),
    };
    this.proposals = this.proposals.map((item) => (item.proposalId === proposalId ? next : item));
    this.persist();
    return next;
  }

  private upsert(proposal: MemoryProposalRecord): void {
    this.proposals = [proposal, ...this.proposals.filter((item) => item.proposalId !== proposal.proposalId)];
    this.persist();
  }

  private persist(): void {
    if (this.proposals.length > MAX_RECORDS) this.proposals = this.proposals.slice(0, MAX_RECORDS);
    this.deps.storage?.setItem(STORAGE_KEY, JSON.stringify(this.proposals));
  }
}

export const memoryProposalService = new MemoryProposalService();

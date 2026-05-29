import type { MemoryGovernanceDiagnosticsSummary, MemoryGovernanceRecord, MemoryGovernanceReviewState, MemoryGovernanceType, MemoryGovernanceWritePolicy, MemoryWriteRiskInput } from "../../types/memoryGovernance";
import type { ProvenanceMetadata } from "../../types/provenance";
import type { MemoryProposalKind, MemoryProposalRecord } from "../../types/memoryProposal";

function proposalGovernanceId(proposalId: string): string { return `proposal:${proposalId}`; }
function memoryTypeForProposalKind(kind: MemoryProposalKind): MemoryGovernanceType {
  switch (kind) {
    case "user_fact": return "profile";
    case "preference": return "preference";
    case "project_context": return "artifact";
    case "session_summary":
    case "reminder_context": return "conversation";
    case "agent_state": return "operational";
    default: return "unknown";
  }
}

interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void; }
const STORAGE_KEY = "LUCA_MEMORY_GOVERNANCE_V1";
const MAX_RECORDS = 1000;
function nowIso(): string { return new Date().toISOString(); }
function storage(): StorageLike | undefined { if (typeof window !== "undefined" && window.localStorage) return window.localStorage; if (typeof localStorage !== "undefined") return localStorage; return undefined; }
function readRecords(store: StorageLike | undefined): MemoryGovernanceRecord[] { try { const raw = store?.getItem(STORAGE_KEY); const parsed = raw ? JSON.parse(raw) : []; return Array.isArray(parsed) ? parsed : []; } catch { return []; } }

export class MemoryGovernanceService {
  private records: MemoryGovernanceRecord[];
  constructor(private readonly backingStorage: StorageLike | undefined = storage()) { this.records = readRecords(this.backingStorage); }

  classifyMemoryWriteRisk(input: MemoryWriteRiskInput): MemoryGovernanceWritePolicy {
    if (input.isTemporary) return "temporary_only";
    if (input.localOnly) return "local_only";
    if (input.writesOperationalInstruction || input.containsSensitiveData) return "approval_required";
    if ((input.confidence ?? 1) < 0.6) return "approval_required";
    if (input.source && ["external", "web", "message", "unknown"].includes(input.source)) return "approval_required";
    if (input.memoryType === "operational") return "approval_required";
    return "auto_allowed_low_risk";
  }

  attachGovernanceRecord(input: Partial<MemoryGovernanceRecord> & { memoryId: string; source: string; provenance?: ProvenanceMetadata }): MemoryGovernanceRecord {
    const timestamp = nowIso();
    const writePolicy = input.writePolicy ?? this.classifyMemoryWriteRisk({ memoryType: input.memoryType, category: input.category, source: input.source, confidence: input.confidence });
    const record: MemoryGovernanceRecord = { memoryId: input.memoryId, memoryType: input.memoryType ?? "unknown", category: input.category ?? "uncategorized", source: input.source, provenance: input.provenance, confidence: input.confidence ?? 0.5, userVisible: input.userVisible ?? true, editable: input.editable ?? true, deletable: input.deletable ?? true, quarantined: input.quarantined ?? false, expiresAt: input.expiresAt, lastAccessedAt: input.lastAccessedAt, writePolicy, retrievalPolicy: input.retrievalPolicy ?? (writePolicy === "approval_required" ? "approval_required" : "normal"), reviewState: input.reviewState ?? "unreviewed", createdAt: input.createdAt ?? timestamp, updatedAt: timestamp };
    this.records = [...this.records.filter((item) => item.memoryId !== record.memoryId), record];
    this.persist();
    return record;
  }

  listGovernanceSummaries(existingMemories: Array<Record<string, unknown>> = []): MemoryGovernanceRecord[] {
    const synthesized = existingMemories
      .filter((memory) => !this.records.some((record) => record.memoryId === String(memory.id ?? memory.memoryId)))
      .map((memory) => this.compatibleSummaryFromExisting(memory));
    return [...this.records, ...synthesized];
  }

  createGovernanceRecordForProposal(proposal: MemoryProposalRecord): MemoryGovernanceRecord {
    return this.attachGovernanceRecord({
      memoryId: proposalGovernanceId(proposal.proposalId),
      source: proposal.source,
      memoryType: memoryTypeForProposalKind(proposal.kind),
      category: `proposal:${proposal.kind}`,
      confidence: proposal.confidence,
      writePolicy: "approval_required",
      retrievalPolicy: "approval_required",
      reviewState: "unreviewed",
      userVisible: true,
      editable: false,
      deletable: true,
    });
  }
  markProposalApproved(proposalId: string): MemoryGovernanceRecord | undefined { return this.updateReview(proposalGovernanceId(proposalId), { reviewState: "user_approved" }); }
  markProposalWritten(proposalId: string, memoryId: string): MemoryGovernanceRecord | undefined { return this.updateReview(proposalGovernanceId(proposalId), { reviewState: "user_approved", retrievalPolicy: "normal", writePolicy: "local_only", category: `written:${memoryId}` }); }
  markProposalRejected(proposalId: string): MemoryGovernanceRecord | undefined { return this.updateReview(proposalGovernanceId(proposalId), { reviewState: "rejected", retrievalPolicy: "never_retrieve" }); }
  getProposalGovernanceSummary(): { totalProposalRecords: number; approvedProposalRecords: number; rejectedProposalRecords: number } {
    const proposalRecords = this.records.filter((record) => record.memoryId.startsWith("proposal:"));
    return {
      totalProposalRecords: proposalRecords.length,
      approvedProposalRecords: proposalRecords.filter((record) => record.reviewState === "user_approved").length,
      rejectedProposalRecords: proposalRecords.filter((record) => record.reviewState === "rejected").length,
    };
  }

  markQuarantined(memoryId: string): MemoryGovernanceRecord | undefined { return this.updateReview(memoryId, { quarantined: true }); }
  markUserApproved(memoryId: string): MemoryGovernanceRecord | undefined { return this.updateReview(memoryId, { reviewState: "user_approved", quarantined: false }); }
  markRejected(memoryId: string): MemoryGovernanceRecord | undefined { return this.updateReview(memoryId, { reviewState: "rejected", retrievalPolicy: "never_retrieve" }); }
  deleteGovernanceRecord(memoryId: string): void { this.records = this.records.filter((record) => record.memoryId !== memoryId); this.persist(); }

  getDiagnosticsSummary(existingMemories: Array<Record<string, unknown>> = []): MemoryGovernanceDiagnosticsSummary {
    const records = this.listGovernanceSummaries(existingMemories);
    return { totalRecords: records.length, visibleRecords: records.filter((record) => record.userVisible).length, quarantinedRecords: records.filter((record) => record.quarantined).length, pendingReviewRecords: records.filter((record) => record.reviewState === "unreviewed").length, approvalRequiredWrites: records.filter((record) => record.writePolicy === "approval_required").length, rejectedRecords: records.filter((record) => record.reviewState === "rejected").length };
  }

  private updateReview(memoryId: string, update: Partial<MemoryGovernanceRecord> & { reviewState?: MemoryGovernanceReviewState }): MemoryGovernanceRecord | undefined {
    const existing = this.records.find((record) => record.memoryId === memoryId) ?? this.attachGovernanceRecord({ memoryId, source: "existing_memory", confidence: 0.5 });
    const record = { ...existing, ...update, memoryId: existing.memoryId, createdAt: existing.createdAt, updatedAt: nowIso() };
    this.records = this.records.map((item) => item.memoryId === memoryId ? record : item);
    this.persist();
    return record;
  }

  private compatibleSummaryFromExisting(memory: Record<string, unknown>): MemoryGovernanceRecord {
    const timestamp = nowIso();
    return { memoryId: String(memory.id ?? memory.memoryId ?? `existing:${timestamp}`), memoryType: "unknown", category: String(memory.category ?? "legacy"), source: String(memory.source ?? "existing_memory"), confidence: typeof memory.confidence === "number" ? memory.confidence : 0.5, userVisible: true, editable: true, deletable: true, quarantined: false, writePolicy: "local_only", retrievalPolicy: "normal", reviewState: "unreviewed", createdAt: timestamp, updatedAt: timestamp };
  }

  private persist(): void { if (this.records.length > MAX_RECORDS) this.records = this.records.slice(0, MAX_RECORDS); this.backingStorage?.setItem(STORAGE_KEY, JSON.stringify(this.records)); }
}

export const memoryGovernanceService = new MemoryGovernanceService();

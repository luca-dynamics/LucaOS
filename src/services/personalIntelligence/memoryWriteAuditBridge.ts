/**
 * Memory write audit unification (read path).
 *
 * Joins the write-adjacent systems into one review list for diagnostics:
 * 1) MemoryProposalService proposals with status "written"
 * 2) Personal Intelligence memory-approval pilot durable audit records
 * 3) GovernedMemoryWriteService write records (Activity / Memory Control path)
 *
 * Does not write memory, does not re-run the pilot, and does not change store
 * ownership. Composition edge only.
 */

import type {
  MemoryProposalRecord,
  MemoryWriteRecord,
} from "../../types/memoryProposal";
import type {
  MemoryApprovalAuditSummary,
  PersonalIntelligenceMemoryApprovalAuditRecord,
} from "../../personal-intelligence/approval";

export type UnifiedMemoryWriteEventKind =
  | "proposal_written"
  | "pilot_live_write"
  | "pilot_blocked"
  | "pilot_failed"
  | "pilot_dry_run"
  | "governed_write_succeeded"
  | "governed_write_blocked"
  | "governed_write_failed";

export interface UnifiedMemoryWriteEvent {
  id: string;
  kind: UnifiedMemoryWriteEventKind;
  title: string;
  summary: string;
  proposalId?: string;
  memoryId?: string;
  at: string;
  sideEffectsPerformed: boolean;
  source:
    | "memory-proposal-service"
    | "pi-memory-approval-audit"
    | "governed-memory-write-service";
}

export function mapWrittenProposalToUnifiedEvent(
  proposal: MemoryProposalRecord,
): UnifiedMemoryWriteEvent | null {
  if (proposal.status !== "written") return null;
  return {
    id: `proposal-written:${proposal.proposalId}`,
    kind: "proposal_written",
    title: proposal.title,
    summary: proposal.summary || "Proposal marked written after governed save.",
    proposalId: proposal.proposalId,
    memoryId: proposal.memoryId,
    at: proposal.writtenAt ?? proposal.updatedAt,
    sideEffectsPerformed: true,
    source: "memory-proposal-service",
  };
}

export function mapPilotAuditToUnifiedEvent(
  record: PersonalIntelligenceMemoryApprovalAuditRecord,
): UnifiedMemoryWriteEvent {
  const kind: UnifiedMemoryWriteEventKind =
    record.eventType === "live_write_completed"
      ? "pilot_live_write"
      : record.eventType === "live_write_failed"
        ? "pilot_failed"
        : record.eventType === "live_write_blocked"
          ? "pilot_blocked"
          : "pilot_dry_run";
  return {
    id: `pilot-audit:${record.auditId}`,
    kind,
    title: `Pilot ${record.eventType.replace(/_/g, " ")}`,
    summary: record.summary,
    proposalId: record.proposalId,
    at: record.timestamp,
    sideEffectsPerformed: record.sideEffectsPerformed === true,
    source: "pi-memory-approval-audit",
  };
}

export function mapGovernedWriteToUnifiedEvent(
  write: MemoryWriteRecord,
): UnifiedMemoryWriteEvent {
  const kind: UnifiedMemoryWriteEventKind =
    write.status === "succeeded"
      ? "governed_write_succeeded"
      : write.status === "blocked"
        ? "governed_write_blocked"
        : "governed_write_failed";
  return {
    id: `governed-write:${write.writeId}`,
    kind,
    title: `Governed write ${write.status}`,
    summary: write.summary,
    proposalId: write.proposalId,
    memoryId: write.memoryId,
    at: write.createdAt,
    sideEffectsPerformed: write.status === "succeeded",
    source: "governed-memory-write-service",
  };
}

/**
 * Merge written proposals + pilot audit + governed writes (newest first).
 */
export function buildUnifiedMemoryWriteTimeline(input: {
  proposals: readonly MemoryProposalRecord[];
  pilotAuditRecords?: readonly PersonalIntelligenceMemoryApprovalAuditRecord[];
  pilotAuditSummary?: MemoryApprovalAuditSummary;
  governedWrites?: readonly MemoryWriteRecord[];
}): UnifiedMemoryWriteEvent[] {
  const fromProposals = input.proposals
    .map(mapWrittenProposalToUnifiedEvent)
    .filter((item): item is UnifiedMemoryWriteEvent => item !== null);

  const fromPilot = (input.pilotAuditRecords ?? []).map(
    mapPilotAuditToUnifiedEvent,
  );
  const fromGoverned = (input.governedWrites ?? []).map(
    mapGovernedWriteToUnifiedEvent,
  );

  return [...fromProposals, ...fromPilot, ...fromGoverned].sort((a, b) =>
    a.at < b.at ? 1 : a.at > b.at ? -1 : 0,
  );
}

export function summarizeUnifiedMemoryWriteTimeline(
  events: readonly UnifiedMemoryWriteEvent[],
): {
  total: number;
  sideEffectingWrites: number;
  pilotLiveWrites: number;
  proposalWritten: number;
  governedSucceeded: number;
  blockedOrFailed: number;
} {
  return {
    total: events.length,
    sideEffectingWrites: events.filter((e) => e.sideEffectsPerformed).length,
    pilotLiveWrites: events.filter((e) => e.kind === "pilot_live_write").length,
    proposalWritten: events.filter((e) => e.kind === "proposal_written").length,
    governedSucceeded: events.filter(
      (e) => e.kind === "governed_write_succeeded",
    ).length,
    blockedOrFailed: events.filter(
      (e) =>
        e.kind === "pilot_blocked" ||
        e.kind === "pilot_failed" ||
        e.kind === "governed_write_blocked" ||
        e.kind === "governed_write_failed",
    ).length,
  };
}

/**
 * Build the live timeline from injectable loaders (composition edge).
 * Callers wire real services; pure tests inject stubs.
 */
export function readLiveUnifiedMemoryWriteTimeline(deps: {
  listProposals: () => readonly MemoryProposalRecord[];
  listPilotAuditRecords: () => readonly PersonalIntelligenceMemoryApprovalAuditRecord[];
  listGovernedWrites: () => readonly MemoryWriteRecord[];
}): {
  events: UnifiedMemoryWriteEvent[];
  summary: ReturnType<typeof summarizeUnifiedMemoryWriteTimeline>;
} {
  let proposals: readonly MemoryProposalRecord[] = [];
  let pilotAuditRecords: readonly PersonalIntelligenceMemoryApprovalAuditRecord[] =
    [];
  let governedWrites: readonly MemoryWriteRecord[] = [];
  try {
    proposals = deps.listProposals();
  } catch {
    /* optional */
  }
  try {
    pilotAuditRecords = deps.listPilotAuditRecords();
  } catch {
    /* optional */
  }
  try {
    governedWrites = deps.listGovernedWrites();
  } catch {
    /* optional */
  }
  const events = buildUnifiedMemoryWriteTimeline({
    proposals,
    pilotAuditRecords,
    governedWrites,
  });
  return { events, summary: summarizeUnifiedMemoryWriteTimeline(events) };
}

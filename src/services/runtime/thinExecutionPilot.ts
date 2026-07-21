/**
 * Thin execution pilot — the ONLY intentionally narrow live side-effect path
 * promoted as a product pilot: one-shot governed memory write for an already
 * approved proposal.
 *
 * Dry-run / permission / approval stages remain elsewhere. This module only
 * runs after those gates have already moved a proposal to approved_waiting_write
 * (Activity / Memory Control) or after the PI pilot has persisted and closed
 * the loop. It does not run skills, tools, shell, browser, or LucaLink.
 */

import { governedMemoryWriteService } from "../memory/GovernedMemoryWriteService";
import { memoryProposalService } from "../memory/MemoryProposalService";
import type { MemoryWriteRecord } from "../../types/memoryProposal";
import {
  readLiveUnifiedMemoryWriteTimeline,
  type UnifiedMemoryWriteEvent,
} from "../personalIntelligence/memoryWriteAuditBridge";
import { readMemoryApprovalAuditRecords } from "../personalIntelligence/memoryApprovalAuditStore";

export type ThinExecutionPilotKind = "governed_memory_write_once";

export interface ThinExecutionPilotStatus {
  kind: ThinExecutionPilotKind;
  label: string;
  enabled: true;
  canExecute: boolean;
  dryRunRequired: true;
  executionScope: "memory_write_once";
  blockedActions: string[];
  recentEvents: UnifiedMemoryWriteEvent[];
  summary: {
    total: number;
    sideEffectingWrites: number;
    pilotLiveWrites: number;
    proposalWritten: number;
    governedSucceeded: number;
    blockedOrFailed: number;
  };
  sideEffectsPerformed: false;
}

export interface ThinExecutionPilotResult {
  kind: ThinExecutionPilotKind;
  attempted: true;
  performed: boolean;
  write?: MemoryWriteRecord;
  blockers: string[];
  summary: string;
}

/**
 * Read-only status for Settings / OC. Always reports that broader execution
 * remains blocked.
 */
export function getThinExecutionPilotStatus(
  limit = 8,
): ThinExecutionPilotStatus {
  const { events, summary } = readLiveUnifiedMemoryWriteTimeline({
    listProposals: () => memoryProposalService.listProposals(),
    listPilotAuditRecords: () => readMemoryApprovalAuditRecords(),
    listGovernedWrites: () => governedMemoryWriteService.listMemoryWrites(),
  });
  return {
    kind: "governed_memory_write_once",
    label: "Governed memory write (once)",
    enabled: true,
    canExecute: true,
    dryRunRequired: true,
    executionScope: "memory_write_once",
    blockedActions: [
      "skill execution",
      "tool invocation",
      "shell",
      "browser automation",
      "LucaLink remote action",
      "mission auto-run",
    ],
    recentEvents: events.slice(0, limit),
    summary,
    sideEffectsPerformed: false,
  };
}

/**
 * Run the thin pilot: write one approved memory proposal through the existing
 * governed write service. No new write path — reuses production gates.
 */
export async function runThinExecutionPilot(
  kind: ThinExecutionPilotKind,
  proposalId: string,
): Promise<ThinExecutionPilotResult> {
  if (kind !== "governed_memory_write_once") {
    return {
      kind,
      attempted: true,
      performed: false,
      blockers: ["Unsupported thin execution pilot kind."],
      summary: "Only governed_memory_write_once is enabled.",
    };
  }

  const can = governedMemoryWriteService.canWriteProposal(proposalId);
  if (!can.allowed) {
    return {
      kind,
      attempted: true,
      performed: false,
      blockers: can.blockedBy.length ? can.blockedBy : [can.reason],
      summary: can.reason,
    };
  }

  const write = await governedMemoryWriteService.writeApprovedProposal(
    proposalId,
  );
  return {
    kind,
    attempted: true,
    performed: write.status === "succeeded",
    write,
    blockers: write.blockedBy ?? [],
    summary: write.summary,
  };
}

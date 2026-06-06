import type {
  GovernedMemoryAdapterAuditRecord,
  GovernedMemoryAdapterStatus,
} from "./governedMemoryAdapterTypes";

interface CreateGovernedMemoryAdapterAuditRecordInput {
  proposalId: string;
  sourceLabel: string;
  status: GovernedMemoryAdapterStatus;
  summary: string;
  blockers: readonly string[];
  warnings: readonly string[];
  sideEffectsPerformed: boolean;
  memoryNodeId?: string;
  now?: () => Date;
}

export function createGovernedMemoryAdapterAuditRecord(
  input: CreateGovernedMemoryAdapterAuditRecordInput,
): GovernedMemoryAdapterAuditRecord {
  const timestamp = (input.now ?? (() => new Date()))().toISOString();
  return {
    auditId: `memory-adapter:${input.proposalId}:${timestamp}`,
    proposalId: input.proposalId,
    timestamp,
    sourceLabel: input.sourceLabel,
    status: input.status,
    summary: input.summary,
    blockers: [...input.blockers],
    warnings: [...input.warnings],
    sideEffectsPerformed: input.sideEffectsPerformed,
    memoryNodeId: input.memoryNodeId,
  };
}

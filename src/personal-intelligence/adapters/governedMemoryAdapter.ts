import { createGovernedMemoryAdapterAuditRecord } from "./governedMemoryAdapterAudit";
import { canPersistPersonalIntelligenceProposal } from "./governedMemoryAdapterPolicy";
import type {
  GovernedMemoryAdapterResult,
  GovernedMemoryAdapterStatus,
  PersistApprovedMemoryProposalInput,
} from "./governedMemoryAdapterTypes";

export async function persistApprovedMemoryProposalWithGovernance({
  proposal,
  config,
  policy,
  auditRecords,
  rollbackPlans,
  memoryService,
  now,
}: PersistApprovedMemoryProposalInput): Promise<GovernedMemoryAdapterResult> {
  const gate = canPersistPersonalIntelligenceProposal(proposal, {
    config,
    policy,
    auditRecords,
    rollbackPlans,
  });
  const convertedMemory = gate.convertedMemory;

  if (!gate.allowed || !convertedMemory) {
    return createResult({
      proposalId: proposal.proposalId,
      config,
      status: "blocked",
      blockers: gate.blockers,
      warnings: gate.warnings,
      summary: "Governed memory adapter blocked the persistence attempt.",
      now,
    });
  }

  if (config.dryRun) {
    return createResult({
      proposalId: proposal.proposalId,
      config,
      status: "dry_run",
      blockers: [],
      warnings: gate.warnings,
      summary:
        "Governed memory adapter completed conversion without side effects.",
      convertedMemory,
      now,
    });
  }

  try {
    // This is the adapter's sole legacy write boundary. All governance gates run above.
    const memoryNode = await memoryService.saveMemory(
      convertedMemory.key,
      convertedMemory.value,
      convertedMemory.category,
      false,
      convertedMemory.importance,
    );
    if (!memoryNode) {
      return createResult({
        proposalId: proposal.proposalId,
        config,
        status: "failed",
        blockers: [
          "Legacy memoryService did not return a persisted memory node.",
        ],
        warnings: gate.warnings,
        summary: "Legacy memoryService did not confirm persistence.",
        convertedMemory,
        now,
      });
    }

    return createResult({
      proposalId: proposal.proposalId,
      config,
      status: "persisted",
      blockers: [],
      warnings: gate.warnings,
      summary:
        "Approved Personal Intelligence memory was persisted through memoryService.",
      convertedMemory,
      memoryNodeId: memoryNode.id,
      sideEffectsPerformed: true,
      now,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown memoryService error";
    return createResult({
      proposalId: proposal.proposalId,
      config,
      status: "failed",
      blockers: [`memoryService.saveMemory failed: ${message}`],
      warnings: gate.warnings,
      summary: "Legacy memoryService failed during governed persistence.",
      convertedMemory,
      now,
    });
  }
}

interface CreateResultInput {
  proposalId: string;
  config: PersistApprovedMemoryProposalInput["config"];
  status: GovernedMemoryAdapterStatus;
  blockers: string[];
  warnings: string[];
  summary: string;
  convertedMemory?: NonNullable<
    ReturnType<typeof canPersistPersonalIntelligenceProposal>["convertedMemory"]
  >;
  memoryNodeId?: string;
  sideEffectsPerformed?: boolean;
  now?: () => Date;
}

function createResult(input: CreateResultInput): GovernedMemoryAdapterResult {
  const sideEffectsPerformed = input.sideEffectsPerformed === true;
  const performed = input.status === "persisted" && sideEffectsPerformed;
  const auditRecord = createGovernedMemoryAdapterAuditRecord({
    proposalId: input.proposalId,
    sourceLabel: input.config.sourceLabel,
    status: input.status,
    summary: input.summary,
    blockers: input.blockers,
    warnings: input.warnings,
    sideEffectsPerformed,
    memoryNodeId: input.memoryNodeId,
    now: input.now,
  });

  return {
    attempted: true,
    performed,
    dryRun: input.status === "dry_run",
    status: input.status,
    proposalId: input.proposalId,
    memoryKey: input.convertedMemory?.key,
    memoryValue: input.convertedMemory?.value,
    memoryCategory: input.convertedMemory?.category,
    memoryNodeId: input.memoryNodeId,
    blockers: [...input.blockers],
    warnings: [...input.warnings],
    auditRecord,
    sideEffectsPerformed,
  };
}

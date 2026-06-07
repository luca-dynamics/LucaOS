import {
  DEFAULT_GOVERNED_MEMORY_ADAPTER_CONFIG,
  persistApprovedMemoryProposalWithGovernance,
} from "../adapters";
import type {
  GovernedMemoryAdapterConfig,
  GovernedMemoryAdapterResult,
} from "../adapters";
import type {
  GovernedMemoryApprovalDryRunInput,
  GovernedMemoryApprovalLiveWriteInput,
} from "./approvalTypes";
import { DEFAULT_MEMORY_APPROVAL_CONFIRMATION_PHRASE } from "./memoryApprovalState";

export async function runGovernedMemoryApprovalDryRun(
  input: GovernedMemoryApprovalDryRunInput,
): Promise<GovernedMemoryAdapterResult> {
  return persistApprovedMemoryProposalWithGovernance({
    proposal: input.proposal,
    policy: input.policy,
    auditRecords: input.auditRecords,
    rollbackPlans: input.rollbackPlans,
    memoryService: input.memoryService,
    config: createApprovalAdapterConfig(input.configOverrides, true),
    now: input.now,
  });
}

export async function runGovernedMemoryApprovalLiveWrite(
  input: GovernedMemoryApprovalLiveWriteInput,
): Promise<GovernedMemoryAdapterResult> {
  const blockers = listPilotLevelBlockers(input);
  if (blockers.length > 0) {
    return createBlockedPilotResult(input, blockers);
  }

  return persistApprovedMemoryProposalWithGovernance({
    proposal: input.proposal,
    policy: input.policy,
    auditRecords: input.auditRecords,
    rollbackPlans: input.rollbackPlans,
    memoryService: input.memoryService,
    config: createApprovalAdapterConfig(input.configOverrides, false),
    now: input.now,
  });
}

function createApprovalAdapterConfig(
  overrides: Partial<GovernedMemoryAdapterConfig> | undefined,
  dryRun: boolean,
): GovernedMemoryAdapterConfig {
  return {
    ...DEFAULT_GOVERNED_MEMORY_ADAPTER_CONFIG,
    ...overrides,
    enabled: true,
    dryRun,
    allowLucaLinkSync: false,
    allowSensitiveWrites: false,
  };
}

function listPilotLevelBlockers(
  input: GovernedMemoryApprovalLiveWriteInput,
): string[] {
  const blockers: string[] = [];
  const state = input.pilotState;
  const dryRun = input.lastDryRunResult ?? state.lastDryRunResult;
  const expectedPhrase =
    input.requiredConfirmationPhrase ??
    DEFAULT_MEMORY_APPROVAL_CONFIRMATION_PHRASE;
  const approval = input.proposal.approvalMetadata;

  if (!state.pilotEnabled) blockers.push("Controlled live-write pilot is disabled.");
  if (!state.liveWriteEnabled) blockers.push("Live-write toggle is disabled.");
  if (!state.approvalConfirmed) {
    blockers.push("Explicit user approval has not been confirmed in the pilot UI.");
  }
  if (state.confirmationPhrase?.trim() !== expectedPhrase) {
    blockers.push("The required confirmation phrase was not accepted.");
  }
  if (
    state.dryRunFirstRequired &&
    (!dryRun ||
      dryRun.status !== "dry_run" ||
      dryRun.sideEffectsPerformed !== false ||
      dryRun.performed !== false)
  ) {
    blockers.push("A successful side-effect-free dry-run is required.");
  }
  if (
    state.explicitUserApprovalRequired &&
    (!approval ||
      approval.approvedBy !== "user" ||
      approval.explicitUserApproval !== true ||
      Number.isNaN(Date.parse(approval.approvedAt)))
  ) {
    blockers.push("Valid explicit user approval metadata is required.");
  }

  return Array.from(new Set(blockers));
}

function createBlockedPilotResult(
  input: GovernedMemoryApprovalLiveWriteInput,
  blockers: string[],
): GovernedMemoryAdapterResult {
  const timestamp = (input.now ?? (() => new Date()))().toISOString();
  const sourceLabel =
    input.configOverrides?.sourceLabel ??
    DEFAULT_GOVERNED_MEMORY_ADAPTER_CONFIG.sourceLabel;
  return {
    attempted: true,
    performed: false,
    dryRun: false,
    status: "blocked",
    proposalId: input.proposal.proposalId,
    blockers: [...blockers],
    warnings: [],
    auditRecord: {
      auditId: `${sourceLabel}:${input.proposal.proposalId}:${timestamp}`,
      proposalId: input.proposal.proposalId,
      timestamp,
      sourceLabel,
      status: "blocked",
      summary: "Approval pilot blocked the live-write request before adapter execution.",
      blockers: [...blockers],
      warnings: [],
      sideEffectsPerformed: false,
    },
    sideEffectsPerformed: false,
  };
}

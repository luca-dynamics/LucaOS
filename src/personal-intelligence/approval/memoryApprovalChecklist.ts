import {
  DEFAULT_GOVERNED_MEMORY_ADAPTER_CONFIG,
  sanitizeMemoryContentForLegacyMemoryService,
} from "../adapters";
import { validateRollbackPlan } from "../persistence";
import type {
  MemoryApprovalChecklistInput,
  MemoryApprovalChecklistItem,
  MemoryApprovalPilotReadiness,
  MemoryApprovalPilotSummary,
  PersonalIntelligenceMemoryApprovalPilotState,
} from "./approvalTypes";
import { DEFAULT_MEMORY_APPROVAL_CONFIRMATION_PHRASE } from "./memoryApprovalState";

export function createMemoryApprovalChecklist(
  input: MemoryApprovalChecklistInput,
): MemoryApprovalChecklistItem[] {
  const proposal = input.proposal;
  const policy = input.policy;
  const auditRecords = input.auditRecords ?? [];
  const rollbackPlans = input.rollbackPlans ?? [];
  const config =
    input.adapterConfig ?? DEFAULT_GOVERNED_MEMORY_ADAPTER_CONFIG;
  const dryRun = input.lastDryRunResult ?? input.pilotState.lastDryRunResult;
  const expectedPhrase =
    input.requiredConfirmationPhrase ??
    DEFAULT_MEMORY_APPROVAL_CONFIRMATION_PHRASE;
  const approval = proposal?.approvalMetadata;
  const rollbackPlan = proposal
    ? rollbackPlans.find(
        (plan) =>
          plan.proposalId === proposal.proposalId &&
          plan.kind === "rollback" &&
          plan.status === "ready_for_future_adapter",
      )
    : undefined;
  const contentSafety = proposal
    ? sanitizeMemoryContentForLegacyMemoryService(
        proposal.memoryItem,
        config.maxContentLength,
      )
    : undefined;
  const sensitiveBlocked = proposal
    ? config.blockedPrivacyZones.includes(proposal.privacyZone) ||
      (proposal.privacyZone === "private" && !config.allowPrivateWrites) ||
      (["credential", "financial", "health", "enterprise"].includes(
        proposal.privacyZone,
      ) && !config.allowSensitiveWrites)
    : true;

  return [
    item(
      "proposal_exists",
      "Proposal exists",
      Boolean(proposal),
      proposal ? `Proposal ${proposal.proposalId} is selected.` : "No proposal is selected.",
    ),
    item(
      "proposal_approved",
      "Proposal is approved_for_future_adapter",
      proposal?.status === "approved_for_future_adapter",
      proposal
        ? `Current proposal status: ${proposal.status}.`
        : "A proposal must exist before status can be checked.",
    ),
    item(
      "approval_metadata",
      "Explicit user approval metadata exists",
      Boolean(
        approval?.approvedBy === "user" &&
          approval.explicitUserApproval === true &&
          !Number.isNaN(Date.parse(approval.approvedAt)),
      ),
      approval
        ? `Approved by the user at ${approval.approvedAt}.`
        : "Valid explicit user approval metadata is required.",
    ),
    item(
      "policy_clear",
      "Policy has no blockers",
      Boolean(policy?.allowedForProposalReview && policy.blockers.length === 0),
      policy
        ? policy.blockers.length === 0
          ? "Persistence policy permits governed review."
          : policy.blockers.join(" ")
        : "Policy evaluation is missing.",
    ),
    item(
      "validation_audit",
      "Validation audit exists",
      Boolean(
        proposal &&
          auditRecords.some(
            (record) =>
              record.proposalId === proposal.proposalId &&
              record.eventType === "validated" &&
              record.sideEffectsPerformed === false,
          ),
      ),
      "A matching side-effect-free validation audit is required.",
    ),
    item(
      "rollback_plan",
      "Rollback plan exists",
      Boolean(rollbackPlan && validateRollbackPlan(rollbackPlan).valid),
      rollbackPlan
        ? `Rollback plan ${rollbackPlan.planId} is ready.`
        : "A valid ready_for_future_adapter rollback plan is required.",
    ),
    item(
      "dry_run_config",
      "Adapter config enabled for dry-run",
      config.enabled && config.dryRun,
      `Adapter enabled: ${yesNo(config.enabled)}; dry-run: ${yesNo(config.dryRun)}.`,
    ),
    item(
      "dry_run_completed",
      "Dry-run completed",
      dryRun?.status === "dry_run" && dryRun.sideEffectsPerformed === false,
      dryRun
        ? `Last dry-run status: ${dryRun.status}; side effects: ${yesNo(dryRun.sideEffectsPerformed)}.`
        : "No successful dry-run result is available.",
      "pending",
    ),
    item(
      "live_write_enabled",
      "Live-write toggle enabled",
      input.pilotState.liveWriteEnabled,
      `Live-write toggle is ${input.pilotState.liveWriteEnabled ? "on" : "off"}.`,
      "pending",
    ),
    item(
      "confirmation_phrase",
      "Confirmation phrase accepted",
      input.pilotState.confirmationPhrase?.trim() === expectedPhrase,
      `Enter the exact phrase: ${expectedPhrase}.`,
      "pending",
    ),
    item(
      "content_safety",
      "Content safety passed",
      Boolean(contentSafety?.allowed),
      contentSafety
        ? contentSafety.allowed
          ? "Sanitized content passed forbidden-material checks."
          : contentSafety.blockers.join(" ")
        : "Content cannot be checked without a proposal.",
    ),
    item(
      "privacy_zone",
      "Sensitive privacy zone not blocked",
      Boolean(proposal) && !sensitiveBlocked,
      proposal
        ? sensitiveBlocked
          ? `Privacy zone ${proposal.privacyZone} is blocked by the active adapter configuration.`
          : `Privacy zone ${proposal.privacyZone} is permitted by the active adapter configuration.`
        : "Privacy zone cannot be checked without a proposal.",
    ),
    item(
      "lucalink_disabled",
      "LucaLink sync disabled",
      config.allowLucaLinkSync === false,
      "Raw Personal Intelligence memory synchronization remains disabled.",
    ),
  ];
}

export function evaluateMemoryApprovalPilotReadiness(
  input: MemoryApprovalChecklistInput,
): MemoryApprovalPilotReadiness {
  const checklist = createMemoryApprovalChecklist(input);
  const structuralIds = new Set([
    "proposal_exists",
    "proposal_approved",
    "approval_metadata",
    "policy_clear",
    "validation_audit",
    "rollback_plan",
    "dry_run_config",
    "content_safety",
    "privacy_zone",
    "lucalink_disabled",
  ]);
  const structuralFailures = checklist.filter(
    (entry) =>
      entry.required &&
      structuralIds.has(entry.id) &&
      entry.status !== "passed",
  );
  const liveFailures = checklist.filter(
    (entry) => entry.required && entry.status !== "passed",
  );
  const blockers = [
    ...(!input.pilotState.pilotEnabled
      ? ["Controlled live-write pilot is disabled."]
      : []),
    ...(!input.pilotState.approvalConfirmed
      ? ["Explicit user approval has not been confirmed in the pilot UI."]
      : []),
    ...liveFailures.map((entry) => entry.detail),
  ];

  return {
    readyForDryRun: structuralFailures.length === 0,
    readyForLiveWrite:
      input.pilotState.pilotEnabled &&
      input.pilotState.approvalConfirmed &&
      liveFailures.length === 0,
    checklist,
    blockers: unique(blockers),
    warnings: unique([
      ...(input.policy?.warnings ?? []),
      ...(input.lastDryRunResult?.warnings ?? []),
    ]),
  };
}

export function summarizeMemoryApprovalPilotState(
  state: PersonalIntelligenceMemoryApprovalPilotState,
): MemoryApprovalPilotSummary {
  const required = state.approvalChecklist.filter((item) => item.required);
  return {
    pilotStatus: state.pilotEnabled ? "enabled" : "disabled",
    liveWriteStatus: state.liveWriteEnabled ? "enabled" : "disabled",
    dryRunRequired: state.dryRunFirstRequired,
    explicitApprovalRequired: state.explicitUserApprovalRequired,
    passedRequiredChecks: required.filter((item) => item.status === "passed")
      .length,
    totalRequiredChecks: required.length,
    blockerCount: state.blockers.length,
    warningCount: state.warnings.length,
    readyForLiveWrite:
      state.pilotEnabled &&
      state.liveWriteEnabled &&
      state.approvalConfirmed &&
      state.blockers.length === 0 &&
      required.every((item) => item.status === "passed"),
    updatedAt: state.updatedAt,
  };
}

function item(
  id: string,
  label: string,
  passed: boolean,
  detail: string,
  incompleteStatus: "failed" | "pending" | "blocked" = "blocked",
): MemoryApprovalChecklistItem {
  return {
    id,
    label,
    status: passed ? "passed" : incompleteStatus,
    required: true,
    detail,
  };
}

function yesNo(value: boolean): string {
  return value ? "yes" : "no";
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

import type { LucaTaskAutonomyContract, LucaTaskPermissionEvaluation } from "../autonomy/taskAutonomyContract";
import { createTaskAutonomyContractDiagnostics } from "../autonomy/taskAutonomyContract";
import type { OperationCenterItem } from "./operationCenterTypes";

const FIXTURE_TIME = "2026-06-07T12:00:00.000Z";

export function createOperationCenterItemFromTaskAutonomyContract(
  contract: LucaTaskAutonomyContract,
  evaluations: readonly LucaTaskPermissionEvaluation[] = [],
): OperationCenterItem {
  const diagnostics = createTaskAutonomyContractDiagnostics(contract, evaluations);
  return {
    itemId: `operation:${contract.contractId}`,
    source: "provider_hub",
    category: "model_mesh",
    title: "Task autonomy contract",
    summary: `Mode ${diagnostics.mode}; allowed ${diagnostics.allowedCategories.length}; approval-required ${diagnostics.explicitApprovalCategories.length}; blocked ${diagnostics.blockedCategories.length}; web ${diagnostics.sourcePolicy.allowWebResearch ? "allowed" : "not allowed"}; social ${diagnostics.sourcePolicy.allowSocialResearch ? "allowed" : "not allowed"}; news ${diagnostics.sourcePolicy.allowNewsResearch ? "allowed" : "not allowed"}.`,
    status: diagnostics.blockedCategories.length > 0 ? "read_only" : "model_only",
    riskLevel: contract.mode === "strict_privacy" ? "medium" : "low",
    createdAt: FIXTURE_TIME,
    requiredApprovals: diagnostics.explicitApprovalCategories.map((category) => `approval:${category}`),
    blockedActions: diagnostics.blockedCategories.map((category) => `blocked:${category}`),
    warnings: [
      `Allowed categories: ${diagnostics.allowedCategories.join(", ") || "none"}`,
      `Soft-confirm categories: ${diagnostics.softConfirmCategories.join(", ") || "none"}`,
      `Source policy: official=${diagnostics.sourcePolicy.preferOfficialSources}; attribution=${diagnostics.sourcePolicy.requireSourceAttribution}; community=${diagnostics.sourcePolicy.allowUnverifiedCommunitySignals}`,
    ],
    blockers: [],
    auditSummary: "Read-only autonomy posture diagnostic; no tools, providers, browser, files, installs, runtimes, messages, posts, or transfers executed.",
    sideEffectsPerformed: false,
    authorityGranted: false,
    executionEnabled: false,
    canExecute: false,
    readyForExecution: false,
  };
}

/**
 * Absorb Phase 3 — permission-scoped invoke *simulation*.
 *
 * Never calls tools/MCP/shell. Records whether an invoke would be allowed
 * under current lifecycle + permission plan + dry-run gates.
 */

import type { SkillRegistryRecord } from "../../types/skillContinuity";
import type { LucaUserOperationTier } from "./SkillManifest";
import type { SkillMarketplaceDryRun } from "./SkillMarketplaceService";
import type { PersonalIntelligenceSkillSandboxPlan } from "../../personal-intelligence/skillSandbox/skillSandboxTypes";

export interface SkillInvokeSimulationInput {
  skillId: string;
  /** Declared intent / tool name the operator wants to simulate. */
  intendedTool?: string;
  tier?: LucaUserOperationTier;
  /** Optional args keys (never executed). */
  argKeys?: string[];
}

export interface SkillInvokeSimulationResult {
  skillId: string;
  intendedTool?: string;
  simulated: true;
  executed: false;
  wouldInvoke: boolean;
  blockedBy: string[];
  requiredPermissions: string[];
  missingPermissions: string[];
  dryRunSummary: string;
  sandboxStatus?: string;
  permissionPlanSummary?: string;
  reason: string;
  recordedAt: string;
}

/**
 * Simulate a permission-scoped invoke. Always returns executed: false.
 */
export function simulateSkillInvoke(input: {
  record: SkillRegistryRecord | null | undefined;
  dryRun: SkillMarketplaceDryRun | null;
  sandboxPlan?: PersonalIntelligenceSkillSandboxPlan | null;
  intendedTool?: string;
  argKeys?: string[];
}): SkillInvokeSimulationResult {
  const recordedAt = new Date().toISOString();
  const blockedBy: string[] = [];
  const record = input.record;

  if (!record) {
    return {
      skillId: "unknown",
      intendedTool: input.intendedTool,
      simulated: true,
      executed: false,
      wouldInvoke: false,
      blockedBy: ["missing_skill"],
      requiredPermissions: [],
      missingPermissions: [],
      dryRunSummary: "Skill not in catalog.",
      reason: "Cannot simulate invoke: skill not registered.",
      recordedAt,
    };
  }

  const requiredPermissions = [
    ...record.requiredPermissions,
    ...(input.sandboxPlan?.requiredPermissions
      .filter((p) => p.required)
      .map((p) => p.permissionId) ?? []),
  ];
  const uniqueRequired = Array.from(new Set(requiredPermissions));

  if (record.lifecycleState !== "enabled") {
    blockedBy.push(`lifecycle_${record.lifecycleState}`);
  }
  if (record.lifecycleState === "quarantined") {
    blockedBy.push("quarantined");
  }
  if (!input.dryRun?.useCheck.allowed) {
    blockedBy.push(...(input.dryRun?.useCheck.blockedBy ?? ["use_check_blocked"]));
  }
  if (input.dryRun && !input.dryRun.lifecycleGate.allowed) {
    blockedBy.push(
      `lifecycle_gate:${input.dryRun.lifecycleGate.reason || "blocked"}`,
    );
  }

  const blockedPerms =
    input.sandboxPlan?.requiredPermissions.filter((p) => p.blocked) ?? [];
  for (const p of blockedPerms) {
    blockedBy.push(`permission_blocked:${p.kind}`);
  }

  // Foundation: execution always blocked in this pilot — even if gates open.
  blockedBy.push("execution_disabled_pilot");

  const missingPermissions = uniqueRequired.filter((p) => {
    // We do not have a live permission grant store here; treat all required
    // as unsatisfied unless empty.
    return true;
  });

  if (uniqueRequired.length > 0) {
    blockedBy.push("permissions_unsatisfied");
  }

  const wouldInvoke = false; // pilot: never true
  const dryRunSummary =
    input.dryRun?.summary || "No dry-run context; invoke remains simulated only.";

  return {
    skillId: record.skillId,
    intendedTool: input.intendedTool,
    simulated: true,
    executed: false,
    wouldInvoke,
    blockedBy: Array.from(new Set(blockedBy)),
    requiredPermissions: uniqueRequired,
    missingPermissions: uniqueRequired.length ? uniqueRequired : [],
    dryRunSummary,
    sandboxStatus: input.sandboxPlan?.status,
    permissionPlanSummary: input.sandboxPlan?.permissionSummary,
    reason:
      "Invoke simulated only — tool/MCP/shell execution is disabled in Phase 3 marketplace pilot.",
    recordedAt,
  };
}

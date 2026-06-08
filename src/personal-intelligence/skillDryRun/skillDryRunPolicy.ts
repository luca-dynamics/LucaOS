import type { CreatePersonalIntelligenceSkillDryRunInput, PersonalIntelligenceSkillDryRunPolicyResult } from "./skillDryRunTypes";

const deniedIsBlocking = (risk: string) => risk === "high" || risk === "critical";

export function evaluatePersonalIntelligenceSkillDryRunPolicy(
  input: CreatePersonalIntelligenceSkillDryRunInput,
): PersonalIntelligenceSkillDryRunPolicyResult {
  const { skillRegistryEntry: skill, sandboxPlan: plan, permissionGates: gates, missionEvaluation, runtimeAuthority } = input;
  const warnings = [
    "Dry-run evidence is informational only and cannot authorize execution.",
    "Grant-for-review does not authorize execution.",
  ];
  const blockers: string[] = [];
  let status: PersonalIntelligenceSkillDryRunPolicyResult["status"] = "ready_for_review";

  if (skill.status === "disabled" || plan.status === "disabled") status = "disabled";
  if (skill.status === "blocked" || plan.status === "blocked") {
    status = "blocked";
    blockers.push("The skill registry entry or sandbox plan is blocked.");
  }
  if (skill.riskLevel === "critical" || plan.riskLevel === "critical") {
    status = "blocked";
    blockers.push("Critical-risk skills cannot pass controlled dry-run review.");
  }
  if (Object.values(runtimeAuthority ?? {}).some(Boolean)) {
    status = "blocked";
    blockers.push("Runtime authority was requested, but dry-run simulation accepts no runtime authority.");
  }

  const required = gates.filter((gate) => gate.required);
  const pending = required.filter((gate) => gate.status === "pending" || gate.status === "requires_primary_approval");
  const denied = required.filter((gate) => gate.status === "denied");
  const expired = required.filter((gate) => gate.status === "expired");
  const blocked = required.filter((gate) => gate.status === "blocked");
  if (blocked.length) {
    status = "blocked";
    blockers.push("One or more permission gates are blocked.");
  }
  if (denied.some((gate) => deniedIsBlocking(gate.riskLevel))) {
    status = "blocked";
    blockers.push("A high-severity required permission gate was denied.");
  } else if (status === "ready_for_review" && (pending.length || denied.length || expired.length)) {
    status = "approval_required";
  }

  if (missionEvaluation?.alignmentStatus === "blocked") {
    status = "blocked";
    blockers.push("Mission alignment policy blocked this proposal.");
  } else if (missionEvaluation && ["misaligned", "needs_review", "partially_aligned"].includes(missionEvaluation.alignmentStatus) && status === "ready_for_review") {
    status = missionEvaluation.riskLevel === "critical" ? "blocked" : "approval_required";
    warnings.push("Mission alignment requires human review.");
  }

  return {
    status,
    riskLevel: skill.riskLevel === "critical" || plan.riskLevel === "critical" ? "critical" : plan.riskLevel,
    warnings: [...new Set([...warnings, ...skill.warnings, ...plan.warnings, ...(missionEvaluation?.warnings ?? [])])],
    blockers: [...new Set([...blockers, ...skill.blockers, ...plan.blockers, ...(missionEvaluation?.blockers ?? [])])],
    sideEffectsPerformed: false,
    executionEnabled: false,
    canExecute: false,
    readyForExecution: false,
    dryRunOnly: true,
  };
}

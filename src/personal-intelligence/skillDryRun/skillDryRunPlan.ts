import type { PersonalIntelligenceSkillPermissionGate } from "../skillPermissions";
import type { PersonalIntelligenceSkillSandboxPlan } from "../skillSandbox";
import type { PersonalIntelligenceSkillDryRunStatus, PersonalIntelligenceSkillDryRunStep } from "./skillDryRunTypes";

export function createPersonalIntelligenceSkillDryRunSteps(
  plan: PersonalIntelligenceSkillSandboxPlan,
  gates: readonly PersonalIntelligenceSkillPermissionGate[],
  status: PersonalIntelligenceSkillDryRunStatus,
): PersonalIntelligenceSkillDryRunStep[] {
  const missing = gates.filter((gate) => gate.required && gate.status !== "granted_for_review").map((gate) => gate.label);
  const definition: Array<Omit<PersonalIntelligenceSkillDryRunStep, "stepId" | "order" | "sideEffectsPerformed">> = [
    { label: "Inspect manifest", description: "Inspect registry metadata as inert declarations.", stage: "inspect", status: "simulated", wouldRequire: [], wouldBlock: ["dynamic entrypoint import"] },
    { label: "Review sandbox plan", description: "Review sandbox constraints and prohibited surfaces.", stage: "prepare", status: plan.status === "blocked" ? "blocked" : "simulated", wouldRequire: [], wouldBlock: plan.blockedSurfaces },
    { label: "Check permission gates", description: "Classify review-only permission and approval gates.", stage: "permission_check", status: missing.length ? "requires_review" : "simulated", wouldRequire: missing, wouldBlock: ["permission escalation"] },
    { label: "Check mission alignment", description: "Review optional mission alignment evidence without runtime action.", stage: "mission_check", status: status === "approval_required" ? "requires_review" : status === "blocked" ? "blocked" : "simulated", wouldRequire: status === "approval_required" ? ["mission or safety review"] : [], wouldBlock: ["autonomous mission action"] },
    { label: "Prepare runtime trace", description: "Prepare an in-memory trace preview only.", stage: "trace_prepare", status: "simulated", wouldRequire: ["reviewable trace evidence"], wouldBlock: ["trace persistence"] },
    { label: "Prepare rollback expectations", description: "List future recovery preconditions without mutating state.", stage: "rollback_prepare", status: "simulated", wouldRequire: plan.requiredRollbackPlan.expectedRecoverySteps, wouldBlock: ["state mutation"] },
    { label: "Skip Act stage", description: "Execution, tools, models, memory, files, network, browser, shell, and handoffs remain blocked.", stage: "blocked_act", status: status === "blocked" ? "blocked" : "skipped", wouldRequire: [], wouldBlock: ["skill execution", "tool invocation", "model call", "memory write", "LucaLink handoff"] },
    { label: "Verify dry-run result", description: "Verify evidence and invariant runtime-authority flags.", stage: "verify", status: "simulated", wouldRequire: ["sideEffectsPerformed=false"], wouldBlock: ["runtime mutation"] },
    { label: "Prepare learning candidate", description: "Describe a candidate only; do not persist learning.", stage: "learn_candidate", status: "simulated", wouldRequire: ["future explicit review"], wouldBlock: ["learning persistence"] },
  ];
  return definition.map((step, index) => ({ ...step, stepId: `dry-run-step:${plan.planId}:${index + 1}`, order: index + 1, sideEffectsPerformed: false }));
}

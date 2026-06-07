import type { PersonalIntelligenceSkillPermissionGate, PersonalIntelligenceSkillPermissionGrantReadiness } from "./skillPermissionGrantTypes";

export function evaluateSkillPermissionGrantReadiness(gates: readonly PersonalIntelligenceSkillPermissionGate[]): PersonalIntelligenceSkillPermissionGrantReadiness {
  const count = (status: PersonalIntelligenceSkillPermissionGate["status"]) => gates.filter((gate) => gate.status === status).length;
  const pending = count("pending");
  const denied = count("denied");
  const expired = count("expired");
  const blocked = count("blocked");
  const requiresPrimaryApproval = count("requires_primary_approval");
  const blockers = [
    pending ? `${pending} permission gate(s) await review.` : "",
    denied ? `${denied} permission gate(s) are denied.` : "",
    expired ? `${expired} review grant(s) expired.` : "",
    blocked ? `${blocked} permission gate(s) are policy-blocked.` : "",
    requiresPrimaryApproval ? `${requiresPrimaryApproval} gate(s) require primary approval outside this review UI.` : "",
    "Skill execution is disabled by doctrine regardless of review state.",
  ].filter(Boolean);

  return {
    total: gates.length,
    pending,
    grantedForReview: count("granted_for_review"),
    denied,
    expired,
    blocked,
    requiresPrimaryApproval,
    reviewComplete: gates.length > 0 && pending === 0 && requiresPrimaryApproval === 0,
    readyForExecution: false,
    executionEnabled: false,
    canExecute: false,
    blockers,
    sideEffectsPerformed: false,
  };
}

import { createSkillPermissionGrantAuditEvent } from "./skillPermissionGrantAudit";
import { canApplySkillPermissionDecision, DEFAULT_PERMISSION_REVIEW_DURATION_MS } from "./skillPermissionGrantPolicy";
import type { PersonalIntelligenceSkillPermissionDecision, PersonalIntelligenceSkillPermissionGate, PersonalIntelligenceSkillPermissionGrantState, PersonalIntelligenceSkillPermissionGateStatus, SkillPermissionDecisionOptions } from "./skillPermissionGrantTypes";

export function applySkillPermissionDecision(
  state: PersonalIntelligenceSkillPermissionGrantState,
  gateId: string,
  decision: PersonalIntelligenceSkillPermissionDecision,
  options: SkillPermissionDecisionOptions = {},
): PersonalIntelligenceSkillPermissionGrantState {
  const gate = state.gates.find((item) => item.gateId === gateId);
  if (!gate || !canApplySkillPermissionDecision(gate, decision)) return state;

  const now = (options.now ?? (() => new Date()))();
  const reviewedAt = now.toISOString();
  const nextStatus: PersonalIntelligenceSkillPermissionGateStatus = decision === "grant_for_review" ? "granted_for_review" : decision === "deny" ? "denied" : "expired";
  const expiresAt = decision === "grant_for_review"
    ? new Date(now.getTime() + (options.reviewDurationMs ?? DEFAULT_PERMISSION_REVIEW_DURATION_MS)).toISOString()
    : undefined;
  const nextGate: PersonalIntelligenceSkillPermissionGate = {
    ...gate,
    status: nextStatus,
    reviewedAt,
    expiresAt,
    decisionReason: options.reason ?? (decision === "grant_for_review" ? "Ephemeral review access only; no execution authority." : `Review gate ${nextStatus}.`),
    executionEnabled: false as const,
    canExecute: false as const,
    sideEffectsPerformed: false as const,
  };

  return {
    gates: state.gates.map((item) => item.gateId === gateId ? nextGate : item),
    auditEvents: [createSkillPermissionGrantAuditEvent(gate, decision, nextStatus, reviewedAt), ...state.auditEvents],
    readyForExecution: false,
    executionEnabled: false,
    canExecute: false,
    sideEffectsPerformed: false,
  };
}

export function expireElapsedSkillPermissionGrants(
  state: PersonalIntelligenceSkillPermissionGrantState,
  options: Pick<SkillPermissionDecisionOptions, "now"> = {},
): PersonalIntelligenceSkillPermissionGrantState {
  const now = (options.now ?? (() => new Date()))();
  return state.gates.reduce((next, gate) => {
    if (gate.status !== "granted_for_review" || !gate.expiresAt || new Date(gate.expiresAt).getTime() > now.getTime()) return next;
    return applySkillPermissionDecision(next, gate.gateId, "expire", { now: () => now });
  }, state);
}

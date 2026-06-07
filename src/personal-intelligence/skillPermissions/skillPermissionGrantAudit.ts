import type { PersonalIntelligenceSkillPermissionDecision, PersonalIntelligenceSkillPermissionGate, PersonalIntelligenceSkillPermissionGrantAuditEvent } from "./skillPermissionGrantTypes";

export function createSkillPermissionGrantAuditEvent(
  gate: PersonalIntelligenceSkillPermissionGate,
  decision: PersonalIntelligenceSkillPermissionDecision,
  nextStatus: PersonalIntelligenceSkillPermissionGate["status"],
  occurredAt: string,
): PersonalIntelligenceSkillPermissionGrantAuditEvent {
  return {
    eventId: `permission-audit:${gate.gateId}:${occurredAt}`,
    gateId: gate.gateId,
    skillId: gate.skillId,
    decision,
    previousStatus: gate.status,
    nextStatus,
    occurredAt,
    summary: `${gate.label}: ${gate.status.replace(/_/g, " ")} → ${nextStatus.replace(/_/g, " ")}.`,
    persisted: false,
    executionEnabled: false,
    sideEffectsPerformed: false,
  };
}

import { personalIntelligenceSkillSandboxPlanFixtures } from "../skillSandbox";
import { applySkillPermissionDecision } from "./skillPermissionGrantDecision";
import { createSkillPermissionGrantState } from "./skillPermissionGrantState";

const initial = createSkillPermissionGrantState(personalIntelligenceSkillSandboxPlanFixtures);
const reviewable = initial.gates.filter((gate) => gate.status === "pending");

export const personalIntelligenceSkillPermissionGrantFixtures = reviewable.slice(0, 3).reduce((state, gate, index) => {
  if (index === 0) return applySkillPermissionDecision(state, gate.gateId, "grant_for_review", { now: () => new Date("2026-01-01T00:10:00.000Z"), reviewDurationMs: 30 * 60 * 1000 });
  if (index === 1) return applySkillPermissionDecision(state, gate.gateId, "deny", { now: () => new Date("2026-01-01T00:11:00.000Z") });
  const granted = applySkillPermissionDecision(state, gate.gateId, "grant_for_review", { now: () => new Date("2026-01-01T00:12:00.000Z") });
  return applySkillPermissionDecision(granted, gate.gateId, "expire", { now: () => new Date("2026-01-01T00:13:00.000Z") });
}, initial);

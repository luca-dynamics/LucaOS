import { describe, expect, it } from "vitest";
import { personalIntelligenceSkillSandboxPlanFixtures } from "../skillSandbox";
import { applySkillPermissionDecision } from "./skillPermissionGrantDecision";
import { createSkillPermissionGrantState } from "./skillPermissionGrantState";

const initial = createSkillPermissionGrantState(personalIntelligenceSkillSandboxPlanFixtures);

describe("skill permission review decisions", () => {
  it("grants only scoped, expiring review state", () => {
    const gate = initial.gates.find((item) => item.status === "pending")!;
    const next = applySkillPermissionDecision(initial, gate.gateId, "grant_for_review", {
      now: () => new Date("2026-01-01T00:00:00.000Z"),
      reviewDurationMs: 60_000,
    });
    const reviewed = next.gates.find((item) => item.gateId === gate.gateId)!;
    expect(reviewed.status).toBe("granted_for_review");
    expect(reviewed.expiresAt).toBe("2026-01-01T00:01:00.000Z");
    expect(reviewed.scope.executionAuthorized).toBe(false);
    expect(next.readyForExecution).toBe(false);
    expect(next.executionEnabled).toBe(false);
    expect(next.canExecute).toBe(false);
    expect(next.sideEffectsPerformed).toBe(false);
  });

  it("records deny and expire transitions in an in-memory audit", () => {
    const gate = initial.gates.find((item) => item.status === "pending")!;
    const denied = applySkillPermissionDecision(initial, gate.gateId, "deny", { now: () => new Date("2026-01-01T00:00:00.000Z") });
    expect(denied.gates.find((item) => item.gateId === gate.gateId)?.status).toBe("denied");
    expect(denied.auditEvents[0].persisted).toBe(false);

    const granted = applySkillPermissionDecision(initial, gate.gateId, "grant_for_review", { now: () => new Date("2026-01-01T00:00:00.000Z") });
    const expired = applySkillPermissionDecision(granted, gate.gateId, "expire", { now: () => new Date("2026-01-01T00:01:00.000Z") });
    expect(expired.gates.find((item) => item.gateId === gate.gateId)?.status).toBe("expired");
  });

  it("does not grant blocked or primary-host gates locally", () => {
    for (const status of ["blocked", "requires_primary_approval"] as const) {
      const gate = initial.gates.find((item) => item.status === status);
      if (!gate) continue;
      expect(applySkillPermissionDecision(initial, gate.gateId, "grant_for_review")).toBe(initial);
    }
  });
});

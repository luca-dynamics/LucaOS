import { describe, expect, it } from "vitest";
import { personalIntelligenceSkillSandboxPlanFixtures } from "../skillSandbox";
import { applySkillPermissionDecision, expireElapsedSkillPermissionGrants } from "./skillPermissionGrantDecision";
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

  it("records deny transitions in an in-memory audit", () => {
    const gate = initial.gates.find((item) => item.status === "pending")!;
    const denied = applySkillPermissionDecision(initial, gate.gateId, "deny", { now: () => new Date("2026-01-01T00:00:00.000Z") });
    expect(denied.gates.find((item) => item.gateId === gate.gateId)?.status).toBe("denied");
    expect(denied.auditEvents[0].persisted).toBe(false);
  });

  it("expires a granted-for-review gate without enabling execution", () => {
    const gate = initial.gates.find((item) => item.status === "pending")!;
    const granted = applySkillPermissionDecision(initial, gate.gateId, "grant_for_review", {
      now: () => new Date("2026-01-01T00:00:00.000Z"),
      reviewDurationMs: 60_000,
    });
    const expired = expireElapsedSkillPermissionGrants(granted, { now: () => new Date("2026-01-01T00:01:00.000Z") });
    expect(expired.gates.find((item) => item.gateId === gate.gateId)?.status).toBe("expired");
    expect(expired.readyForExecution).toBe(false);
    expect(expired.executionEnabled).toBe(false);
    expect(expired.canExecute).toBe(false);
    expect(expired.sideEffectsPerformed).toBe(false);
  });

  it("prevents local grant-for-review decisions for primary-approval gates", () => {
    const gate = initial.gates.find((item) => item.status === "requires_primary_approval");
    expect(gate).toBeDefined();
    const next = applySkillPermissionDecision(initial, gate!.gateId, "grant_for_review");
    expect(next).toBe(initial);
    expect(next.gates.find((item) => item.gateId === gate!.gateId)?.status).toBe("requires_primary_approval");
    expect(next.auditEvents).toHaveLength(0);
  });

  it("keeps blocked gates immutable for every local decision", () => {
    const gate = initial.gates.find((item) => item.status === "blocked");
    expect(gate).toBeDefined();
    for (const decision of ["grant_for_review", "deny", "expire"] as const) {
      expect(applySkillPermissionDecision(initial, gate!.gateId, decision)).toBe(initial);
    }
    expect(initial.gates.find((item) => item.gateId === gate!.gateId)?.status).toBe("blocked");
    expect(initial.auditEvents).toHaveLength(0);
  });
});

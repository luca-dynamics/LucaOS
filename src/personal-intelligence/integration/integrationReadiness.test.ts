import { describe, expect, it } from "vitest";
import {
  createIntegrationTarget,
  evaluateIntegrationReadiness,
  INTEGRATION_TARGET_IDS,
  READINESS_BLOCKERS,
  validateIntegrationTarget,
} from "./index";

function target(overrides: Partial<Parameters<typeof createIntegrationTarget>[0]> = {}) {
  return createIntegrationTarget({
    id: "onboarding",
    title: "Onboarding preview",
    description: "Maps onboarding state into a passive Identity Core preview.",
    runtimeRisk: "low",
    touchesRuntime: false,
    touchesPersistence: false,
    touchesNetwork: false,
    touchesExecution: false,
    privacyZones: ["private"],
    futurePrRecommendation: "PR #207",
    ...overrides,
  });
}

describe("integration readiness", () => {
  it("defines and validates every supported target without a live-wired status", () => {
    expect(INTEGRATION_TARGET_IDS).toHaveLength(12);
    const created = target();
    expect(validateIntegrationTarget(created)).toEqual({ valid: true, errors: [] });
    expect(created.currentStatus).toBe("not_started");
    expect(created.privacyZones).not.toBe((created as unknown as { privacyZones: string[] }).privacyZones.slice());
  });

  it.each([
    ["touchesExecution", READINESS_BLOCKERS.execution],
    ["touchesNetwork", READINESS_BLOCKERS.network],
    ["touchesPersistence", READINESS_BLOCKERS.persistence],
  ] as const)("blocks targets when %s is true", (flag, blocker) => {
    const evaluated = evaluateIntegrationReadiness(target({ [flag]: true }));
    expect(evaluated.currentStatus).toBe("blocked");
    expect(evaluated.blockers).toContain(blocker);
  });

  it("requires explicit approval policy work for sensitive privacy zones", () => {
    const evaluated = evaluateIntegrationReadiness(target({ privacyZones: ["credential", "financial", "health", "enterprise"] }));
    expect(evaluated.currentStatus).toBe("blocked");
    expect(evaluated.blockers).toContain(READINESS_BLOCKERS.sensitivePrivacy);
  });

  it("marks only non-runtime, none/low-risk boundaries ready for a future PR", () => {
    expect(evaluateIntegrationReadiness(target()).currentStatus).toBe("ready_for_future_pr");
    expect(evaluateIntegrationReadiness(target({ touchesRuntime: true })).currentStatus).toBe("boundary_defined");
  });
});

import { describe, expect, it } from "vitest";
import { personalIntelligenceRuntimeAuthorityFixtures } from "./runtimeAuthorityFixtures";
import { summarizePersonalIntelligenceRuntimeAuthority } from "./runtimeAuthorityReadiness";

describe("runtime authority readiness", () => {
  it("counts classifications and remains non-executable", () => {
    const summary = summarizePersonalIntelligenceRuntimeAuthority(personalIntelligenceRuntimeAuthorityFixtures);
    expect(summary.totalRecords).toBe(personalIntelligenceRuntimeAuthorityFixtures.length);
    expect(summary.permanentlyBlocked).toBeGreaterThan(0);
    expect(summary.futurePilotCandidates).toBeGreaterThan(0);
    expect(summary.authorityGranted).toBe(false);
    expect(summary.executionEnabled).toBe(false);
    expect(summary.sideEffectsPerformed).toBe(false);
  });
});

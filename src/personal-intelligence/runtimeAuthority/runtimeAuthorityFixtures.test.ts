import { describe, expect, it } from "vitest";
import { personalIntelligenceRuntimeAuthorityFixtures } from "./runtimeAuthorityFixtures";

describe("runtime authority fixtures", () => {
  it("include every authority class without runtime authority", () => {
    expect(personalIntelligenceRuntimeAuthorityFixtures.map((record) => record.authorityClass)).toEqual(expect.arrayContaining([
      "permanently_blocked", "review_only", "dry_run_only", "future_pilot_candidate", "unsupported",
    ]));
    expect(personalIntelligenceRuntimeAuthorityFixtures.every((record) =>
      !record.authorityGranted && !record.executionEnabled && !record.sideEffectsPerformed
    )).toBe(true);
  });
});

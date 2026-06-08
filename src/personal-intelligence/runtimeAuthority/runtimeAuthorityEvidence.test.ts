import { describe, expect, it } from "vitest";
import { personalIntelligenceRuntimeAuthorityFixtures } from "./runtimeAuthorityFixtures";
import { createPersonalIntelligenceRuntimeAuthorityEvidence } from "./runtimeAuthorityEvidence";

describe("runtime authority evidence", () => {
  it("copies evidence without granting authority", () => {
    const source = ["dry-run passed"];
    const evidence = createPersonalIntelligenceRuntimeAuthorityEvidence(personalIntelligenceRuntimeAuthorityFixtures[9], {
      dryRunEvidence: source,
      runtimeTracePresent: true,
      missionAlignment: "aligned",
    });
    source.push("mutated");
    expect(evidence.dryRunEvidence).toEqual(["dry-run passed"]);
    expect(evidence.authorityGranted).toBe(false);
    expect(evidence.readyForExecution).toBe(false);
  });
});

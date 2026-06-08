import { describe, expect, it } from "vitest";
import { createLucaLinkRuntimeAuthorityEvidence } from "./lucaLinkRuntimeAuthorityEvidence";
import { LUCA_LINK_RUNTIME_AUTHORITY_FIXTURES } from "./lucaLinkRuntimeAuthorityFixtures";

describe("LucaLink runtime authority evidence", () => {
  it("summarizes boundary evidence without granting authority", () => {
    const evidence = createLucaLinkRuntimeAuthorityEvidence(LUCA_LINK_RUNTIME_AUTHORITY_FIXTURES[12], {
      transportPermission: "Approval-required preview evidence exists.",
      redactionRequirements: ["Sanitized metadata only"],
      expiryRequirements: ["Short review expiry"],
    });
    expect(evidence.sourceModel).toContain("handoff");
    expect(evidence.futurePilotRequirements.join(" ")).toContain("cannot be sent or executed");
    expect(evidence.warnings).toContain("No evidence item grants authority.");
    expect(evidence.authorityGranted).toBe(false);
    expect(evidence.sideEffectsPerformed).toBe(false);
  });
});

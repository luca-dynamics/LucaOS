import { describe, expect, it } from "vitest";
import { LUCA_LINK_RUNTIME_AUTHORITY_FIXTURES } from "./lucaLinkRuntimeAuthorityFixtures";
import { createLucaLinkRuntimeAuthorityEvidence } from "./lucaLinkRuntimeAuthorityEvidence";

describe("LucaLink runtime authority evidence", () => {
  it("summarizes bounded evidence without granting authority", () => {
    const record = LUCA_LINK_RUNTIME_AUTHORITY_FIXTURES.find((item) => item.authorityClass === "future_bounded_handoff_candidate")!;
    const evidence = createLucaLinkRuntimeAuthorityEvidence(record, {
      transportPermission: "allowed_preview evidence only",
      dryRunHandoffEvidence: ["simulation completed without side effects"],
    });
    expect(evidence.hostScope).toEqual(["host:fixture-source", "host:fixture-target"]);
    expect(evidence.futurePilotRequirements.length).toBeGreaterThan(0);
    expect(evidence).toMatchObject({ authorityGranted: false, handoffEnabled: false, transportSendEnabled: false, sideEffectsPerformed: false });
  });
});

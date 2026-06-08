import { describe, expect, it } from "vitest";
import { LUCA_LINK_RUNTIME_AUTHORITY_FIXTURES } from "./lucaLinkRuntimeAuthorityFixtures";
import { summarizeLucaLinkRuntimeAuthority } from "./lucaLinkRuntimeAuthorityReadiness";

describe("LucaLink runtime authority readiness", () => {
  it("counts authority classes while preserving every runtime flag as false", () => {
    const summary = summarizeLucaLinkRuntimeAuthority(LUCA_LINK_RUNTIME_AUTHORITY_FIXTURES);
    expect(summary.permanentlyBlocked).toBeGreaterThan(0);
    expect(summary.reviewOnly).toBeGreaterThan(0);
    expect(summary.dryRunOnly).toBeGreaterThan(0);
    expect(summary.futureBoundedHandoffCandidates).toBe(1);
    expect(summary.unsupported).toBe(1);
    expect(summary).toMatchObject({
      authorityGranted: false, handoffEnabled: false, transportSendEnabled: false, adapterExecutionEnabled: false,
      displayOpenEnabled: false, sensorCollectionEnabled: false, fileWriteEnabled: false, installEnabled: false,
      sideEffectsPerformed: false,
    });
  });
});

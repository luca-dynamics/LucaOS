import { describe, expect, it } from "vitest";
import { LUCA_LINK_RUNTIME_AUTHORITY_FIXTURES } from "./lucaLinkRuntimeAuthorityFixtures";
import { summarizeLucaLinkRuntimeAuthority } from "./lucaLinkRuntimeAuthorityReadiness";

describe("LucaLink runtime authority readiness", () => {
  it("counts classes and keeps all runtime capabilities disabled", () => {
    const summary = summarizeLucaLinkRuntimeAuthority(LUCA_LINK_RUNTIME_AUTHORITY_FIXTURES);
    expect(summary.totalRecords).toBe(14);
    expect(summary.permanentlyBlocked).toBe(4);
    expect(summary.futureBoundedHandoffCandidates).toBe(1);
    expect(summary.unsupported).toBe(1);
    expect(summary).toMatchObject({
      authorityGranted: false, handoffEnabled: false, transportSendEnabled: false,
      adapterExecutionEnabled: false, displayOpenEnabled: false, sensorCollectionEnabled: false,
      fileWriteEnabled: false, installEnabled: false, sideEffectsPerformed: false,
    });
  });
});

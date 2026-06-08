import { describe, expect, it } from "vitest";
import { LUCA_LINK_DRY_RUN_HANDOFF_FIXTURES } from "./dryRunHandoffFixtures";
import { summarizeLucaLinkDryRunHandoffReadiness } from "./dryRunHandoffReadiness";

describe("LucaLink dry-run readiness", () => {
  it("counts review states while preserving disabled runtime authority", () => {
    expect(summarizeLucaLinkDryRunHandoffReadiness(LUCA_LINK_DRY_RUN_HANDOFF_FIXTURES)).toMatchObject({
      totalSimulations: 8, dryRunOnly: true, handoffEnabled: false, transportSendEnabled: false,
      adapterExecutionEnabled: false, displayOpenEnabled: false, sensorCollectionEnabled: false,
      fileWriteEnabled: false, installEnabled: false, sideEffectsPerformed: false,
    });
  });
});

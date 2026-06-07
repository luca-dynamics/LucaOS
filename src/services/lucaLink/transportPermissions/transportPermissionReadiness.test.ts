import { describe, expect, it } from "vitest";
import {
  LUCA_LINK_TRANSPORT_PERMISSION_FIXTURE_DECISIONS,
  LUCA_LINK_TRANSPORT_PERMISSION_FIXTURES,
} from "./transportPermissionFixtures";
import { summarizeLucaLinkTransportPermissionReadiness } from "./transportPermissionReadiness";

describe("transport permission readiness", () => {
  it("reports preview readiness without live mutation or send readiness", () => {
    expect(
      summarizeLucaLinkTransportPermissionReadiness(
        LUCA_LINK_TRANSPORT_PERMISSION_FIXTURES,
        LUCA_LINK_TRANSPORT_PERMISSION_FIXTURE_DECISIONS,
      ),
    ).toMatchObject({
      totalRequests: LUCA_LINK_TRANSPORT_PERMISSION_FIXTURES.length,
      liveTransportMutationEnabled: false,
      readyForPolicyPreview: true,
      readyForLiveSend: false,
      sideEffectsPerformed: false,
    });
  });
});

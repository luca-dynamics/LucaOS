import { describe, expect, it } from "vitest";
import {
  createLucaLinkTransportPermissionAuditRecord,
  summarizeLucaLinkTransportPermissionAudit,
} from "./transportPermissionAudit";
import {
  LUCA_LINK_LOCAL_HOST_STATUS_TRANSPORT_FIXTURE,
  LUCA_LINK_TRANSPORT_PERMISSION_FIXTURE_DECISIONS,
} from "./transportPermissionFixtures";

describe("transport permission audit", () => {
  it("creates and summarizes side-effect-free records", () => {
    const record = createLucaLinkTransportPermissionAuditRecord({
      request: LUCA_LINK_LOCAL_HOST_STATUS_TRANSPORT_FIXTURE,
      decision: LUCA_LINK_TRANSPORT_PERMISSION_FIXTURE_DECISIONS[0],
    });
    expect(record).toMatchObject({
      eventType: "allowed_preview",
      sideEffectsPerformed: false,
    });
    expect(summarizeLucaLinkTransportPermissionAudit([record])).toMatchObject({
      totalRecords: 1,
      sideEffectsPerformed: false,
    });
  });
});

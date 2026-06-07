import { describe, expect, it } from "vitest";
import { LUCA_LINK_COMPANION_PHONE_SENSOR_FIXTURE } from "./sensorBridgeFixtures";
import {
  createLucaLinkSensorBridgeAuditRecord,
  summarizeLucaLinkSensorBridgeAudit,
} from "./sensorBridgeAudit";

describe("LucaLink sensor bridge audit", () => {
  it("creates audit-only records with defensive policy summaries", () => {
    const record = createLucaLinkSensorBridgeAuditRecord(
      LUCA_LINK_COMPANION_PHONE_SENSOR_FIXTURE,
      {
        auditId: "audit-sensor-preview",
        timestamp: "2026-06-07T12:01:00.000Z",
        eventType: "preview_created",
      },
    );
    expect(record.snapshotId).toBe("sensor-fixture-companion-phone");
    expect(record.allowedSensorKinds).toContain("battery_status");
    expect(record.sideEffectsPerformed).toBe(false);
    expect(summarizeLucaLinkSensorBridgeAudit([record])).toContain(
      "audit-only with sideEffectsPerformed false",
    );
  });
});

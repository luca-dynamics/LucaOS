import { describe, expect, it } from "vitest";
import {
  LUCA_LINK_BLOCKED_SENSOR_FIXTURE,
  LUCA_LINK_COMPANION_PHONE_SENSOR_FIXTURE,
  LUCA_LINK_EXPIRED_SENSOR_FIXTURE,
} from "./sensorBridgeFixtures";
import {
  createCapabilityStatusSummary,
  createPermissionReadinessSummary,
  summarizeLucaLinkSensorBridgeReadiness,
} from "./sensorReadiness";

describe("LucaLink sensor bridge readiness", () => {
  it("reports preview readiness while live collection remains disabled", () => {
    const readiness = summarizeLucaLinkSensorBridgeReadiness([
      LUCA_LINK_COMPANION_PHONE_SENSOR_FIXTURE,
      LUCA_LINK_BLOCKED_SENSOR_FIXTURE,
      LUCA_LINK_EXPIRED_SENSOR_FIXTURE,
    ]);
    expect(readiness.totalSnapshots).toBe(3);
    expect(readiness.readySnapshots).toBe(1);
    expect(readiness.blockedSnapshots).toBe(1);
    expect(readiness.expiredSnapshots).toBe(1);
    expect(readiness.sensitiveRequestCount).toBe(3);
    expect(readiness.readyForReadOnlyBridge).toBe(true);
    expect(readiness.readyForLiveCollection).toBe(false);
    expect(readiness.sideEffectsPerformed).toBe(false);
  });

  it("summarizes capabilities and permission readiness", () => {
    expect(
      createCapabilityStatusSummary(LUCA_LINK_COMPANION_PHONE_SENSOR_FIXTURE),
    ).toContain("Read-only status summary available");
    expect(
      createPermissionReadinessSummary(
        LUCA_LINK_COMPANION_PHONE_SENSOR_FIXTURE,
      ),
    ).toContain("No sensitive permissions requested");
  });
});

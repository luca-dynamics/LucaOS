import { describe, expect, it } from "vitest";
import { createLucaLinkAdapterSandboxPlan } from "../adapters/adapterSandboxRuntime";
import { LUCA_LINK_SAFE_DISPLAY_ADAPTER_FIXTURE } from "../adapters/adapterSandboxFixtures";
import {
  createLucaLinkReadOnlySensorSnapshot,
  createSensorSnapshotFromAdapterPlan,
  expireLucaLinkReadOnlySensorSnapshot,
  summarizeLucaLinkReadOnlySensorSnapshot,
  validateLucaLinkReadOnlySensorSnapshot,
} from "./sensorSnapshot";

function adapterPlan(capabilities: string[], enabled = true) {
  return createLucaLinkAdapterSandboxPlan({
    manifest: {
      ...LUCA_LINK_SAFE_DISPLAY_ADAPTER_FIXTURE,
      targetHostTypes: ["sensor-host"],
      requestedCapabilities: capabilities,
      requestedPermissions: ["sensor.read", "host.approval"],
    } as never,
    config: { enabled },
    requestedByHostId: "primary-host",
    targetHostId: "companion-host",
  });
}

describe("LucaLink sensor snapshots", () => {
  it("creates defensive, side-effect-free copies", () => {
    const sensorKinds = ["battery_status"];
    const values = { batteryBand: "healthy" };
    const snapshot = createLucaLinkReadOnlySensorSnapshot({
      snapshotId: "copy-test",
      hostId: "host",
      capturedAt: "2026-06-07T00:00:00.000Z",
      expiresAt: "2099-01-01T00:00:00.000Z",
      sensorKinds,
      values,
    });
    sensorKinds.push("camera_frame");
    values.batteryBand = "changed";
    expect(snapshot.sensorKinds).toEqual(["battery_status"]);
    expect(snapshot.values.batteryBand).toBe("healthy");
    expect(snapshot.sideEffectsPerformed).toBe(false);
  });

  it("expires stale snapshots", () => {
    const snapshot = createLucaLinkReadOnlySensorSnapshot({
      snapshotId: "expired-test",
      hostId: "host",
      capturedAt: "2025-01-01T00:00:00.000Z",
      expiresAt: "2025-01-01T00:05:00.000Z",
      sensorKinds: ["host_health"],
    });
    const expired = expireLucaLinkReadOnlySensorSnapshot(
      snapshot,
      "2026-06-07T00:00:00.000Z",
    );
    expect(expired.status).toBe("expired");
    expect(validateLucaLinkReadOnlySensorSnapshot(expired).status).toBe(
      "expired",
    );
    expect(summarizeLucaLinkReadOnlySensorSnapshot(expired)).toContain(
      "live collection disabled",
    );
  });

  it("creates a model-only snapshot from a sensor.read adapter plan", () => {
    const snapshot = createSensorSnapshotFromAdapterPlan(
      adapterPlan(["sensor.read"]),
      {
        capturedAt: "2026-06-07T00:00:00.000Z",
        expiresAt: "2099-01-01T00:00:00.000Z",
        sensorKinds: ["battery_status", "capability_status"],
        values: { availability: "summary-ready" },
      },
    );
    expect(snapshot.status).toBe("ready");
    expect(snapshot.capabilitySummary).toContain("sensor.read");
    expect(snapshot.permissionSummary.join(" ")).toMatch(
      /does not grant live sensor access/i,
    );
    expect(snapshot.sideEffectsPerformed).toBe(false);
  });

  it("keeps blocked adapter plans and blocked sensor requests blocked", () => {
    const disabled = createSensorSnapshotFromAdapterPlan(
      adapterPlan(["device.status.read"], false),
      {
        capturedAt: "2026-06-07T00:00:00.000Z",
        expiresAt: "2099-01-01T00:00:00.000Z",
        sensorKinds: ["host_health"],
      },
    );
    const sensitive = createSensorSnapshotFromAdapterPlan(
      adapterPlan(["sensor.read"]),
      {
        capturedAt: "2026-06-07T00:00:00.000Z",
        expiresAt: "2099-01-01T00:00:00.000Z",
        sensorKinds: ["camera_frame"],
      },
    );
    expect(disabled.status).toBe("blocked");
    expect(sensitive.status).toBe("blocked");
  });
});

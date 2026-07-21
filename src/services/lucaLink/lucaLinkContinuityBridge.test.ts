import { describe, expect, it } from "vitest";
import type { LucaLinkTrustedDeviceRecord } from "./lucaLinkDeviceTrustRegistry";
import {
  buildLucaLinkContinuitySnapshot,
  mapConnectedDeviceToProvisionalTrustRecord,
  mapContinuityHostsToBodyDevices,
  mergeTrustedDevicesWithConnected,
} from "./lucaLinkContinuityBridge";

const fixedNow = 1_720_000_000_000;

function trusted(
  overrides: Partial<LucaLinkTrustedDeviceRecord> = {},
): LucaLinkTrustedDeviceRecord {
  return {
    deviceId: "trust-1",
    displayName: "Studio Desktop",
    deviceType: "desktop",
    role: "primary-host",
    trustLevel: "trusted",
    status: "connected",
    createdAt: fixedNow,
    updatedAt: fixedNow,
    lastSeenAt: fixedNow,
    capabilities: ["conversation"],
    deniedCapabilities: ["shell.execute"],
    permissionSummary: {
      conversation: true,
      notification: true,
      memory: false,
      tools: false,
      files: false,
      code: false,
      browser: false,
      shell: false,
      payment: false,
      physicalWorld: false,
      safety: true,
    },
    warnings: [],
    errors: [],
    ...overrides,
  };
}

describe("mapConnectedDeviceToProvisionalTrustRecord", () => {
  it("creates a limited paired record without elevating trust", () => {
    const record = mapConnectedDeviceToProvisionalTrustRecord(
      {
        deviceId: "mesh-phone",
        name: "Pixel",
        type: "mobile",
        lastSeen: fixedNow,
      },
      "host-1",
      fixedNow,
    );
    expect(record.trustLevel).toBe("paired");
    expect(record.status).toBe("connected");
    expect(record.role).toBe("companion");
    expect(record.permissionSummary.shell).toBe(false);
    expect(record.permissionSummary.tools).toBe(false);
    expect(record.warnings.join(" ")).toMatch(/provisional/i);
  });
});

describe("mergeTrustedDevicesWithConnected", () => {
  it("prefers trust store records and adds provisional mesh-only rows", () => {
    const { devices, provisionalCount } = mergeTrustedDevicesWithConnected(
      [trusted({ deviceId: "a", displayName: "Trusted A" })],
      [
        { deviceId: "a", name: "Mesh A", type: "desktop", lastSeen: fixedNow },
        { deviceId: "b", name: "Mesh B", type: "mobile", lastSeen: fixedNow },
      ],
      "a",
      fixedNow,
    );
    expect(provisionalCount).toBe(1);
    expect(devices).toHaveLength(2);
    expect(devices.find((d) => d.deviceId === "a")?.displayName).toBe(
      "Trusted A",
    );
    expect(devices.find((d) => d.deviceId === "b")?.trustLevel).toBe("paired");
  });
});

describe("buildLucaLinkContinuitySnapshot", () => {
  it("builds linked hosts and live continuity status from mesh + trust", () => {
    const snapshot = buildLucaLinkContinuitySnapshot({
      state: {
        connected: true,
        deviceId: "a",
        connectedDevices: [
          {
            deviceId: "a",
            name: "Host",
            type: "desktop",
            lastSeen: fixedNow,
          },
          {
            deviceId: "b",
            name: "Phone",
            type: "mobile",
            lastSeen: fixedNow,
          },
        ],
        error: null,
      },
      trustedDevices: [
        trusted({ deviceId: "a", displayName: "Host", role: "primary-host" }),
      ],
      continuationSummary: {
        total: 2,
        valid: 1,
        pending: 0,
        consumed: 1,
        expired: 0,
      },
      handoffSummary: {
        total: 1,
        pending: 1,
        approved: 0,
        sent: 0,
      },
      softEnforcementMode: "observe-only",
      now: fixedNow,
    });

    expect(snapshot.hasLiveIdentity).toBe(true);
    expect(snapshot.provisionalRecordCount).toBe(1);
    expect(snapshot.linkedHosts).toHaveLength(2);
    expect(snapshot.validContinuationCount).toBe(1);
    expect(snapshot.pendingHandoffCount).toBe(1);
    expect(snapshot.statusLabel).toMatch(/live continuity|mesh only/i);
    expect(snapshot.softEnforcementMode).toBe("observe-only");
  });

  it("reports no live mesh honestly when empty", () => {
    const snapshot = buildLucaLinkContinuitySnapshot({
      state: {
        connected: false,
        deviceId: null,
        connectedDevices: [],
        error: null,
      },
      trustedDevices: [],
      now: fixedNow,
    });
    expect(snapshot.hasLiveIdentity).toBe(false);
    expect(snapshot.statusLabel).toBe("No live mesh");
  });
});

describe("mapContinuityHostsToBodyDevices", () => {
  it("maps linked hosts into shell body rows with trust + connection", () => {
    const snapshot = buildLucaLinkContinuitySnapshot({
      state: {
        connected: true,
        deviceId: "a",
        connectedDevices: [
          {
            deviceId: "a",
            name: "Host",
            type: "desktop",
            lastSeen: fixedNow,
          },
        ],
        error: null,
      },
      trustedDevices: [
        trusted({ deviceId: "a", displayName: "Host", trustLevel: "trusted" }),
      ],
      now: fixedNow,
    });
    const rows = mapContinuityHostsToBodyDevices(snapshot.linkedHosts);
    expect(rows[0]).toMatchObject({
      id: "lucalink-a",
      name: "Host",
      status: "active",
    });
    expect(rows[0].type).toMatch(/limited|trusted/i);
  });
});

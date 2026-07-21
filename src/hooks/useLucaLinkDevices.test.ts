import { describe, expect, it } from "vitest";
import { mapLucaLinkDevicesToBody } from "./useLucaLinkDevices";
import type { Device } from "../services/lucaLink/types";
import { mapContinuityHostsToBodyDevices } from "../services/lucaLink/lucaLinkContinuityBridge";
import { createLucaLinkLinkedHostRecord } from "../services/lucaLink/lucaLinkLinkedHostRegistry";
import type { LucaLinkTrustedDeviceRecord } from "../services/lucaLink/lucaLinkDeviceTrustRegistry";

const device = (overrides: Partial<Device>): Device => ({
  id: "d1",
  name: "Pixel 7",
  type: "mobile",
  platform: "android",
  capabilities: [],
  status: "online",
  lastSeen: new Date("2026-07-03T00:00:00Z"),
  trustLevel: 80,
  metadata: {} as Device["metadata"],
  ...overrides,
});

describe("mapLucaLinkDevicesToBody", () => {
  it("maps a linked phone to the Body card shape, online reads as active", () => {
    const rows = mapLucaLinkDevicesToBody([device({})]);
    expect(rows).toEqual([
      {
        id: "lucalink-d1",
        name: "Pixel 7",
        type: "mobile · android",
        status: "active",
      },
    ]);
  });

  it("shows battery from sensor pulses in the type line", () => {
    const rows = mapLucaLinkDevicesToBody([
      device({ metadata: { battery: 82.4 } as Device["metadata"] }),
    ]);
    expect(rows[0].type).toBe("mobile · android · 82%");
  });

  it("passes offline/away through honestly and namespaces ids", () => {
    const rows = mapLucaLinkDevicesToBody([
      device({ id: "a", status: "offline" }),
      device({ id: "b", status: "away", type: "watch", platform: "wearos" }),
    ]);
    expect(rows[0]).toMatchObject({ id: "lucalink-a", status: "offline" });
    expect(rows[1]).toMatchObject({
      id: "lucalink-b",
      type: "watch · wearos",
      status: "away",
    });
  });
});

describe("continuity body mapping", () => {
  it("exposes trust-aware type lines for shell rows", () => {
    const record: LucaLinkTrustedDeviceRecord = {
      deviceId: "phone-1",
      displayName: "Pixel",
      deviceType: "mobile",
      role: "companion",
      trustLevel: "paired",
      status: "connected",
      createdAt: 1,
      updatedAt: 1,
      capabilities: [],
      deniedCapabilities: [],
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
    };
    const host = createLucaLinkLinkedHostRecord(record, "host-1");
    const rows = mapContinuityHostsToBodyDevices([host]);
    expect(rows[0].id).toBe("lucalink-phone-1");
    // Paired + connected maps to pending approval (honest limited continuity).
    expect(rows[0].status).toBe("pending");
    expect(rows[0].type).toMatch(/pending|limited|guest/i);
  });
});

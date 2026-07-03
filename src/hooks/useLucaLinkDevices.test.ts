import { describe, expect, it } from "vitest";
import { mapLucaLinkDevicesToBody } from "./useLucaLinkDevices";
import type { Device } from "../services/lucaLink/types";

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

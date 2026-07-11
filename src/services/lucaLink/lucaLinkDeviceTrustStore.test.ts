import { describe, expect, it } from "vitest";
import { LucaLinkDeviceTrustStore } from "./lucaLinkDeviceTrustStore";

const NOW = 1_700_000_000_000;

describe("LucaLinkDeviceTrustStore", () => {
  it("owns registry state and delegates public trust mutations", () => {
    const store = new LucaLinkDeviceTrustStore();
    store.upsert(
      { deviceId: "desktop", displayName: "Desktop", deviceType: "desktop" },
      { now: NOW },
    );

    expect(store.list()).toHaveLength(1);
    expect(store.get("desktop")?.displayName).toBe("Desktop");
    expect(store.setTrustLevel("desktop", "trusted", { now: NOW + 1 }).valid).toBe(true);
    expect(store.rename("desktop", "Studio desktop", { now: NOW + 2 }).device?.displayName).toBe("Studio desktop");
    expect(store.revoke("desktop", { now: NOW + 3 }).device?.status).toBe("revoked");
    expect(store.listActive()).toHaveLength(0);
    expect(store.summarize().revoked).toBe(1);
    expect(store.getAudit().length).toBeGreaterThanOrEqual(3);

    store.clearAudit();
    expect(store.getAudit()).toEqual([]);
  });

  it("syncs connected runtime devices and marks stale connected hosts disconnected", () => {
    const store = new LucaLinkDeviceTrustStore();
    store.syncConnectedRuntimeDevices(
      [
        { deviceId: "primary", name: "Primary", type: "desktop", lastSeen: NOW },
        { deviceId: "phone", name: "Phone", type: "mobile", lastSeen: NOW + 1 },
      ],
      "primary",
    );

    expect(store.get("primary")?.trustLevel).toBe("owner");
    expect(store.get("phone")?.status).toBe("connected");
    expect(store.summarize().connected).toBe(2);

    store.syncConnectedRuntimeDevices(
      [{ deviceId: "primary", name: "Primary", type: "desktop", lastSeen: NOW + 2 }],
      "primary",
    );

    expect(store.get("phone")?.status).toBe("disconnected");
    expect(store.get("primary")?.status).toBe("connected");
  });
});

import { describe, expect, it } from "vitest";
import { createTrustedDeviceRecord } from "./lucaLinkDeviceTrustRegistry";
import {
  createLucaLinkLinkedHostRecord,
  getLucaLinkConnectionStateMetadata,
  getLucaLinkDeviceCenterDisclosure,
  getLucaLinkDeviceTypeLabel,
  getLucaLinkTrustStateMetadata,
  isLucaLinkPermissionSensitive,
  summarizeLucaLinkPermissionProfile,
} from "./lucaLinkLinkedHostRegistry";

describe("LucaLink linked-host registry model", () => {
  it("normalizes linked hosts without granting remote authority", () => {
    const device = createTrustedDeviceRecord(
      {
        deviceId: "host-1",
        displayName: "Studio desktop",
        deviceType: "Electron desktop",
        role: "primary-host",
        trustLevel: "owner",
        status: "connected",
        capabilities: ["chat.send", "files.read", "tools.request"],
        isCurrentPrimaryHost: true,
      },
      { now: 100 },
    );

    const host = createLucaLinkLinkedHostRecord(device, "host-1");
    expect(host).toMatchObject({
      id: "host-1",
      deviceType: "desktop",
      connectionState: "online",
      trustState: "trusted_full",
      isCurrentDevice: true,
      createdAt: 100,
      updatedAt: 100,
    });
    expect(
      host.permissionProfile.permissions.find(
        (item) => item.id === "remote_action",
      )?.state,
    ).toBe("denied");
    expect(
      host.permissionProfile.permissions.find(
        (item) => item.id === "tool_execution",
      )?.state,
    ).toBe("pending");
  });

  it("marks paired, revoked, and blocked hosts with explicit metadata", () => {
    expect(
      createLucaLinkLinkedHostRecord(
        createTrustedDeviceRecord({
          deviceId: "pending",
          trustLevel: "paired",
          status: "connected",
        }),
      ).connectionState,
    ).toBe("pending_approval");
    expect(getLucaLinkConnectionStateMetadata("pending_approval").label).toBe(
      "Pending approval",
    );
    expect(getLucaLinkConnectionStateMetadata("blocked").tone).toBe("critical");
    expect(getLucaLinkTrustStateMetadata("revoked").label).toBe("Revoked");
  });

  it("provides calm device labels and sensitive permission classification", () => {
    expect(getLucaLinkDeviceTypeLabel("watch")).toBe("Watch");
    expect(isLucaLinkPermissionSensitive("read_presence")).toBe(false);
    expect(isLucaLinkPermissionSensitive("share_screen")).toBe(true);
    expect(isLucaLinkPermissionSensitive("admin_trust")).toBe(true);
  });

  it("groups permission states conservatively for inactive devices", () => {
    const device = createTrustedDeviceRecord({
      deviceId: "revoked",
      trustLevel: "admin",
      status: "revoked",
      capabilities: ["chat.send", "files.read", "tools.request"],
    });
    const summary = summarizeLucaLinkPermissionProfile(device);
    expect(summary.allowedCount).toBe(0);
    expect(summary.pendingCount).toBe(0);
    expect(summary.deniedCount).toBe(10);
    expect(summary.sensitiveAllowedCount).toBe(0);
  });

  it("defines Basic, Pro, and Creator disclosure without changing authority", () => {
    expect(getLucaLinkDeviceCenterDisclosure("basic")).toEqual({
      showPermissionDetails: false,
      showSessionStatus: false,
      showTrustDiagnostics: false,
    });
    expect(getLucaLinkDeviceCenterDisclosure("pro")).toMatchObject({
      showPermissionDetails: true,
      showSessionStatus: true,
      showTrustDiagnostics: false,
    });
    expect(
      getLucaLinkDeviceCenterDisclosure("creator").showTrustDiagnostics,
    ).toBe(true);
  });
});

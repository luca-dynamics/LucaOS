import { afterEach, describe, expect, it, vi } from "vitest";
import {
  lucaLinkHostRoles,
  lucaLinkPermissionCategories,
  type LucaLinkPermissionCategory,
} from "./lucaLinkArchitectureMap";
import type { LucaHostCapabilityKey, LucaHostRole } from "./lucaHostManifest";
import {
  CAPABILITY_PERMISSION_MAP,
  detectLocalHostHints,
  getDefaultPermissionsForRole,
  inferHostRoleFromPlatform,
  inferPlatformFromLucaLinkDeviceType,
  inferPlatformFromUserAgent,
  isHighRiskCapability,
  manifestFromLucaLinkDevice,
} from "./capabilityRegistry";

const PERMISSION_IDS = new Set<LucaLinkPermissionCategory>(
  lucaLinkPermissionCategories.map((p) => p.id),
);

describe("inferPlatformFromUserAgent", () => {
  it("classifies common user agents", () => {
    expect(
      inferPlatformFromUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      ),
    ).toBe("windows");
    expect(
      inferPlatformFromUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
      ),
    ).toBe("macos");
    expect(
      inferPlatformFromUserAgent(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      ),
    ).toBe("ios");
    expect(
      inferPlatformFromUserAgent("Mozilla/5.0 (Linux; Android 14; Pixel 8)"),
    ).toBe("android");
    expect(inferPlatformFromUserAgent("SomeUnknownBrowser/1.0 webkit")).toBe(
      "web",
    );
    expect(inferPlatformFromUserAgent("")).toBe("unknown");
    expect(inferPlatformFromUserAgent(undefined)).toBe("unknown");
  });
});

describe("inferHostRoleFromPlatform", () => {
  it("infers conservative roles per platform", () => {
    expect(inferHostRoleFromPlatform("windows")).toBe("execution");
    expect(
      inferHostRoleFromPlatform("windows", { isPrimaryHost: true }),
    ).toBe("primary");
    expect(inferHostRoleFromPlatform("macos", { isPrimaryHost: true })).toBe(
      "primary",
    );
    expect(inferHostRoleFromPlatform("ios")).toBe("companion");
    expect(inferHostRoleFromPlatform("android")).toBe("companion");
    expect(inferHostRoleFromPlatform("web")).toBe("guest");
    expect(inferHostRoleFromPlatform("unknown")).toBe("guest");
    expect(inferHostRoleFromPlatform("robotics")).toBe("embodied");
  });
});

describe("getDefaultPermissionsForRole", () => {
  const allRoles = lucaLinkHostRoles.map((r) => r.id) as LucaHostRole[];

  it("only ever returns permissions defined in the architecture vocabulary", () => {
    for (const role of allRoles) {
      for (const perm of getDefaultPermissionsForRole(role)) {
        expect(PERMISSION_IDS.has(perm)).toBe(true);
      }
    }
  });

  it("guest defaults are least-privilege (no memory write, no tools)", () => {
    const guest = getDefaultPermissionsForRole("guest");
    expect(guest).toContain("chat.send");
    for (const forbidden of [
      "memory.write",
      "shell.execute",
      "code.modify",
      "git.create_pr",
      "files.write",
      "browser.control",
    ] as const) {
      expect(guest).not.toContain(forbidden);
    }
  });

  it("companion has no shell/files.write/git.create_pr by default", () => {
    const companion = getDefaultPermissionsForRole("companion");
    for (const forbidden of [
      "shell.execute",
      "files.write",
      "git.create_pr",
      "code.modify",
    ] as const) {
      expect(companion).not.toContain(forbidden);
    }
  });

  it("primary holds memory authority but still lists dangerous permissions", () => {
    const primary = getDefaultPermissionsForRole("primary");
    expect(primary).toContain("memory.write");
    for (const dangerous of [
      "shell.execute",
      "code.modify",
      "git.create_pr",
      "files.write",
    ] as const) {
      expect(primary).toContain(dangerous);
    }
  });

  it("embodied does not grant robotics.motion by default", () => {
    expect(getDefaultPermissionsForRole("embodied")).not.toContain(
      "robotics.motion",
    );
  });
});

describe("isHighRiskCapability", () => {
  it("flags dangerous capabilities", () => {
    for (const cap of [
      "shellAccess",
      "fileAccess",
      "browserControl",
      "codeExecution",
      "roboticsControl",
    ] as LucaHostCapabilityKey[]) {
      expect(isHighRiskCapability(cap)).toBe(true);
    }
  });

  it("does not flag benign capabilities", () => {
    for (const cap of [
      "chat",
      "voiceOutput",
      "notifications",
      "localModels",
    ] as LucaHostCapabilityKey[]) {
      expect(isHighRiskCapability(cap)).toBe(false);
    }
  });

  it("payment/spend is represented in the permission vocabulary as critical", () => {
    const payment = lucaLinkPermissionCategories.find(
      (p) => p.id === "payment.spend",
    );
    expect(payment?.risk).toBe("critical");
  });

  it("every capability maps only to known permission categories", () => {
    for (const perms of Object.values(CAPABILITY_PERMISSION_MAP)) {
      for (const perm of perms) {
        expect(PERMISSION_IDS.has(perm)).toBe(true);
      }
    }
  });
});

describe("manifestFromLucaLinkDevice", () => {
  it("preserves deviceId, name, and lastSeen", () => {
    const manifest = manifestFromLucaLinkDevice(
      {
        deviceId: "phone-42",
        type: "mobile",
        name: "Luca's iPhone",
        lastSeen: 1_699_999_999_000,
      },
      { now: 1_700_000_000_000 },
    );

    expect(manifest.deviceId).toBe("phone-42");
    expect(manifest.deviceName).toBe("Luca's iPhone");
    expect(manifest.status.lastSeen).toBe(1_699_999_999_000);
    expect(manifest.hostRole).toBe("companion");
    expect(manifest.schemaVersion).toBe("luca-host-manifest/v1");
  });

  it("maps desktop to execution unless it is the local Primary Host", () => {
    const remote = manifestFromLucaLinkDevice({
      deviceId: "d1",
      type: "desktop",
      name: "Studio",
      lastSeen: 1,
    });
    expect(remote.hostRole).toBe("execution");

    const local = manifestFromLucaLinkDevice(
      { deviceId: "d1", type: "desktop", name: "Studio", lastSeen: 1 },
      { isPrimaryHost: true },
    );
    expect(local.hostRole).toBe("primary");
  });

  it("maps web/guest devices to platform web and role guest", () => {
    for (const type of ["web", "guest", "browser"]) {
      const guest = manifestFromLucaLinkDevice({
        deviceId: `g-${type}`,
        type,
        name: "Browser Tab",
        lastSeen: 1,
      });
      expect(guest.platform).toBe("web");
      expect(guest.hostRole).toBe("guest");
      expect(guest.trust.trustLevel).toBe("guest");
    }
  });

  it("maps robot/humanoid/drone devices to platform robotics and role embodied", () => {
    for (const type of ["robot", "humanoid", "drone"]) {
      const embodied = manifestFromLucaLinkDevice({
        deviceId: `r-${type}`,
        type,
        name: "Body",
        lastSeen: 1,
      });
      expect(embodied.platform).toBe("robotics");
      expect(embodied.hostRole).toBe("embodied");
    }
  });

  it("desktop defaults platform unknown but role execution (primary when local)", () => {
    const remote = manifestFromLucaLinkDevice({
      deviceId: "d1",
      type: "desktop",
      name: "Studio",
      lastSeen: 1,
    });
    expect(remote.platform).toBe("unknown");
    expect(remote.hostRole).toBe("execution");

    const local = manifestFromLucaLinkDevice(
      { deviceId: "d1", type: "desktop", name: "Studio", lastSeen: 1 },
      { isPrimaryHost: true },
    );
    expect(local.platform).toBe("unknown");
    expect(local.hostRole).toBe("primary");
  });

  it("mobile defaults platform unknown but role companion", () => {
    const mobile = manifestFromLucaLinkDevice({
      deviceId: "m1",
      type: "mobile",
      name: "Phone",
      lastSeen: 1,
    });
    expect(mobile.platform).toBe("unknown");
    expect(mobile.hostRole).toBe("companion");
  });

  it("preserves an explicit platform override (mobile → ios/android)", () => {
    for (const platform of ["ios", "android"] as const) {
      const mobile = manifestFromLucaLinkDevice(
        { deviceId: "m2", type: "mobile", name: "Phone", lastSeen: 1 },
        { platform },
      );
      expect(mobile.platform).toBe(platform);
      expect(mobile.hostRole).toBe("companion");
    }
  });

  it("preserves an explicit platform override (desktop → macos/windows)", () => {
    for (const platform of ["macos", "windows"] as const) {
      const desktop = manifestFromLucaLinkDevice(
        { deviceId: "d2", type: "desktop", name: "Studio", lastSeen: 1 },
        { platform },
      );
      expect(desktop.platform).toBe(platform);
      expect(desktop.hostRole).toBe("execution");
    }
  });
});

describe("inferPlatformFromLucaLinkDeviceType", () => {
  it("maps browser-like types to web and robotics types to robotics", () => {
    expect(inferPlatformFromLucaLinkDeviceType("web")).toBe("web");
    expect(inferPlatformFromLucaLinkDeviceType("browser")).toBe("web");
    expect(inferPlatformFromLucaLinkDeviceType("guest")).toBe("web");
    expect(inferPlatformFromLucaLinkDeviceType("robot")).toBe("robotics");
    expect(inferPlatformFromLucaLinkDeviceType("humanoid")).toBe("robotics");
    expect(inferPlatformFromLucaLinkDeviceType("drone")).toBe("robotics");
  });

  it("returns unknown for OS-ambiguous form factors", () => {
    for (const type of [
      "desktop",
      "laptop",
      "workstation",
      "server",
      "mobile",
      "phone",
      "tablet",
      "tv",
      "watch",
      "iot",
      "",
      "weird",
    ]) {
      expect(inferPlatformFromLucaLinkDeviceType(type)).toBe("unknown");
    }
  });
});

describe("detectLocalHostHints", () => {
  it("runs without prompting and reports a node runtime under vitest", () => {
    const hints = detectLocalHostHints();
    // vitest default environment is node — no window/navigator.
    expect(hints.runtime).toBe("node");
    expect(hints.platform).toBe("unknown");
    expect(hints.hasScreen).toBe(false);
  });
});

describe("module import safety", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("performs no network or storage access at import time", async () => {
    const fetchSpy = vi.fn();
    const setItem = vi.fn();
    const getItem = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    vi.stubGlobal("localStorage", { setItem, getItem });

    vi.resetModules();
    const mod = await import("./capabilityRegistry");

    expect(typeof mod.createDefaultHostManifest).toBe("function");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
    expect(getItem).not.toHaveBeenCalled();
  });
});

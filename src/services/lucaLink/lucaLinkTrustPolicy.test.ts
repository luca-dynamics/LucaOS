import { afterEach, describe, expect, it, vi } from "vitest";
import { lucaLinkSyncLanes } from "./lucaLinkArchitectureMap";
import type { LucaHostManifest, LucaHostRole } from "./lucaHostManifest";
import type { LucaLinkPermissionCategory } from "./lucaLinkArchitectureMap";
import { createDefaultHostManifest } from "./capabilityRegistry";
import {
  canHostParticipateInLane,
  canHostUsePermission,
  evaluateHostPermission,
  explainPolicyDecision,
  getDefaultPolicyForManifest,
  getPermissionDescriptor,
  getPermissionRisk,
  isKnownPermission,
  requiresOriginApproval,
} from "./lucaLinkTrustPolicy";

const NOW = 1_700_000_000_000;

/**
 * Build a manifest for a role with explicit permissions and (by default) no
 * Origin-flagged approvals, so role-policy behavior is exercised directly.
 */
function makeManifest(
  hostRole: LucaHostRole,
  permissions: LucaLinkPermissionCategory[],
  opts: {
    requiresApprovalFor?: LucaLinkPermissionCategory[];
    expiresAt?: number;
    trustLevel?: LucaHostManifest["trust"]["trustLevel"];
  } = {},
): LucaHostManifest {
  const base = createDefaultHostManifest({
    deviceId: "test-host",
    deviceName: "Test Host",
    hostRole,
    now: NOW,
  });
  return {
    ...base,
    trust: {
      ...base.trust,
      trustLevel: opts.trustLevel ?? base.trust.trustLevel,
      permissions,
      requiresApprovalFor: opts.requiresApprovalFor ?? [],
      expiresAt: opts.expiresAt,
    },
  };
}

const decision = (
  manifest: LucaHostManifest,
  permission: string,
  options = {},
) => evaluateHostPermission(manifest, permission, { now: NOW, ...options }).decision;

describe("permission descriptor / risk", () => {
  it("returns descriptors and risk for known permissions", () => {
    expect(getPermissionDescriptor("shell.execute")?.id).toBe("shell.execute");
    expect(getPermissionRisk("shell.execute")).toBe("critical");
    expect(getPermissionRisk("payment.spend")).toBe("critical");
    expect(getPermissionRisk("memory.write")).toBe("high");
    expect(getPermissionRisk("camera.capture")).toBe("high");
    expect(getPermissionRisk("chat.receive")).toBe("low");
  });

  it("treats unknown permissions as unknown", () => {
    expect(isKnownPermission("nope.invalid")).toBe(false);
    expect(
      getPermissionDescriptor("nope.invalid" as LucaLinkPermissionCategory),
    ).toBeUndefined();
    const evalResult = evaluateHostPermission(
      makeManifest("origin", []),
      "nope.invalid",
      { now: NOW },
    );
    expect(evalResult.decision).toBe("deny");
    expect(evalResult.reason).toBe("unknown-permission");
  });
});

describe("guest policy", () => {
  const guest = makeManifest("guest", ["chat.send", "chat.receive"]);

  it("allows chat send/receive when granted", () => {
    expect(decision(guest, "chat.send")).toBe("allow");
    expect(decision(guest, "chat.receive")).toBe("allow");
  });

  it("denies all dangerous permissions", () => {
    for (const perm of [
      "memory.write",
      "shell.execute",
      "files.write",
      "browser.control",
      "code.modify",
      "git.create_pr",
      "robotics.motion",
      "payment.spend",
      "smart_home.control",
    ]) {
      expect(decision(guest, perm)).toBe("deny");
      expect(canHostUsePermission(guest, perm, { now: NOW })).toBe(false);
    }
  });
});

describe("companion policy", () => {
  it("allows perception/IO permissions when granted", () => {
    const companion = makeManifest("companion", [
      "chat.send",
      "chat.receive",
      "voice.capture",
      "camera.capture",
      "notification.send",
      "location.read",
    ]);
    for (const perm of [
      "voice.capture",
      "camera.capture",
      "notification.send",
    ]) {
      expect(decision(companion, perm)).toBe("allow");
    }
  });

  it("denies shell/files.write/git.create_pr by default", () => {
    const companion = makeManifest("companion", [
      "chat.send",
      "shell.execute",
      "files.write",
      "git.create_pr",
    ]);
    for (const perm of ["shell.execute", "files.write", "git.create_pr"]) {
      expect(decision(companion, perm)).toBe("deny");
    }
  });

  it("routes memory.write to Origin approval when granted", () => {
    const companion = makeManifest("companion", ["chat.send", "memory.write"]);
    expect(decision(companion, "memory.write")).toBe(
      "requires-origin-approval",
    );
    expect(requiresOriginApproval(companion, "memory.write", { now: NOW })).toBe(
      true,
    );
  });
});

describe("execution policy", () => {
  const perms: LucaLinkPermissionCategory[] = [
    "chat.send",
    "memory.read",
    "files.read",
    "files.write",
    "shell.execute",
    "code.modify",
    "git.create_pr",
  ];

  it("requires Origin approval for shell.execute by default", () => {
    const execution = makeManifest("execution", perms);
    expect(decision(execution, "shell.execute")).toBe(
      "requires-origin-approval",
    );
  });

  it("allows shell.execute only when explicitly elevated for local origin", () => {
    const execution = makeManifest("execution", perms);
    expect(
      decision(execution, "shell.execute", {
        isLocalOrigin: true,
        allowCriticalForOrigin: true,
      }),
    ).toBe("allow");
  });

  it("does not own memory.write by default", () => {
    const execution = makeManifest("execution", [...perms, "memory.write"]);
    expect(decision(execution, "memory.write")).toBe("deny");
  });
});

describe("origin policy", () => {
  const origin = makeManifest("origin", [
    "chat.send",
    "memory.read",
    "memory.write",
    "files.write",
    "shell.execute",
    "code.modify",
  ]);

  it("allows memory.write for the local origin", () => {
    expect(decision(origin, "memory.write", { isLocalOrigin: true })).toBe(
      "allow",
    );
  });

  it("requires approval for critical permissions unless explicitly allowed", () => {
    expect(decision(origin, "shell.execute", { isLocalOrigin: true })).toBe(
      "requires-origin-approval",
    );
    expect(
      decision(origin, "shell.execute", {
        isLocalOrigin: true,
        allowCriticalForOrigin: true,
      }),
    ).toBe("allow");
  });
});

describe("embodied policy", () => {
  it("never silently allows physical motion", () => {
    const embodied = makeManifest("embodied", [
      "chat.receive",
      "camera.capture",
      "location.read",
      "robotics.motion",
    ]);
    expect(decision(embodied, "robotics.motion")).toBe(
      "requires-origin-approval",
    );
    // Even Origin-elevation options must not auto-allow embodied motion.
    expect(
      decision(embodied, "robotics.motion", {
        isLocalOrigin: true,
        allowCriticalForOrigin: true,
      }),
    ).toBe("requires-origin-approval");
  });
});

describe("trust expiry", () => {
  it("denies permissions once the trust grant has expired", () => {
    const expired = makeManifest("companion", ["chat.send"], {
      expiresAt: NOW - 1_000,
    });
    const expResult = evaluateHostPermission(expired, "chat.send", { now: NOW });
    expect(expResult.decision).toBe("deny");
    expect(expResult.reason).toBe("expired-trust");
  });

  it("evaluates normally while the trust grant is active", () => {
    const active = makeManifest("companion", ["chat.send"], {
      expiresAt: NOW + 1_000,
    });
    expect(decision(active, "chat.send")).toBe("allow");
  });
});

describe("sync lane gating", () => {
  it("lets a guest join the conversation lane with chat permissions", () => {
    const guest = makeManifest("guest", ["chat.send", "chat.receive"]);
    expect(canHostParticipateInLane(guest, "conversation", { now: NOW }).decision).toBe(
      "allow",
    );
  });

  it("blocks a guest from the memory lane", () => {
    const guest = makeManifest("guest", ["chat.send", "chat.receive"]);
    const result = canHostParticipateInLane(guest, "memory", { now: NOW });
    expect(result.decision).toBe("deny");
    expect(result.reason).toBe("role-not-allowed");
  });

  it("lets a companion join the sensor lane when sensor permissions are granted", () => {
    const companion = makeManifest("companion", [
      "chat.send",
      "voice.capture",
      "camera.capture",
      "location.read",
    ]);
    expect(canHostParticipateInLane(companion, "sensor", { now: NOW }).decision).toBe(
      "allow",
    );
  });

  it("blocks a companion from the tool lane by default", () => {
    const companion = makeManifest("companion", ["chat.send", "voice.capture"]);
    expect(canHostParticipateInLane(companion, "tool", { now: NOW }).decision).toBe(
      "deny",
    );
  });

  it("restricts the safety lane to origin role / admin trust", () => {
    const origin = makeManifest("origin", ["chat.send"]);
    // Admin is a trust level, not a host role: an execution host with admin trust.
    const adminTrust = makeManifest("execution", ["chat.send"], {
      trustLevel: "admin",
    });
    const guest = makeManifest("guest", ["chat.send", "chat.receive"]);
    expect(canHostParticipateInLane(origin, "safety", { now: NOW }).decision).toBe(
      "allow",
    );
    expect(
      canHostParticipateInLane(adminTrust, "safety", { now: NOW }).decision,
    ).toBe("allow");
    expect(canHostParticipateInLane(guest, "safety", { now: NOW }).decision).toBe(
      "deny",
    );
  });

  it("denies unknown lanes", () => {
    const origin = makeManifest("origin", ["chat.send"]);
    const result = canHostParticipateInLane(origin, "frobnicate", { now: NOW });
    expect(result.decision).toBe("deny");
    expect(result.reason).toBe("unknown-lane");
  });
});

describe("manifest defaults", () => {
  it("treats a default guest as least privilege", () => {
    const guest = createDefaultHostManifest({ deviceId: "g", now: NOW });
    expect(guest.hostRole).toBe("guest");
    expect(canHostUsePermission(guest, "chat.send", { now: NOW })).toBe(true);
    expect(canHostUsePermission(guest, "memory.write", { now: NOW })).toBe(false);
    expect(canHostUsePermission(guest, "shell.execute", { now: NOW })).toBe(false);
  });

  it("classifies default origin dangerous permissions as approval-aware", () => {
    const origin = createDefaultHostManifest({
      deviceId: "o",
      platform: "macos",
      isLocalOrigin: true,
      now: NOW,
    });
    const shell = evaluateHostPermission(origin, "shell.execute", { now: NOW });
    expect(shell.decision).toBe("requires-origin-approval");
    expect(shell.risk).toBe("critical");

    const summary = getDefaultPolicyForManifest(origin, { now: NOW });
    expect(summary.lanes).toHaveLength(lucaLinkSyncLanes.length);
    expect(summary.permissions.length).toBe(origin.trust.permissions.length);
  });

  it("does not grant robotics.motion to a default embodied host", () => {
    const embodied = createDefaultHostManifest({
      deviceId: "e",
      platform: "robotics",
      now: NOW,
    });
    expect(embodied.hostRole).toBe("embodied");
    expect(embodied.trust.permissions).not.toContain("robotics.motion");
  });

  it("explainPolicyDecision returns a human-readable string", () => {
    const guest = makeManifest("guest", ["chat.send"]);
    const evalResult = evaluateHostPermission(guest, "shell.execute", { now: NOW });
    expect(typeof explainPolicyDecision(evalResult)).toBe("string");
    expect(explainPolicyDecision(evalResult).length).toBeGreaterThan(0);
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
    const mod = await import("./lucaLinkTrustPolicy");

    expect(typeof mod.evaluateHostPermission).toBe("function");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
    expect(getItem).not.toHaveBeenCalled();
  });
});

import { describe, expect, it, vi } from "vitest";
import { createDefaultHostManifest } from "./capabilityRegistry";
import type { LucaLinkPermissionCategory } from "./lucaLinkArchitectureMap";
import type { LucaHostManifest, LucaHostRole } from "./lucaHostManifest";
import {
  evaluateSoftEnforcementForEnvelope,
  evaluateSoftEnforcementForLegacyEvent,
  isSafeRuntimeFlow,
  isSoftEnforcementHighRiskPermission,
  isSoftEnforcementRestrictedLaneForGuest,
  requiresLucaLinkPrimaryHostApproval,
  shouldBlockLucaLinkEvent,
} from "./lucaLinkSoftEnforcement";
import {
  createLucaLinkEnvelope,
  type LucaLinkEnvelope,
} from "./lucaLinkSyncProtocol";

const NOW = 1_700_000_000_000;

function manifest(
  role: LucaHostRole,
  extra: {
    deviceId?: string;
    permissions?: LucaLinkPermissionCategory[];
    requiresApprovalFor?: LucaLinkPermissionCategory[];
  } = {},
): LucaHostManifest {
  const base = createDefaultHostManifest({
    deviceId: extra.deviceId ?? `${role}-1`,
    deviceName: `${role} host`,
    hostRole: role,
    now: NOW,
  });
  return {
    ...base,
    trust: {
      ...base.trust,
      permissions: extra.permissions ?? base.trust.permissions,
      requiresApprovalFor:
        extra.requiresApprovalFor ?? base.trust.requiresApprovalFor,
    },
    status: { ...base.status, online: true },
  };
}

const primary = manifest("primary", { deviceId: "primary-1" });
const guest = manifest("guest", { deviceId: "guest-1" });
const execution = manifest("execution", {
  deviceId: "exec-1",
  permissions: [
    "chat.send",
    "chat.receive",
    "memory.read",
    "files.read",
    "files.write",
    "shell.execute",
    "code.modify",
    "git.create_pr",
    "browser.control",
  ],
  requiresApprovalFor: [
    "files.write",
    "shell.execute",
    "code.modify",
    "git.create_pr",
    "browser.control",
  ],
});
const embodied = manifest("embodied", {
  deviceId: "body-1",
  permissions: [
    "chat.send",
    "chat.receive",
    "robotics.motion",
    "smart_home.control",
  ],
});

function envelope(
  lane: string,
  payload: Record<string, unknown>,
  sourceDeviceId = "guest-1",
): LucaLinkEnvelope {
  const kind =
    typeof payload === "object" && payload && "kind" in payload
      ? String((payload as { kind: unknown }).kind)
      : "message";
  return createLucaLinkEnvelope({
    lane,
    type: kind,
    sourceDeviceId,
    targetDeviceId: "primary",
    timestamp: NOW,
    payload,
  } as unknown as Parameters<typeof createLucaLinkEnvelope>[0]);
}

describe("LucaLink soft enforcement modes", () => {
  it("disabled mode never blocks high-risk actions", () => {
    const result = evaluateSoftEnforcementForEnvelope(
      envelope(
        "tool",
        { kind: "tool-request", permission: "shell.execute" },
        "exec-1",
      ),
      { mode: "disabled", sourceManifest: execution, candidates: [primary] },
    );

    expect(result.decision).toBe("allow");
    expect(result.reason).toBe("mode-disabled");
    expect(result.blocked).toBe(false);
  });

  it("observe-only mode reports without blocking", () => {
    const result = evaluateSoftEnforcementForEnvelope(
      envelope(
        "tool",
        { kind: "tool-request", permission: "shell.execute" },
        "exec-1",
      ),
      {
        mode: "observe-only",
        sourceManifest: execution,
        candidates: [primary],
      },
    );

    expect(result.decision).toBe("observe-only");
    expect(result.blocked).toBe(false);
    expect(result.explain).toContain("no runtime block");
  });

  it("high-risk-only mode gates dangerous flows but allows low-risk flows", () => {
    const dangerous = evaluateSoftEnforcementForEnvelope(
      envelope(
        "tool",
        { kind: "tool-request", permission: "shell.execute" },
        "exec-1",
      ),
      {
        mode: "high-risk-only",
        sourceManifest: execution,
        candidates: [primary],
      },
    );
    const lowRisk = evaluateSoftEnforcementForLegacyEvent(
      {
        eventName: "guest-message",
        payload: { guestId: "guest-1", message: "hello" },
      },
      { mode: "high-risk-only", sourceManifest: guest, candidates: [primary] },
    );

    expect(dangerous.decision).toBe("requires-primary-host-approval");
    expect(dangerous.blocked).toBe(true);
    expect(lowRisk.decision).toBe("allow");
    expect(lowRisk.blocked).toBe(false);
  });
});

describe("guest soft enforcement rules", () => {
  it("allows guest conversation, presence heartbeat, and WebRTC signaling", () => {
    const chat = evaluateSoftEnforcementForLegacyEvent(
      {
        eventName: "guest-message",
        payload: { guestId: "guest-1", message: "hello" },
      },
      { mode: "high-risk-only", sourceManifest: guest, candidates: [primary] },
    );
    const heartbeat = evaluateSoftEnforcementForLegacyEvent(
      {
        eventName: "heartbeat",
        payload: { deviceId: "guest-1", type: "heartbeat" },
      },
      { mode: "high-risk-only", sourceManifest: guest, candidates: [primary] },
    );
    const webrtc = evaluateSoftEnforcementForLegacyEvent(
      { eventName: "webrtc-offer", payload: { sessionId: "guest-1" } },
      { mode: "high-risk-only", sourceManifest: guest, candidates: [primary] },
    );

    expect(chat.blocked).toBe(false);
    expect(heartbeat.blocked).toBe(false);
    expect(webrtc.blocked).toBe(false);
    expect(isSafeRuntimeFlow("webrtc-offer")).toBe(true);
  });

  it("denies guest memory, tool, and safety lanes", () => {
    for (const candidate of [
      envelope("memory", { kind: "memory-proposal" }),
      envelope("tool", { kind: "tool-request", permission: "shell.execute" }),
      envelope("safety", { kind: "pause-sync" }),
    ]) {
      const result = evaluateSoftEnforcementForEnvelope(candidate, {
        mode: "high-risk-only",
        sourceManifest: guest,
        candidates: [primary],
      });
      expect(result.decision).toBe("deny");
      expect(result.reason).toBe("guest-restricted-lane");
      expect(result.blocked).toBe(true);
    }
  });

  it("requires Primary Host approval for guest identity lane when available", () => {
    const result = evaluateSoftEnforcementForEnvelope(
      envelope("identity", { kind: "host-manifest", deviceId: "guest-1" }),
      { mode: "high-risk-only", sourceManifest: guest, candidates: [primary] },
    );

    expect(result.decision).toBe("requires-primary-host-approval");
    expect(result.requiresPrimaryHostApproval).toBe(true);
  });
});

describe("dangerous permission soft gates", () => {
  it.each([
    "shell.execute",
    "files.write",
    "code.modify",
    "git.create_pr",
    "browser.control",
    "smart_home.control",
  ] as const)("%s requires Primary Host approval", (permission: string) => {
    const result = evaluateSoftEnforcementForEnvelope(
      envelope("tool", { kind: "tool-request", permission }, "exec-1"),
      {
        mode: "high-risk-only",
        sourceManifest: execution,
        candidates: [primary],
      },
    );

    expect(result.decision).toBe("requires-primary-host-approval");
    expect(result.requiresPrimaryHostApproval).toBe(true);
  });

  it("robotics.motion requires approval when a Primary Host candidate exists and denies without one", () => {
    const withPrimary = evaluateSoftEnforcementForEnvelope(
      envelope(
        "tool",
        { kind: "tool-request", permission: "robotics.motion" },
        "body-1",
      ),
      {
        mode: "high-risk-only",
        sourceManifest: embodied,
        candidates: [primary],
      },
    );
    const withoutPrimary = evaluateSoftEnforcementForEnvelope(
      envelope(
        "tool",
        { kind: "tool-request", permission: "robotics.motion" },
        "body-1",
      ),
      { mode: "high-risk-only", sourceManifest: embodied, candidates: [] },
    );

    expect(withPrimary.decision).toBe("requires-primary-host-approval");
    expect(withoutPrimary.decision).toBe("deny");
  });

  it("payment.spend is denied by default", () => {
    const result = evaluateSoftEnforcementForEnvelope(
      envelope(
        "tool",
        { kind: "tool-request", permission: "payment.spend" },
        "exec-1",
      ),
      {
        mode: "high-risk-only",
        sourceManifest: execution,
        candidates: [primary],
      },
    );

    expect(result.decision).toBe("deny");
    expect(result.blocked).toBe(true);
  });
});

describe("normal LucaLink runtime flows", () => {
  it.each([
    ["registry", { type: "registry", devices: [] }],
    ["message", { deviceId: "guest-1", text: "basic message" }],
    ["mission", { missionId: "m1", status: "running" }],
    ["SENSOR_PULSE", { deviceId: "sensor-1", value: 1 }],
    ["desktop-to-guest", { sessionId: "guest-1", message: "basic response" }],
  ])("allows %s without blocking", (eventName: string, payload: unknown) => {
    const result = evaluateSoftEnforcementForLegacyEvent(
      { eventName, payload },
      { mode: "high-risk-only", candidates: [primary, guest] },
    );

    expect(result.blocked).toBe(false);
    expect(result.decision).toBe("allow");
  });
});

describe("policy integration and validation", () => {
  it("maps policy denied results to soft enforcement deny", () => {
    const companion = manifest("companion", {
      deviceId: "companion-1",
      permissions: ["chat.send", "chat.receive"],
    });
    const result = evaluateSoftEnforcementForEnvelope(
      envelope(
        "settings",
        { kind: "settings-sync", scope: "privacy" },
        "companion-1",
      ),
      {
        mode: "high-risk-only",
        sourceManifest: companion,
        candidates: [primary],
      },
    );

    expect(result.decision).toBe("deny");
    expect(result.reason).toBe("policy-denied");
  });

  it("maps policy approval results to Primary Host approval", () => {
    const companion = manifest("companion", {
      deviceId: "companion-1",
      permissions: ["chat.send", "chat.receive", "memory.write"],
    });
    const result = evaluateSoftEnforcementForEnvelope(
      envelope(
        "conversation",
        { kind: "message", text: "remember this", permission: "memory.write" },
        "companion-1",
      ),
      {
        mode: "high-risk-only",
        sourceManifest: companion,
        candidates: [primary],
      },
    );

    expect(result.decision).toBe("requires-primary-host-approval");
    expect(result.reason).toBe("policy-requires-approval");
  });

  it("returns structured errors for validation-failed envelopes", () => {
    const broken = {
      version: "luca-link/v1",
      id: "broken",
      lane: "conversation",
      sourceDeviceId: "guest-1",
      targetDeviceId: "primary",
      timestamp: NOW,
      payload: { kind: "message", text: "missing type/security/routing" },
    } as LucaLinkEnvelope;

    const result = evaluateSoftEnforcementForEnvelope(broken, {
      mode: "high-risk-only",
      sourceManifest: guest,
      candidates: [primary],
    });

    expect(result.decision).toBe("deny");
    expect(result.reason).toBe("validation-failed");
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe("terminology, helpers, and no import side effects", () => {
  it("classifies helper predicates without using Origin as device fallback", () => {
    expect(isSoftEnforcementHighRiskPermission("shell.execute")).toBe(true);
    expect(isSoftEnforcementRestrictedLaneForGuest("memory")).toBe(true);
    expect(
      shouldBlockLucaLinkEvent(
        { eventName: "message", payload: { permission: "shell.execute" } },
        {
          mode: "high-risk-only",
          sourceManifest: execution,
          candidates: [primary],
        },
      ),
    ).toBe(true);
    expect(
      requiresLucaLinkPrimaryHostApproval(
        envelope(
          "tool",
          { kind: "tool-request", permission: "files.write" },
          "exec-1",
        ),
        {
          mode: "high-risk-only",
          sourceManifest: execution,
          candidates: [primary],
        },
      ),
    ).toBe(true);
  });

  it("never says Origin approval in explanations", () => {
    const result = evaluateSoftEnforcementForEnvelope(
      envelope(
        "tool",
        { kind: "tool-request", permission: "shell.execute" },
        "exec-1",
      ),
      {
        mode: "high-risk-only",
        sourceManifest: execution,
        candidates: [primary],
      },
    );

    expect(result.explain).toContain("Primary Host approval");
    expect(result.explain).not.toMatch(/Origin approval/i);
  });

  it("does not touch browser, network, media, shell, or storage APIs on evaluation", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(() => {
      throw new Error("fetch should not be called");
    });
    const localStorageGet = vi.fn();
    const openSocket = vi.fn();
    const media = vi.fn();
    const originalWindow = (globalThis as { window?: unknown }).window;
    (globalThis as { window?: unknown }).window = {
      localStorage: { getItem: localStorageGet, setItem: vi.fn() },
      WebSocket: openSocket,
      navigator: {
        mediaDevices: { getUserMedia: media },
        geolocation: { getCurrentPosition: media },
      },
    };

    const result = evaluateSoftEnforcementForLegacyEvent(
      {
        eventName: "guest-message",
        payload: { guestId: "guest-1", message: "hello" },
      },
      { mode: "high-risk-only", sourceManifest: guest, candidates: [primary] },
    );

    expect(result.blocked).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(localStorageGet).not.toHaveBeenCalled();
    expect(openSocket).not.toHaveBeenCalled();
    expect(media).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
    (globalThis as { window?: unknown }).window = originalWindow;
  });
});

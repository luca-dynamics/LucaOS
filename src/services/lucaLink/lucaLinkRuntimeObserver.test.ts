import { describe, expect, it, vi } from "vitest";
import { createDefaultHostManifest } from "./capabilityRegistry";
import type { LucaHostManifest, LucaHostRole } from "./lucaHostManifest";
import type { LucaLinkPermissionCategory } from "./lucaLinkArchitectureMap";
import { createLucaLinkEnvelope } from "./lucaLinkSyncProtocol";
import {
  observeLegacyDeviceRegistry,
  observeLegacyEnvelope,
  observeLegacyLucaLinkEvent,
  summarizeRuntimeObservations,
} from "./lucaLinkRuntimeObserver";

const NOW = 1_700_000_000_000;

function manifest(
  role: LucaHostRole,
  extra: {
    deviceId?: string;
    permissions?: LucaLinkPermissionCategory[];
    requiresApprovalFor?: LucaLinkPermissionCategory[];
    online?: boolean;
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
    capabilities: {
      ...base.capabilities,
      chat: true,
      notifications: role === "primary" || role === "display" || role === "companion",
      shellAccess: role === "execution" || role === "primary",
      fileAccess: role === "execution" || role === "primary",
      codeExecution: role === "execution" || role === "primary",
    },
    trust: {
      ...base.trust,
      permissions: extra.permissions ?? base.trust.permissions,
      requiresApprovalFor: extra.requiresApprovalFor ?? base.trust.requiresApprovalFor,
    },
    status: { ...base.status, online: extra.online ?? true },
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
  requiresApprovalFor: ["files.write", "shell.execute", "code.modify", "git.create_pr", "browser.control"],
});

describe("runtime observer shadow decisions", () => {
  it("observes guest chat as a route when candidates are available", () => {
    const observation = observeLegacyLucaLinkEvent(
      { eventName: "guest-message", payload: { guestId: "guest-1", text: "hello", targetDeviceId: "primary" } },
      { now: NOW, candidates: [guest, primary] },
    );
    expect(observation.envelope?.lane).toBe("conversation");
    expect(["would-route", "would-allow"]).toContain(observation.decision);
    expect(observation.selectedHostId).toBeDefined();
    expect(observation.errors).toEqual([]);
  });

  it("does not silently allow guest tool-like events", () => {
    const observation = observeLegacyLucaLinkEvent(
      { eventName: "message", payload: { deviceId: "guest-1", type: "tool", permission: "shell.execute", command: "echo nope" } },
      { now: NOW, candidates: [guest, primary] },
    );
    expect(observation.envelope?.lane).toBe("tool");
    expect(["would-deny", "would-require-primary-host-approval", "adapter-warning"]).toContain(observation.decision);
    expect(observation.decision).not.toBe("would-allow");
  });

  it("observes mission sync and SENSOR_PULSE lanes", () => {
    const mission = observeLegacyLucaLinkEvent(
      { eventName: "sync", payload: { type: "mission", missionId: "m-1", summary: "shadow only" } },
      { now: NOW, candidates: [primary] },
    );
    expect(mission.envelope?.lane).toBe("mission");
    expect(mission.errors).toEqual([]);

    const sensor = observeLegacyLucaLinkEvent(
      { eventName: "SENSOR_PULSE", payload: { deviceId: "sensor-1", value: 42 } },
      { now: NOW, candidates: [primary] },
    );
    expect(sensor.envelope?.lane).toBe("sensor");
    expect(sensor.errors).toEqual([]);
  });

  it("surfaces Primary Host approval for execution tool envelopes", () => {
    const envelope = createLucaLinkEnvelope({
      id: "tool-approval-1",
      lane: "tool",
      type: "tool-request",
      sourceDeviceId: "exec-1",
      targetDeviceId: "primary",
      timestamp: NOW,
      payload: { kind: "tool-request", permission: "shell.execute", args: { command: "echo ok" } },
    });
    const observation = observeLegacyEnvelope(envelope, [execution, primary], { now: NOW });
    expect(observation.decision).toBe("would-require-primary-host-approval");
    expect(observation.requiresPrimaryHostApproval).toBe(true);
    expect(`${observation.reasons.join(" ")} ${observation.warnings.join(" ")}`).toContain("Primary Host approval");
  });

  it("routes safety events to the Primary Host and never mentions Origin approval", () => {
    const envelope = createLucaLinkEnvelope({
      id: "safety-1",
      lane: "safety",
      type: "security-alert",
      sourceDeviceId: "guest-1",
      targetDeviceId: "primary",
      timestamp: NOW,
      payload: { kind: "security-alert", reason: "shadow diagnostic", severity: "critical" },
    });
    const observation = observeLegacyEnvelope(envelope, [guest, primary], { now: NOW });
    expect(observation.selectedHostId).toBe("primary-1");
    expect(observation.selectedHostRole).toBe("primary");
    expect(`${observation.reasons.join(" ")} ${observation.warnings.join(" ")}`).toContain("Primary Host");
    expect(`${observation.reasons.join(" ")} ${observation.warnings.join(" ")}`).not.toContain("Origin approval");
  });

  it("returns warning rather than throwing when no candidate is available", () => {
    const observation = observeLegacyLucaLinkEvent(
      { eventName: "guest-message", payload: { text: "no route yet" } },
      { now: NOW },
    );
    expect(observation.errors).toEqual([]);
    expect(observation.warnings.join(" ")).toContain("No routing candidates supplied");
  });

  it("propagates adapter errors into observation errors", () => {
    const observation = observeLegacyLucaLinkEvent(
      { eventName: "message", payload: "not an object" },
      { now: NOW },
    );
    expect(observation.decision).toBe("adapter-error");
    expect(observation.errors.join(" ")).toContain("legacy message must be an object");
  });
});

describe("runtime observer registry and summaries", () => {
  it("observes legacy device registries as manifest projections", () => {
    const observations = observeLegacyDeviceRegistry(
      [{ deviceId: "mobile-1", type: "mobile", name: "Phone", lastSeen: NOW - 1 }],
      { now: NOW },
    );
    expect(observations[0].selectedHostRole).toBe("companion");
    expect(observations[0].selectedHostId).toBe("mobile-1");
  });

  it("summarizes observation decisions", () => {
    const observations = [
      observeLegacyLucaLinkEvent({ eventName: "unknown", payload: {} }, { now: NOW }),
      observeLegacyLucaLinkEvent({ eventName: "message", payload: "bad" }, { now: NOW }),
    ];
    const summary = summarizeRuntimeObservations(observations);
    expect(summary.total).toBe(2);
    expect(summary.adapterWarnings).toBe(1);
    expect(summary.adapterErrors).toBe(1);
  });
});

describe("runtime observer module side effects", () => {
  it("does not touch browser/network/permission globals at import", async () => {
    const storage = { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn(), clear: vi.fn() };
    const fetchSpy = vi.fn();
    const permissions = { query: vi.fn() };
    const getUserMedia = vi.fn();
    const getCurrentPosition = vi.fn();
    vi.stubGlobal("localStorage", storage);
    vi.stubGlobal("sessionStorage", storage);
    vi.stubGlobal("fetch", fetchSpy);
    vi.stubGlobal("navigator", { permissions, mediaDevices: { getUserMedia }, geolocation: { getCurrentPosition } });

    vi.resetModules();
    await import("./lucaLinkRuntimeObserver");

    expect(storage.getItem).not.toHaveBeenCalled();
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(permissions.query).not.toHaveBeenCalled();
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(getCurrentPosition).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});

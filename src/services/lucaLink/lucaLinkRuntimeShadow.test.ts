import { describe, expect, it, vi } from "vitest";
import { createDefaultHostManifest } from "./capabilityRegistry";
import type { LucaHostManifest, LucaHostRole } from "./lucaHostManifest";
import type { LucaLinkPermissionCategory } from "./lucaLinkArchitectureMap";
import {
  clearLucaLinkShadowObservations,
  createLucaLinkRuntimeShadow,
  getLucaLinkShadowObservations,
  recordLucaLinkShadowObservation,
  summarizeLucaLinkShadowObservations,
} from "./lucaLinkRuntimeShadow";

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
    capabilities: {
      ...base.capabilities,
      chat: true,
      notifications:
        role === "primary" || role === "display" || role === "companion",
      shellAccess: role === "execution" || role === "primary",
      fileAccess: role === "execution" || role === "primary",
      codeExecution: role === "execution" || role === "primary",
    },
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

describe("LucaLink runtime shadow helper", () => {
  it("records nothing when disabled", () => {
    const shadow = createLucaLinkRuntimeShadow({ enabled: false, now: NOW });
    const result = recordLucaLinkShadowObservation(shadow, {
      eventName: "message",
      payload: { deviceId: "guest-1", text: "hello" },
    });

    expect(result).toBeUndefined();
    expect(getLucaLinkShadowObservations(shadow)).toEqual([]);
    expect(shadow.lastObservationAt).toBeUndefined();
  });

  it("records enabled observations and summarizes diagnostics", () => {
    const shadow = createLucaLinkRuntimeShadow({ enabled: true, now: NOW });
    const observation = recordLucaLinkShadowObservation(
      shadow,
      {
        eventName: "message",
        payload: {
          deviceId: "guest-1",
          text: "hello",
          targetDeviceId: "primary",
        },
      },
      { candidates: [guest, primary] },
    );

    expect(observation?.eventName).toBe("message");
    expect(observation?.envelope?.lane).toBe("conversation");
    expect(["would-route", "would-allow"]).toContain(observation?.decision);
    expect(getLucaLinkShadowObservations(shadow)).toHaveLength(1);
    expect(summarizeLucaLinkShadowObservations(shadow).total).toBe(1);
  });

  it("caps observations as a ring buffer", () => {
    const shadow = createLucaLinkRuntimeShadow({
      enabled: true,
      maxObservations: 2,
      now: NOW,
    });

    recordLucaLinkShadowObservation(shadow, {
      eventName: "message",
      payload: { deviceId: "guest-1", text: "one" },
    });
    recordLucaLinkShadowObservation(shadow, {
      eventName: "guest-message",
      payload: { guestId: "guest-1", message: "two" },
    });
    recordLucaLinkShadowObservation(shadow, {
      eventName: "SENSOR_PULSE",
      payload: { deviceId: "sensor-1", value: 3 },
    });

    const observations = getLucaLinkShadowObservations(shadow);
    expect(observations).toHaveLength(2);
    expect(observations.map((observation) => observation.eventName)).toEqual([
      "guest-message",
      "SENSOR_PULSE",
    ]);
  });

  it("calls onObservation without using it for enforcement", () => {
    const onObservation = vi.fn();
    const shadow = createLucaLinkRuntimeShadow({
      enabled: true,
      now: NOW,
      onObservation,
    });
    const payload = { deviceId: "guest-1", text: "unchanged" };

    const result = recordLucaLinkShadowObservation(shadow, {
      eventName: "message",
      payload,
    });

    expect(result).toBeDefined();
    expect(onObservation).toHaveBeenCalledTimes(1);
    expect(payload).toEqual({ deviceId: "guest-1", text: "unchanged" });
  });

  it("keeps console logging optional and disabled by default", () => {
    const debugSpy = vi
      .spyOn(console, "debug")
      .mockImplementation(() => undefined);
    const quietShadow = createLucaLinkRuntimeShadow({
      enabled: true,
      now: NOW,
    });
    recordLucaLinkShadowObservation(quietShadow, {
      eventName: "message",
      payload: { deviceId: "guest-1", text: "quiet" },
    });
    expect(debugSpy).not.toHaveBeenCalled();

    const loggingShadow = createLucaLinkRuntimeShadow({
      enabled: true,
      now: NOW,
      logToConsole: true,
    });
    recordLucaLinkShadowObservation(loggingShadow, {
      eventName: "message",
      payload: { deviceId: "guest-1", text: "log" },
    });
    expect(debugSpy).toHaveBeenCalledTimes(1);
    debugSpy.mockRestore();
  });

  it("catches observer errors and converts them to diagnostics", () => {
    const shadow = createLucaLinkRuntimeShadow({ enabled: true, now: NOW });
    const observerOptions = {
      get candidates(): never {
        throw new Error("candidate projection failed");
      },
    };

    expect(() =>
      recordLucaLinkShadowObservation(
        shadow,
        {
          eventName: "message",
          payload: { deviceId: "guest-1", text: "safe" },
        },
        observerOptions,
      ),
    ).not.toThrow();

    const observation = getLucaLinkShadowObservations(shadow)[0];
    expect(observation.decision).toBe("adapter-error");
    expect(observation.errors.join(" ")).toContain(
      "candidate projection failed",
    );
  });

  it("clears observations without touching live runtime state", () => {
    const shadow = createLucaLinkRuntimeShadow({ enabled: true, now: NOW });
    recordLucaLinkShadowObservation(shadow, {
      eventName: "message",
      payload: { deviceId: "guest-1", text: "clear" },
    });

    clearLucaLinkShadowObservations(shadow);

    expect(getLucaLinkShadowObservations(shadow)).toEqual([]);
    expect(shadow.lastObservationAt).toBeUndefined();
  });
});

describe("LucaLink runtime shadow observation behavior", () => {
  it("records guest-message and SENSOR_PULSE observations", () => {
    const shadow = createLucaLinkRuntimeShadow({ enabled: true, now: NOW });

    const guestMessage = recordLucaLinkShadowObservation(
      shadow,
      {
        eventName: "guest-message",
        payload: { guestId: "guest-1", message: "hi" },
      },
      { candidates: [guest, primary] },
    );
    const sensorPulse = recordLucaLinkShadowObservation(
      shadow,
      {
        eventName: "SENSOR_PULSE",
        payload: { deviceId: "sensor-1", battery: 91 },
      },
      { candidates: [primary] },
    );

    expect(guestMessage?.envelope?.lane).toBe("conversation");
    expect(sensorPulse?.envelope?.lane).toBe("sensor");
    expect(sensorPulse?.errors).toEqual([]);
  });

  it("records unknown events as adapter warnings", () => {
    const shadow = createLucaLinkRuntimeShadow({ enabled: true, now: NOW });
    const observation = recordLucaLinkShadowObservation(shadow, {
      eventName: "mystery-event",
      payload: { value: 1 },
    });

    expect(observation?.decision).toBe("adapter-warning");
    expect(observation?.warnings.join(" ")).toContain(
      "unknown LucaLink legacy event",
    );
  });

  it("includes would-route and Primary Host approval diagnostics where expected", () => {
    const shadow = createLucaLinkRuntimeShadow({ enabled: true, now: NOW });
    const route = recordLucaLinkShadowObservation(
      shadow,
      {
        eventName: "message",
        payload: {
          deviceId: "guest-1",
          text: "route me",
          targetDeviceId: "primary",
        },
      },
      { candidates: [guest, primary] },
    );
    const approval = recordLucaLinkShadowObservation(
      shadow,
      {
        eventName: "message",
        payload: {
          deviceId: "exec-1",
          type: "tool",
          permission: "shell.execute",
          command: "echo shadow",
        },
      },
      { candidates: [execution, primary] },
    );

    expect(route?.decision).toBe("would-route");
    expect(approval?.decision).toBe("would-require-primary-host-approval");
    expect(
      `${approval?.reasons.join(" ")} ${approval?.warnings.join(" ")}`,
    ).toContain("Primary Host");
    expect(
      `${approval?.reasons.join(" ")} ${approval?.warnings.join(" ")}`,
    ).not.toContain("Origin approval");
  });

  it("returns diagnostics only and does not block or mutate payloads", () => {
    const shadow = createLucaLinkRuntimeShadow({ enabled: true, now: NOW });
    const payload = {
      deviceId: "guest-1",
      type: "tool",
      permission: "shell.execute",
      command: "echo no block",
    };

    const observation = recordLucaLinkShadowObservation(
      shadow,
      { eventName: "message", payload },
      { candidates: [guest, primary] },
    );

    expect([
      "would-deny",
      "would-require-primary-host-approval",
      "adapter-warning",
    ]).toContain(observation?.decision);
    expect(payload).toEqual({
      deviceId: "guest-1",
      type: "tool",
      permission: "shell.execute",
      command: "echo no block",
    });
    expect(getLucaLinkShadowObservations(shadow)).toHaveLength(1);
  });
});

describe("LucaLink runtime shadow module side effects", () => {
  it("does not touch browser/network/permission/socket globals at import", async () => {
    const storage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    const fetchSpy = vi.fn();
    const permissions = { query: vi.fn() };
    const getUserMedia = vi.fn();
    const getCurrentPosition = vi.fn();
    const socketEmit = vi.fn();
    vi.stubGlobal("localStorage", storage);
    vi.stubGlobal("sessionStorage", storage);
    vi.stubGlobal("fetch", fetchSpy);
    vi.stubGlobal("io", socketEmit);
    vi.stubGlobal("navigator", {
      permissions,
      mediaDevices: { getUserMedia },
      geolocation: { getCurrentPosition },
    });

    vi.resetModules();
    await import("./lucaLinkRuntimeShadow");

    expect(storage.getItem).not.toHaveBeenCalled();
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(socketEmit).not.toHaveBeenCalled();
    expect(permissions.query).not.toHaveBeenCalled();
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(getCurrentPosition).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});

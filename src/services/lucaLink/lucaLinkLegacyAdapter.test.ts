import { describe, expect, it, vi } from "vitest";
import { createLucaLinkEnvelope, validateLucaLinkEnvelope } from "./lucaLinkSyncProtocol";
import {
  envelopeToLegacyMessage,
  legacyDeviceToManifest,
  legacyEventToEnvelope,
  legacyMessageToEnvelope,
  legacyMissionToEnvelope,
  legacySensorPulseToEnvelope,
  legacySyncToEnvelope,
  type LucaLinkLegacyDeviceLike,
} from "./lucaLinkLegacyAdapter";

const NOW = 1_700_000_000_000;

function device(type: string, extra: Partial<LucaLinkLegacyDeviceLike> = {}): LucaLinkLegacyDeviceLike {
  return {
    deviceId: `${type}-1`,
    name: `${type} host`,
    type,
    lastSeen: NOW - 1000,
    ...extra,
  };
}

describe("legacy device manifest mapping", () => {
  it("maps known device form factors to LucaLink host roles and preserves identity", () => {
    expect(legacyDeviceToManifest(device("desktop"), { now: NOW, isPrimaryHost: true }).manifest?.hostRole).toBe("primary");
    expect(legacyDeviceToManifest(device("desktop"), { now: NOW }).manifest?.hostRole).toBe("execution");
    expect(legacyDeviceToManifest(device("mobile"), { now: NOW }).manifest?.hostRole).toBe("companion");
    expect(legacyDeviceToManifest(device("web"), { now: NOW }).manifest?.hostRole).toBe("guest");
    expect(legacyDeviceToManifest(device("browser"), { now: NOW }).manifest?.hostRole).toBe("guest");
    expect(legacyDeviceToManifest(device("guest"), { now: NOW }).manifest?.hostRole).toBe("guest");
    expect(legacyDeviceToManifest(device("display"), { now: NOW }).manifest?.hostRole).toBe("display");
    expect(legacyDeviceToManifest(device("sensor"), { now: NOW }).manifest?.hostRole).toBe("sensor");
    expect(legacyDeviceToManifest(device("humanoid"), { now: NOW }).manifest?.hostRole).toBe("embodied");

    const manifest = legacyDeviceToManifest(device("projector", { deviceId: "display-7", name: "Wall", lastSeen: NOW - 7 }), { now: NOW }).manifest;
    expect(manifest?.deviceId).toBe("display-7");
    expect(manifest?.deviceName).toBe("Wall");
    expect(manifest?.status.lastSeen).toBe(NOW - 7);
  });
});

describe("legacy event/message envelope mapping", () => {
  it("maps chat-like legacy messages to conversation envelopes", () => {
    const result = legacyMessageToEnvelope({ id: "m1", message: "hello", deviceId: "guest-1" }, { now: NOW });
    expect(result.errors).toEqual([]);
    expect(result.envelope?.lane).toBe("conversation");
    expect(result.envelope?.payload).toMatchObject({ kind: "message", text: "hello" });
    expect(validateLucaLinkEnvelope(result.envelope, { now: NOW }).valid).toBe(true);
  });

  it("maps registry sync to presence and mission sync to mission", () => {
    const registry = legacySyncToEnvelope({ type: "registry", devices: [] }, { now: NOW });
    expect(registry.envelope?.lane).toBe("presence");
    expect(registry.envelope?.payload).toMatchObject({ kind: "status", online: true });

    const mission = legacySyncToEnvelope({ type: "mission", missionId: "mission-1", summary: "gold egg" }, { now: NOW });
    expect(mission.envelope?.lane).toBe("mission");
    expect(mission.envelope?.payload).toMatchObject({ kind: "mission-state", missionId: "mission-1", summary: "gold egg" });
  });

  it("maps mission and SENSOR_PULSE payloads without executing content or accessing sensors", () => {
    const mission = legacyMissionToEnvelope({ missionId: "m-2", goldEgg: "summary only" }, { now: NOW });
    expect(mission.envelope?.lane).toBe("mission");
    expect(validateLucaLinkEnvelope(mission.envelope, { now: NOW }).valid).toBe(true);

    const sensor = legacySensorPulseToEnvelope({ deviceId: "sensor-1", temperature: 72 }, { now: NOW });
    expect(sensor.envelope?.lane).toBe("sensor");
    expect(sensor.envelope?.payload).toMatchObject({ kind: "iot-pulse", metadata: { temperature: 72 } });
    expect(validateLucaLinkEnvelope(sensor.envelope, { now: NOW }).valid).toBe(true);
  });

  it("maps guest and WebRTC events to non-executing observation envelopes", () => {
    expect(legacyEventToEnvelope("guest-message", { guestId: "g1", text: "hi" }, { now: NOW }).envelope?.lane).toBe("conversation");
    expect(legacyEventToEnvelope("guest-connected", { guestId: "g1" }, { now: NOW }).envelope?.lane).toBe("presence");
    expect(legacyEventToEnvelope("guest-disconnected", { guestId: "g1" }, { now: NOW }).envelope?.lane).toBe("presence");

    for (const eventName of ["webrtc-offer", "webrtc-answer", "webrtc-ice-candidate"] as const) {
      const result = legacyEventToEnvelope(eventName, { sdp: "diagnostic only" }, { now: NOW });
      expect(result.errors).toEqual([]);
      expect(result.envelope?.lane).toBe("notification");
      expect(result.envelope?.payload).toMatchObject({ kind: "alert" });
    }
  });

  it("returns a warning rather than throwing for unknown legacy events", () => {
    expect(() => legacyEventToEnvelope("mystery-event", { value: 1 }, { now: NOW })).not.toThrow();
    const result = legacyEventToEnvelope("mystery-event", { value: 1 }, { now: NOW });
    expect(result.envelope).toBeUndefined();
    expect(result.warnings.join(" ")).toContain("unknown LucaLink legacy event");
  });
});

describe("envelope to legacy reverse mapping", () => {
  it("maps conversation, mission, sensor, and notification envelopes to safe legacy-compatible objects", () => {
    const conversation = createLucaLinkEnvelope({
      id: "conv-1",
      lane: "conversation",
      type: "message",
      sourceDeviceId: "guest-1",
      targetDeviceId: "primary",
      timestamp: NOW,
      payload: { kind: "message", text: "hello" },
    });
    expect(envelopeToLegacyMessage(conversation, { now: NOW }).legacyMessage).toMatchObject({ event: "message", message: "hello" });

    const mission = createLucaLinkEnvelope({
      id: "mission-1",
      lane: "mission",
      type: "mission-state",
      sourceDeviceId: "desk-1",
      targetDeviceId: "primary",
      timestamp: NOW,
      payload: { kind: "mission-state", missionId: "m1" },
    });
    expect(envelopeToLegacyMessage(mission, { now: NOW }).legacyMessage).toMatchObject({ event: "sync", type: "mission" });

    const sensor = createLucaLinkEnvelope({
      id: "sensor-1",
      lane: "sensor",
      type: "iot-pulse",
      sourceDeviceId: "sensor-1",
      targetDeviceId: "primary",
      timestamp: NOW,
      payload: { kind: "iot-pulse", metadata: { ok: true } },
    });
    expect(envelopeToLegacyMessage(sensor, { now: NOW }).legacyMessage).toMatchObject({ event: "SENSOR_PULSE" });

    const notification = createLucaLinkEnvelope({
      id: "note-1",
      lane: "notification",
      type: "alert",
      sourceDeviceId: "desk-1",
      targetDeviceId: "primary",
      timestamp: NOW,
      payload: { kind: "alert", title: "diagnostic" },
    });
    expect(envelopeToLegacyMessage(notification, { now: NOW }).legacyMessage).toMatchObject({ event: "message", type: "notification" });
  });

  it("returns warning/error for unsupported reverse lanes", () => {
    const tool = createLucaLinkEnvelope({
      id: "tool-1",
      lane: "tool",
      type: "tool-request",
      sourceDeviceId: "desk-1",
      targetDeviceId: "primary",
      timestamp: NOW,
      payload: { kind: "tool-request", permission: "shell.execute" },
    });
    const result = envelopeToLegacyMessage(tool, { now: NOW });
    expect(result.legacyMessage).toBeUndefined();
    expect([...result.warnings, ...result.errors].join(" ")).toContain("no safe legacy reverse mapping");
  });
});

describe("legacy adapter module side effects", () => {
  it("does not touch browser/network/permission globals at import", async () => {
    const storage = { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn(), clear: vi.fn() };
    const fetchSpy = vi.fn();
    const permissions = { query: vi.fn() };
    vi.stubGlobal("localStorage", storage);
    vi.stubGlobal("sessionStorage", storage);
    vi.stubGlobal("fetch", fetchSpy);
    vi.stubGlobal("navigator", { permissions, mediaDevices: { getUserMedia: vi.fn() }, geolocation: { getCurrentPosition: vi.fn() } });

    vi.resetModules();
    await import("./lucaLinkLegacyAdapter");

    expect(storage.getItem).not.toHaveBeenCalled();
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(permissions.query).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});

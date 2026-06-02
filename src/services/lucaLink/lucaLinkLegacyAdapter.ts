/**
 * LucaLink Legacy Adapter (PR #189)
 *
 * Pure bridge between existing LucaLink runtime event/message/device shapes and
 * the typed LucaLink Mesh manifest/envelope foundation. This module adapts and
 * validates only: it never sends, blocks, stores, prompts, opens sockets, or
 * changes live runtime behavior.
 */

import { manifestFromLucaLinkDevice } from "./capabilityRegistry";
import type { LucaLinkPermissionCategory, LucaLinkSyncLaneId } from "./lucaLinkArchitectureMap";
import type { LucaHostManifest } from "./lucaHostManifest";
import {
  createLucaLinkEnvelope,
  isKnownLane,
  type LucaLinkConversationPayload,
  type LucaLinkEnvelope,
  type LucaLinkEnvelopeTarget,
  type LucaLinkMissionPayload,
  type LucaLinkNotificationPayload,
  type LucaLinkPresencePayload,
  type LucaLinkSensorPayload,
  type LucaLinkToolPayload,
  validateLucaLinkEnvelope,
} from "./lucaLinkSyncProtocol";

type UnknownRecord = Record<string, unknown>;

export type LucaLinkLegacyEventName =
  | "message"
  | "sync"
  | "registry"
  | "mission"
  | "SENSOR_PULSE"
  | "guest-connected"
  | "guest-message"
  | "desktop-to-guest"
  | "guest-disconnected"
  | "webrtc-offer"
  | "webrtc-answer"
  | "webrtc-ice-candidate"
  | "heartbeat"
  | "error"
  | "unknown";

export interface LucaLinkLegacyAdapterOptions {
  now?: number;
  sourceDeviceId?: string;
  targetDeviceId?: string | "primary" | "all" | "trusted" | "nearby";
  isPrimaryHost?: boolean;
}

export interface LucaLinkLegacyAdapterResult {
  envelope?: LucaLinkEnvelope;
  manifest?: LucaHostManifest;
  warnings: string[];
  errors: string[];
}

export interface LucaLinkLegacyDeviceLike {
  deviceId: string;
  name?: string;
  type?: string;
  lastSeen?: number;
  [key: string]: unknown;
}

export interface LucaLinkLegacyReverseResult {
  legacyMessage?: UnknownRecord;
  warnings: string[];
  errors: string[];
}

export interface LucaLinkLegacyEventInput {
  eventName?: string;
  payload?: unknown;
}

const LEGACY_EVENTS: ReadonlySet<LucaLinkLegacyEventName> = new Set([
  "message",
  "sync",
  "registry",
  "mission",
  "SENSOR_PULSE",
  "guest-connected",
  "guest-message",
  "desktop-to-guest",
  "guest-disconnected",
  "webrtc-offer",
  "webrtc-answer",
  "webrtc-ice-candidate",
  "heartbeat",
  "error",
  "unknown",
]);

const WEBRTC_EVENTS: ReadonlySet<LucaLinkLegacyEventName> = new Set([
  "webrtc-offer",
  "webrtc-answer",
  "webrtc-ice-candidate",
]);

const GUEST_EVENTS: ReadonlySet<LucaLinkLegacyEventName> = new Set([
  "guest-connected",
  "guest-message",
  "desktop-to-guest",
  "guest-disconnected",
]);

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function stringField(record: UnknownRecord, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return undefined;
}

function numberField(record: UnknownRecord, keys: readonly string[]): number | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return undefined;
}

function now(options: LucaLinkLegacyAdapterOptions): number {
  return options.now ?? Date.now();
}

function sourceDeviceId(payload: unknown, options: LucaLinkLegacyAdapterOptions): string {
  if (options.sourceDeviceId) return options.sourceDeviceId;
  if (isRecord(payload)) {
    return stringField(payload, ["sourceDeviceId", "deviceId", "from", "senderId", "guestId"]) ??
      "legacy-runtime";
  }
  return "legacy-runtime";
}

function targetDeviceId(payload: unknown, options: LucaLinkLegacyAdapterOptions): LucaLinkEnvelopeTarget {
  if (options.targetDeviceId) return options.targetDeviceId;
  if (isRecord(payload)) {
    return (
      stringField(payload, ["targetDeviceId", "targetId", "to", "recipientId", "guestId"]) ?? "primary"
    );
  }
  return "primary";
}

function makeEnvelopeId(lane: LucaLinkSyncLaneId, timestamp: number, type: string): string {
  const safeType = type.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
  return `ll-legacy-${lane}-${safeType}-${timestamp}`;
}

function validationResult(result: LucaLinkLegacyAdapterResult, options: LucaLinkLegacyAdapterOptions): LucaLinkLegacyAdapterResult {
  if (!result.envelope) return result;
  const validation = validateLucaLinkEnvelope(result.envelope, { now: options.now });
  return {
    ...result,
    warnings: [...result.warnings, ...validation.warnings],
    errors: [...result.errors, ...validation.errors],
  };
}

function createAdaptedEnvelope<TLane extends LucaLinkSyncLaneId>(
  lane: TLane,
  type: string,
  payload: Parameters<typeof createLucaLinkEnvelope<TLane>>[0]["payload"],
  legacyPayload: unknown,
  options: LucaLinkLegacyAdapterOptions,
): LucaLinkEnvelope {
  const timestamp = now(options);
  return createLucaLinkEnvelope({
    id: makeEnvelopeId(lane, timestamp, type),
    lane,
    type,
    sourceDeviceId: sourceDeviceId(legacyPayload, options),
    targetDeviceId: targetDeviceId(legacyPayload, options),
    timestamp,
    payload,
  });
}

function normalizeLegacyDevice(device: LucaLinkLegacyDeviceLike, options: LucaLinkLegacyAdapterOptions): Required<Pick<LucaLinkLegacyDeviceLike, "deviceId" | "name" | "type" | "lastSeen">> {
  return {
    deviceId: device.deviceId,
    name: device.name ?? device.deviceId,
    type: device.type ?? "unknown",
    lastSeen: typeof device.lastSeen === "number" ? device.lastSeen : now(options),
  };
}

export function legacyDeviceToManifest(
  device: LucaLinkLegacyDeviceLike,
  options: LucaLinkLegacyAdapterOptions = {},
): LucaLinkLegacyAdapterResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  if (!device?.deviceId) {
    return { warnings, errors: ["legacy device deviceId is required"] };
  }
  if (!device.type) warnings.push("legacy device type missing; defaulted to guest/unknown mapping");

  const manifest = manifestFromLucaLinkDevice(normalizeLegacyDevice(device, options), {
    isPrimaryHost: options.isPrimaryHost === true,
    now: options.now,
  });
  return { manifest, warnings, errors };
}

export function legacyDevicesToManifests(
  devices: readonly LucaLinkLegacyDeviceLike[],
  options: LucaLinkLegacyAdapterOptions = {},
): LucaLinkLegacyAdapterResult[] {
  return devices.map((device) => legacyDeviceToManifest(device, options));
}

function hasAnyKey(record: UnknownRecord, keys: readonly string[]): boolean {
  return keys.some((key) => key in record);
}

function isToolLike(record: UnknownRecord): boolean {
  const type = stringField(record, ["type", "kind", "event"])?.toLowerCase() ?? "";
  return (
    /tool|shell|command|execute|browser-control|code|git|filesystem/.test(type) ||
    hasAnyKey(record, ["toolId", "toolName", "permission", "args", "command", "shell"])
  );
}

function isRegistryLike(record: UnknownRecord): boolean {
  const type = stringField(record, ["type", "kind", "event"])?.toLowerCase() ?? "";
  return type === "registry" || type === "presence" || hasAnyKey(record, ["devices", "connectedDevices", "registry"]);
}

function textFromPayload(record: UnknownRecord): string | undefined {
  const direct = stringField(record, ["text", "message", "content", "body"]);
  if (direct) return direct;
  const nested = record.payload;
  if (isRecord(nested)) return textFromPayload(nested);
  return undefined;
}

export function classifyLegacyEvent(eventName: string, payload?: unknown): LucaLinkLegacyEventName {
  if (LEGACY_EVENTS.has(eventName as LucaLinkLegacyEventName)) return eventName as LucaLinkLegacyEventName;
  if (eventName === "") return "unknown";
  if (eventName.toLowerCase() === "sensor_pulse") return "SENSOR_PULSE";
  if (isRecord(payload)) {
    const type = stringField(payload, ["type", "event", "kind"]);
    if (type && LEGACY_EVENTS.has(type as LucaLinkLegacyEventName)) return type as LucaLinkLegacyEventName;
  }
  return "unknown";
}

export function legacyMessageToEnvelope(
  message: unknown,
  options: LucaLinkLegacyAdapterOptions = {},
): LucaLinkLegacyAdapterResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  if (!isRecord(message)) {
    return { warnings, errors: ["legacy message must be an object"] };
  }

  const type = stringField(message, ["type", "kind", "event"])?.toLowerCase();
  if (type === "sync" || isRegistryLike(message)) return legacySyncToEnvelope(message, options);
  if (type === "mission") return legacyMissionToEnvelope(message, options);
  if (type === "sensor_pulse" || type === "sensor-pulse") return legacySensorPulseToEnvelope(message, options);
  if (isToolLike(message)) {
    const payload: LucaLinkToolPayload = {
      kind: "tool-request",
      toolId: stringField(message, ["toolId", "toolName"]),
      permission: stringField(message, ["permission"]) as LucaLinkPermissionCategory | undefined,
      args: isRecord(message.args) ? message.args : { legacyPayload: message },
    };
    return validationResult(
      { envelope: createAdaptedEnvelope("tool", "tool-request", payload, message, options), warnings, errors },
      options,
    );
  }

  if (!textFromPayload(message)) warnings.push("legacy message had no text/content field; defaulted to conversation lane");
  const payload: LucaLinkConversationPayload = {
    kind: "message",
    threadId: stringField(message, ["threadId", "roomId", "sessionId"]),
    messageId: stringField(message, ["messageId", "id"]),
    text: textFromPayload(message),
    role: (stringField(message, ["role"]) as LucaLinkConversationPayload["role"]) ?? "user",
  };
  return validationResult(
    { envelope: createAdaptedEnvelope("conversation", "message", payload, message, options), warnings, errors },
    options,
  );
}

export function legacySyncToEnvelope(
  sync: unknown,
  options: LucaLinkLegacyAdapterOptions = {},
): LucaLinkLegacyAdapterResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  if (!isRecord(sync)) return { warnings, errors: ["legacy sync payload must be an object"] };
  const type = stringField(sync, ["type", "kind", "event"]);
  if (type === "mission") return legacyMissionToEnvelope(sync, options);

  if (type === "registry" || isRegistryLike(sync)) {
    const payload: LucaLinkPresencePayload = {
      kind: "status",
      online: true,
      lastSeen: numberField(sync, ["lastSeen", "timestamp"]) ?? now(options),
      activeAppState: "unknown",
    };
    return validationResult(
      { envelope: createAdaptedEnvelope("presence", "status", payload, sync, options), warnings, errors },
      options,
    );
  }

  warnings.push(`unknown legacy sync type${type ? ` ${type}` : ""}; mapped to notification lane for observation`);
  const payload: LucaLinkNotificationPayload = {
    kind: "progress",
    title: "Legacy sync event",
    body: type ? `Unknown sync type: ${type}` : "Unknown sync payload",
    severity: "info",
  };
  return validationResult(
    { envelope: createAdaptedEnvelope("notification", "progress", payload, sync, options), warnings, errors },
    options,
  );
}

export function legacyMissionToEnvelope(
  payloadValue: unknown,
  options: LucaLinkLegacyAdapterOptions = {},
): LucaLinkLegacyAdapterResult {
  const source = isRecord(payloadValue) ? payloadValue : {};
  const kindHint = stringField(source, ["kind", "missionKind", "handoffReason"]);
  const missionPayload: LucaLinkMissionPayload = {
    kind: kindHint === "mission-handoff" || source.handoff === true ? "mission-handoff" : "mission-state",
    missionId: stringField(source, ["missionId", "id"]),
    status: stringField(source, ["status"]) as LucaLinkMissionPayload["status"],
    progress: numberField(source, ["progress"]),
    summary: stringField(source, ["summary", "goldEgg", "title"]),
  };
  return validationResult(
    { envelope: createAdaptedEnvelope("mission", missionPayload.kind, missionPayload, payloadValue, options), warnings: [], errors: [] },
    options,
  );
}

export function legacySensorPulseToEnvelope(
  payloadValue: unknown,
  options: LucaLinkLegacyAdapterOptions = {},
): LucaLinkLegacyAdapterResult {
  const source = isRecord(payloadValue) ? payloadValue : {};
  const kind = stringField(source, ["kind", "sensorKind"]);
  const knownKind = kind && ["camera-frame", "mic-chunk", "screen-context", "location", "motion", "iot-pulse"].includes(kind)
    ? (kind as LucaLinkSensorPayload["kind"])
    : "iot-pulse";
  const sensorPayload: LucaLinkSensorPayload = {
    kind: knownKind,
    mediaRef: stringField(source, ["mediaRef"]),
    mimeType: stringField(source, ["mimeType"]),
    sampleRate: numberField(source, ["sampleRate"]),
    metadata: { ...source },
  };
  return validationResult(
    { envelope: createAdaptedEnvelope("sensor", sensorPayload.kind, sensorPayload, payloadValue, options), warnings: [], errors: [] },
    options,
  );
}

export function legacyGuestEventToEnvelope(
  eventName: LucaLinkLegacyEventName,
  payload: unknown,
  options: LucaLinkLegacyAdapterOptions = {},
): LucaLinkLegacyAdapterResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  if (!GUEST_EVENTS.has(eventName)) return { warnings, errors: [`${eventName} is not a guest legacy event`] };
  const source = isRecord(payload) ? payload : {};

  if (eventName === "guest-connected" || eventName === "guest-disconnected") {
    const online = eventName === "guest-connected";
    const presence: LucaLinkPresencePayload = {
      kind: online ? "online" : "offline",
      online,
      lastSeen: numberField(source, ["lastSeen", "timestamp"]) ?? now(options),
      activeAppState: "unknown",
    };
    return validationResult(
      { envelope: createAdaptedEnvelope("presence", presence.kind, presence, payload, options), warnings, errors },
      options,
    );
  }

  if (isToolLike(source) || stringField(source, ["lane"]) === "memory" || stringField(source, ["lane"]) === "safety") {
    warnings.push("guest event requested a restricted memory/tool/safety shape; kept as conversation for observation only");
  }
  const conversation: LucaLinkConversationPayload = {
    kind: "message",
    threadId: stringField(source, ["threadId", "sessionId", "guestId"]),
    messageId: stringField(source, ["messageId", "id"]),
    text: textFromPayload(source) ?? stringField(source, ["event"]),
    role: eventName === "desktop-to-guest" ? "assistant" : "user",
  };
  return validationResult(
    { envelope: createAdaptedEnvelope("conversation", "message", conversation, payload, options), warnings, errors },
    options,
  );
}

export function legacyWebRtcEventToEnvelope(
  eventName: LucaLinkLegacyEventName,
  payload: unknown,
  options: LucaLinkLegacyAdapterOptions = {},
): LucaLinkLegacyAdapterResult {
  if (!WEBRTC_EVENTS.has(eventName)) return { warnings: [], errors: [`${eventName} is not a WebRTC legacy event`] };
  const notification: LucaLinkNotificationPayload = {
    kind: "alert",
    title: "Legacy WebRTC signaling event",
    body: `${eventName} observed for diagnostics only`,
    severity: "info",
  };
  return validationResult(
    { envelope: createAdaptedEnvelope("notification", "alert", notification, payload, options), warnings: [], errors: [] },
    options,
  );
}

export function legacyEventToEnvelope(
  eventName: string,
  payload: unknown,
  options: LucaLinkLegacyAdapterOptions = {},
): LucaLinkLegacyAdapterResult {
  const classified = classifyLegacyEvent(eventName, payload);
  switch (classified) {
    case "message":
      return legacyMessageToEnvelope(payload, options);
    case "sync":
    case "registry":
    case "heartbeat":
      return legacySyncToEnvelope({ ...(isRecord(payload) ? payload : {}), type: classified === "heartbeat" ? "heartbeat" : stringField(isRecord(payload) ? payload : {}, ["type"]) ?? "registry" }, options);
    case "mission":
      return legacyMissionToEnvelope(payload, options);
    case "SENSOR_PULSE":
      return legacySensorPulseToEnvelope(payload, options);
    case "guest-connected":
    case "guest-message":
    case "desktop-to-guest":
    case "guest-disconnected":
      return legacyGuestEventToEnvelope(classified, payload, options);
    case "webrtc-offer":
    case "webrtc-answer":
    case "webrtc-ice-candidate":
      return legacyWebRtcEventToEnvelope(classified, payload, options);
    case "error": {
      const notification: LucaLinkNotificationPayload = { kind: "alert", title: "Legacy LucaLink error", body: isRecord(payload) ? textFromPayload(payload) : undefined, severity: "warning" };
      return validationResult({ envelope: createAdaptedEnvelope("notification", "alert", notification, payload, options), warnings: [], errors: [] }, options);
    }
    case "unknown":
    default:
      return { warnings: [`unknown LucaLink legacy event "${eventName}"; no envelope produced`], errors: [] };
  }
}

export function envelopeToLegacyMessage(
  envelope: LucaLinkEnvelope,
  _options: LucaLinkLegacyAdapterOptions = {},
): LucaLinkLegacyReverseResult {
  const validation = validateLucaLinkEnvelope(envelope, { now: _options.now });
  const warnings = [...validation.warnings];
  const errors = [...validation.errors];
  if (!validation.valid) return { warnings, errors };

  switch (envelope.lane) {
    case "conversation":
      return {
        legacyMessage: {
          event: "message",
          type: "message",
          deviceId: envelope.sourceDeviceId,
          targetDeviceId: envelope.targetDeviceId,
          timestamp: envelope.timestamp,
          message: (envelope.payload as LucaLinkConversationPayload).text,
          payload: envelope.payload,
        },
        warnings,
        errors,
      };
    case "mission":
      return {
        legacyMessage: {
          event: "sync",
          type: "mission",
          deviceId: envelope.sourceDeviceId,
          targetDeviceId: envelope.targetDeviceId,
          timestamp: envelope.timestamp,
          mission: envelope.payload,
          payload: envelope.payload,
        },
        warnings,
        errors,
      };
    case "sensor":
      return {
        legacyMessage: {
          event: "SENSOR_PULSE",
          type: "SENSOR_PULSE",
          deviceId: envelope.sourceDeviceId,
          targetDeviceId: envelope.targetDeviceId,
          timestamp: envelope.timestamp,
          pulse: envelope.payload,
          payload: envelope.payload,
        },
        warnings,
        errors,
      };
    case "notification":
      return {
        legacyMessage: {
          event: "message",
          type: "notification",
          deviceId: envelope.sourceDeviceId,
          targetDeviceId: envelope.targetDeviceId,
          timestamp: envelope.timestamp,
          payload: envelope.payload,
        },
        warnings,
        errors,
      };
    default:
      if (isKnownLane(envelope.lane)) warnings.push(`lane ${envelope.lane} has no safe legacy reverse mapping`);
      else errors.push("unsupported or unknown LucaLink envelope lane");
      return { warnings, errors };
  }
}

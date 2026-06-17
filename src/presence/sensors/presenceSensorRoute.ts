import type { PresenceCapabilityStatus, PresenceSensorState } from "../presenceTypes";
import type {
  PresenceSensorDisclosure,
  PresenceSensorKind,
  PresenceSensorRouteEnvelope,
  PresenceSensorRouteState,
  PresenceSensorStatus,
} from "./presenceSensorTypes";

const SENSOR_KINDS = new Set(["microphone", "screen", "camera", "vision", "clipboard", "file", "filesystem", "browser", "location"]);
const ACTIVE_STATUSES = new Set(["active", "listening", "recording", "capturing", "enabled", "requesting"]);
const DISCLOSURE_STATUSES = new Set(["active", "listening", "recording", "capturing", "requesting"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function maybeNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function getPresenceSensorKind(payload: unknown, fallback: PresenceSensorKind = "microphone"): PresenceSensorKind {
  if (typeof payload === "string") return SENSOR_KINDS.has(payload) ? (payload as PresenceSensorKind) : fallback;
  if (!isRecord(payload)) return fallback;
  const value = payload.kind ?? payload.sensor ?? payload.sensorKind ?? payload.type;
  return typeof value === "string" ? (value as PresenceSensorKind) : fallback;
}

export function getPresenceSensorStatus(payload: unknown): PresenceSensorStatus | undefined {
  if (typeof payload === "string") return payload as PresenceSensorStatus;
  if (!isRecord(payload)) return undefined;
  const value = payload.status ?? payload.state;
  if (typeof value === "string") return value as PresenceSensorStatus;
  if (payload.active === true || payload.enabled === true) return "active";
  if (payload.active === false || payload.enabled === false) return "inactive";
  return undefined;
}

export function isPresenceSensorActive(payload: unknown): boolean {
  if (isRecord(payload)) {
    if (typeof payload.active === "boolean") return payload.active;
    if (typeof payload.enabled === "boolean") return payload.enabled;
    if (payload.isListening === true || payload.isVadActive === true || payload.isScreenActive === true) return true;
  }
  const status = getPresenceSensorStatus(payload);
  return typeof status === "string" && ACTIVE_STATUSES.has(status);
}

export function requiresPresenceSensorDisclosure(payload: unknown): boolean {
  if (isRecord(payload) && typeof payload.requiresDisclosure === "boolean") return payload.requiresDisclosure;
  if (isRecord(payload) && typeof payload.isDisclosed === "boolean") return payload.isDisclosed;
  const status = getPresenceSensorStatus(payload);
  return isPresenceSensorActive(payload) || (typeof status === "string" && DISCLOSURE_STATUSES.has(status));
}

export function createPresenceSensorDisclosure(payload: unknown = {}, fallbackKind?: PresenceSensorKind): PresenceSensorDisclosure {
  const source = isRecord(payload) ? { ...payload } : {};
  const kind = getPresenceSensorKind(payload, fallbackKind ?? "microphone");
  const status = getPresenceSensorStatus(payload);
  const active = typeof source.active === "boolean" ? source.active : isPresenceSensorActive(payload);
  return {
    ...source,
    kind,
    ...(active !== undefined ? { active } : {}),
    ...(typeof source.enabled === "boolean" ? { enabled: source.enabled } : {}),
    ...(status ? { status } : {}),
    ...(typeof source.timestamp === "number" ? { timestamp: maybeNumber(source.timestamp) } : {}),
    requiresDisclosure: requiresPresenceSensorDisclosure({ ...source, status, active }),
  };
}

export function createPresenceSensorRouteState(payload: unknown = {}): PresenceSensorRouteState {
  if (!isRecord(payload)) return {};
  const state: PresenceSensorRouteState = { ...payload };
  for (const kind of ["microphone", "screen", "camera", "vision", "clipboard", "file", "filesystem", "browser", "location"] as const) {
    const value = payload[kind];
    if (value !== undefined) state[kind] = createPresenceSensorDisclosure(value, kind);
  }
  if (Array.isArray(payload.disclosures)) {
    state.disclosures = payload.disclosures.map((item) => createPresenceSensorDisclosure(item));
  }
  return state;
}

export function createPresenceSensorRouteEnvelope(payload: unknown = {}): PresenceSensorRouteEnvelope {
  const record = isRecord(payload) ? { ...payload } : {};
  const state = createPresenceSensorRouteState(record.state ?? record);
  return {
    ...record,
    schemaVersion: 1,
    route: "presence.sensor.disclosure",
    state,
    timestamp: maybeNumber(record.timestamp) ?? maybeNumber(state.timestamp),
  };
}

export function mergePresenceSensorDisclosure(
  prev: PresenceSensorDisclosure | undefined,
  next: Partial<PresenceSensorDisclosure> | unknown,
): PresenceSensorDisclosure {
  const normalizedNext = createPresenceSensorDisclosure(next, prev?.kind);
  return { ...(prev ?? {}), ...normalizedNext, metadata: { ...(prev?.metadata ?? {}), ...(normalizedNext.metadata ?? {}) } };
}

export function toLegacySensorDisclosure(
  disclosure: PresenceSensorDisclosure,
  legacyPayload: Record<string, unknown> = {},
): Record<string, unknown> {
  return { ...legacyPayload, ...disclosure };
}

export function createPresenceSensorRouteStateFromPresenceSensors(sensors: Partial<PresenceSensorState>): PresenceSensorRouteState {
  return Object.fromEntries(
    Object.entries(sensors).map(([kind, status]) => [
      kind,
      createPresenceSensorDisclosure({ kind, status, active: status === "active" }, kind as PresenceSensorKind),
    ]),
  ) as PresenceSensorRouteState;
}

export function toPresenceCapabilityStatus(status: PresenceSensorStatus | undefined): PresenceCapabilityStatus {
  const capabilityStatuses: PresenceCapabilityStatus[] = ["available", "requesting", "active", "blocked", "error", "unavailable"];
  if (capabilityStatuses.includes(status as PresenceCapabilityStatus)) {
    return status as PresenceCapabilityStatus;
  }
  if (status === "enabled") return "active";
  return "unavailable";
}

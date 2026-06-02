/**
 * LucaLink Multi-Host Connection Model (PR #201)
 *
 * Pure, model-first host connection classification for LucaLink's adaptive host
 * mesh. This module performs no socket, network, storage, permission, file,
 * shell, browser, generated-code, payment, or physical-world actions.
 */

export type LucaLinkHostClass =
  | "primary-host"
  | "companion-host"
  | "execution-host"
  | "display-host"
  | "watch-host"
  | "tv-host"
  | "web-display-host"
  | "guest-host"
  | "sensor-host"
  | "electronics-host"
  | "embodied-host"
  | "unknown-host";

export type LucaLinkHostConnectionClass =
  | "relay-socket"
  | "local-lan"
  | "vpn"
  | "webrtc"
  | "web-display"
  | "guest-web"
  | "companion-bridge"
  | "nearby-ble"
  | "sensor-stream"
  | "electronics-bridge"
  | "embodied-bridge"
  | "offline-cached"
  | "unknown";

export type LucaLinkHostRuntimeSurface =
  | "native-desktop"
  | "native-mobile"
  | "browser"
  | "kiosk-browser"
  | "smart-watch"
  | "smart-tv"
  | "smart-electronics"
  | "embedded-linux"
  | "python-runtime"
  | "node-runtime"
  | "electron-runtime"
  | "iot-api"
  | "mqtt"
  | "matter-like"
  | "ros-like"
  | "serial"
  | "camera-stream"
  | "sensor-stream"
  | "unknown";

export type LucaLinkHostReachability =
  | "online"
  | "nearby"
  | "relay-reachable"
  | "local-reachable"
  | "limited"
  | "offline"
  | "unknown";

export type LucaLinkHostPresenceCapability =
  | "user-present-strong"
  | "user-present-weak"
  | "display-only"
  | "sensor-only"
  | "unattended"
  | "public-surface"
  | "unknown";

export type LucaLinkHostApprovalCapability =
  | "none"
  | "display-only"
  | "deny-only"
  | "low-risk"
  | "low-medium-risk"
  | "high-risk-with-primary-host-escalation"
  | "primary-host-only";

export type LucaLinkHostConnectionRisk = "low" | "medium" | "high" | "critical";

export interface LucaLinkHostConnectionRecord {
  id: string;
  deviceId?: string;
  displayName: string;
  hostClass: LucaLinkHostClass;
  connectionClass: LucaLinkHostConnectionClass;
  runtimeSurfaces: LucaLinkHostRuntimeSurface[];
  reachability: LucaLinkHostReachability;
  presenceCapability: LucaLinkHostPresenceCapability;
  approvalCapability: LucaLinkHostApprovalCapability;
  connectionRisk: LucaLinkHostConnectionRisk;
  trustLevel?: string;
  deviceRole?: string;
  status?: string;
  canDisplay: boolean;
  canApprove: boolean;
  canExecute: boolean;
  canSense: boolean;
  canActPhysically: boolean;
  canReceiveHandoff: boolean;
  canHostLucaUi: boolean;
  connectionEvidence: string[];
  capabilityEvidence: string[];
  limitations: string[];
  warnings: string[];
  errors: string[];
  createdAt: number;
  updatedAt: number;
  lastSeenAt?: number;
}

export interface LucaLinkHostConnectionInput {
  id?: string;
  deviceId?: string;
  displayName?: string;
  name?: string;
  deviceType?: string;
  type?: string;
  hostClass?: LucaLinkHostClass;
  connectionClass?: LucaLinkHostConnectionClass;
  runtimeSurfaces?: Array<LucaLinkHostRuntimeSurface | string>;
  reachability?: LucaLinkHostReachability;
  presenceCapability?: LucaLinkHostPresenceCapability;
  approvalCapability?: LucaLinkHostApprovalCapability;
  trustLevel?: string;
  deviceRole?: string;
  role?: string;
  status?: string;
  capabilities?: string[];
  connectionEvidence?: string[];
  capabilityEvidence?: string[];
  limitations?: string[];
  warnings?: string[];
  errors?: string[];
  isCurrentPrimaryHost?: boolean;
  lastSeenAt?: number;
  lastSeen?: number;
  publicSurface?: boolean;
  userPresent?: boolean;
  canDisplay?: boolean;
  canApprove?: boolean;
  canExecute?: boolean;
  canSense?: boolean;
  canActPhysically?: boolean;
  canReceiveHandoff?: boolean;
  canHostLucaUi?: boolean;
}

export interface LucaLinkHostConnectionRegistryState {
  records: LucaLinkHostConnectionRecord[];
  maxRecords: number;
}

export interface LucaLinkHostConnectionRegistrySummary {
  total: number;
  online: number;
  displayHosts: number;
  approvalCapable: number;
  executionHosts: number;
  sensorHosts: number;
  embodiedHosts: number;
  publicSurfaces: number;
  unknownHosts: number;
  byHostClass: Record<LucaLinkHostClass, number>;
  byConnectionClass: Record<LucaLinkHostConnectionClass, number>;
  byRisk: Record<LucaLinkHostConnectionRisk, number>;
  warnings: string[];
}

const HOST_CLASSES: LucaLinkHostClass[] = [
  "primary-host",
  "companion-host",
  "execution-host",
  "display-host",
  "watch-host",
  "tv-host",
  "web-display-host",
  "guest-host",
  "sensor-host",
  "electronics-host",
  "embodied-host",
  "unknown-host",
];
const CONNECTION_CLASSES: LucaLinkHostConnectionClass[] = [
  "relay-socket",
  "local-lan",
  "vpn",
  "webrtc",
  "web-display",
  "guest-web",
  "companion-bridge",
  "nearby-ble",
  "sensor-stream",
  "electronics-bridge",
  "embodied-bridge",
  "offline-cached",
  "unknown",
];
const RISKS: LucaLinkHostConnectionRisk[] = [
  "low",
  "medium",
  "high",
  "critical",
];
const RUNTIME_SURFACES: LucaLinkHostRuntimeSurface[] = [
  "native-desktop",
  "native-mobile",
  "browser",
  "kiosk-browser",
  "smart-watch",
  "smart-tv",
  "smart-electronics",
  "embedded-linux",
  "python-runtime",
  "node-runtime",
  "electron-runtime",
  "iot-api",
  "mqtt",
  "matter-like",
  "ros-like",
  "serial",
  "camera-stream",
  "sensor-stream",
  "unknown",
];

function normalize(value?: string | null): string {
  return (value ?? "").trim().toLowerCase();
}

function evidenceText(input: LucaLinkHostConnectionInput): string {
  return [
    input.deviceType,
    input.type,
    input.displayName,
    input.name,
    input.deviceRole,
    input.role,
    ...(input.runtimeSurfaces ?? []),
    ...(input.capabilities ?? []),
    ...(input.connectionEvidence ?? []),
  ]
    .map(String)
    .join(" ")
    .toLowerCase();
}

function includesAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

function unique<T extends string>(values: T[]): T[] {
  return [...new Set(values)].filter(Boolean) as T[];
}

function countMap<T extends string>(keys: T[]): Record<T, number> {
  return Object.fromEntries(keys.map((key) => [key, 0])) as Record<T, number>;
}

function isTrustedForApproval(trustLevel?: string): boolean {
  return ["trusted", "admin", "owner"].includes(normalize(trustLevel));
}

export function inferLucaLinkHostClass(
  input: LucaLinkHostConnectionInput,
): LucaLinkHostClass {
  if (input.hostClass) return input.hostClass;
  const text = evidenceText(input);
  const role = normalize(input.deviceRole ?? input.role);
  if (input.isCurrentPrimaryHost || role === "primary-host")
    return "primary-host";
  if (includesAny(text, ["guest"])) return "guest-host";
  if (includesAny(text, ["watch", "wearable"])) return "watch-host";
  if (includesAny(text, ["smart tv", "television", "tv ", " tv", "projector"]))
    return "tv-host";
  if (
    includesAny(text, [
      "kiosk",
      "big display",
      "display screen",
      "nyc display",
      "web display",
    ])
  )
    return "web-display-host";
  if (
    includesAny(text, [
      "robot",
      "drone",
      "humanoid",
      "embodied",
      "ros",
      "actuator",
    ])
  )
    return "embodied-host";
  if (includesAny(text, ["sensor", "camera", "stream", "temperature", "lidar"]))
    return "sensor-host";
  if (
    includesAny(text, [
      "iot",
      "mqtt",
      "matter",
      "electronics",
      "smart home",
      "appliance",
    ])
  )
    return "electronics-host";
  if (
    includesAny(text, ["phone", "mobile", "tablet", "ipad", "android", "ios"])
  )
    return "companion-host";
  if (includesAny(text, ["browser", "web"]))
    return normalize(input.trustLevel) === "guest"
      ? "guest-host"
      : "web-display-host";
  if (
    includesAny(text, [
      "desktop",
      "laptop",
      "mac",
      "windows",
      "linux",
      "electron",
      "node",
    ])
  )
    return "execution-host";
  return "unknown-host";
}

export function inferLucaLinkHostConnectionClass(
  input: LucaLinkHostConnectionInput,
): LucaLinkHostConnectionClass {
  if (input.connectionClass) return input.connectionClass;
  const text = evidenceText(input);
  const hostClass = inferLucaLinkHostClass(input);
  if (hostClass === "guest-host")
    return includesAny(text, ["webrtc"]) ? "webrtc" : "guest-web";
  if (includesAny(text, ["vpn"])) return "vpn";
  if (includesAny(text, ["ble", "bluetooth", "nearby"])) return "nearby-ble";
  if (includesAny(text, ["local", "lan"])) return "local-lan";
  if (includesAny(text, ["webrtc"])) return "webrtc";
  if (includesAny(text, ["mqtt"])) return "electronics-bridge";
  if (includesAny(text, ["matter", "iot", "electronics"]))
    return "electronics-bridge";
  if (includesAny(text, ["ros", "robot", "drone", "humanoid", "embodied"]))
    return "embodied-bridge";
  if (includesAny(text, ["sensor", "camera", "stream"])) return "sensor-stream";
  if (["watch-host", "companion-host"].includes(hostClass))
    return "companion-bridge";
  if (["tv-host", "web-display-host", "display-host"].includes(hostClass))
    return "web-display";
  if (includesAny(text, ["offline", "cached"])) return "offline-cached";
  if (includesAny(text, ["relay", "socket"])) return "relay-socket";
  return hostClass === "unknown-host" ? "unknown" : "relay-socket";
}

export function inferLucaLinkRuntimeSurfaces(
  input: LucaLinkHostConnectionInput,
): LucaLinkHostRuntimeSurface[] {
  const explicit = (input.runtimeSurfaces ?? []).filter(
    (surface): surface is LucaLinkHostRuntimeSurface =>
      RUNTIME_SURFACES.includes(surface as LucaLinkHostRuntimeSurface),
  );
  const text = evidenceText(input);
  const surfaces: LucaLinkHostRuntimeSurface[] = [...explicit];
  if (includesAny(text, ["desktop", "laptop", "mac", "windows"]))
    surfaces.push("native-desktop");
  if (includesAny(text, ["mobile", "phone", "tablet", "ios", "android"]))
    surfaces.push("native-mobile");
  if (includesAny(text, ["kiosk"])) surfaces.push("kiosk-browser");
  else if (includesAny(text, ["browser", "web", "display screen"]))
    surfaces.push("browser");
  if (includesAny(text, ["watch", "wearable"])) surfaces.push("smart-watch");
  if (includesAny(text, ["tv", "television", "projector"]))
    surfaces.push("smart-tv");
  if (includesAny(text, ["iot", "electronics", "appliance"]))
    surfaces.push("smart-electronics", "iot-api");
  if (includesAny(text, ["embedded", "raspberry", "linux board"]))
    surfaces.push("embedded-linux");
  if (includesAny(text, ["python"])) surfaces.push("python-runtime");
  if (includesAny(text, ["node"])) surfaces.push("node-runtime");
  if (includesAny(text, ["electron"])) surfaces.push("electron-runtime");
  if (includesAny(text, ["mqtt"])) surfaces.push("mqtt");
  if (includesAny(text, ["matter"])) surfaces.push("matter-like");
  if (includesAny(text, ["ros", "robot", "drone", "humanoid"]))
    surfaces.push("ros-like");
  if (includesAny(text, ["serial", "uart", "usb"])) surfaces.push("serial");
  if (includesAny(text, ["camera"])) surfaces.push("camera-stream");
  if (includesAny(text, ["sensor", "stream"])) surfaces.push("sensor-stream");
  return unique(surfaces).length ? unique(surfaces) : ["unknown"];
}

export function inferLucaLinkReachability(
  input: LucaLinkHostConnectionInput,
): LucaLinkHostReachability {
  if (input.reachability) return input.reachability;
  const status = normalize(input.status);
  const text = evidenceText(input);
  if (status === "connected" || status === "online") return "online";
  if (includesAny(text, ["nearby", "ble", "bluetooth"])) return "nearby";
  if (includesAny(text, ["relay", "socket"])) return "relay-reachable";
  if (includesAny(text, ["local", "lan"])) return "local-reachable";
  if (status === "disconnected" || status === "offline") return "offline";
  if (status === "guest" || includesAny(text, ["guest", "limited"]))
    return "limited";
  return "unknown";
}

export function inferLucaLinkPresenceCapability(
  input: LucaLinkHostConnectionInput,
): LucaLinkHostPresenceCapability {
  if (input.presenceCapability) return input.presenceCapability;
  const text = evidenceText(input);
  const hostClass = inferLucaLinkHostClass(input);
  if (
    input.publicSurface ||
    includesAny(text, ["public", "kiosk", "nyc display", "shared tv"])
  )
    return "public-surface";
  if (["sensor-host", "electronics-host"].includes(hostClass))
    return hostClass === "sensor-host" ? "sensor-only" : "unattended";
  if (["tv-host", "web-display-host", "display-host"].includes(hostClass))
    return "display-only";
  if (input.userPresent === true || input.isCurrentPrimaryHost)
    return "user-present-strong";
  if (["companion-host", "watch-host"].includes(hostClass))
    return "user-present-weak";
  if (hostClass === "embodied-host") return "unattended";
  return hostClass === "unknown-host" ? "unknown" : "user-present-weak";
}

export function deriveLucaLinkApprovalCapability(
  input: LucaLinkHostConnectionInput,
): LucaLinkHostApprovalCapability {
  if (input.approvalCapability) return input.approvalCapability;
  const hostClass = inferLucaLinkHostClass(input);
  const presence = inferLucaLinkPresenceCapability(input);
  const trust = normalize(input.trustLevel);
  if (hostClass === "primary-host" && trust === "owner")
    return "primary-host-only";
  if (
    ["guest-host", "sensor-host", "unknown-host", "embodied-host"].includes(
      hostClass,
    )
  )
    return "none";
  if (
    ["tv-host", "web-display-host", "display-host"].includes(hostClass) ||
    presence === "public-surface" ||
    presence === "display-only"
  )
    return "display-only";
  if (hostClass === "watch-host")
    return trust === "admin" || trust === "owner"
      ? "low-medium-risk"
      : "low-risk";
  if (
    hostClass === "companion-host" &&
    isTrustedForApproval(trust) &&
    presence === "user-present-strong"
  )
    return trust === "owner" || trust === "admin"
      ? "high-risk-with-primary-host-escalation"
      : "low-medium-risk";
  if (hostClass === "execution-host" && isTrustedForApproval(trust))
    return "low-medium-risk";
  return "none";
}

export function deriveLucaLinkDisplayCapability(
  input: LucaLinkHostConnectionInput,
): boolean {
  if (input.canDisplay !== undefined) return input.canDisplay;
  return [
    "primary-host",
    "companion-host",
    "display-host",
    "watch-host",
    "tv-host",
    "web-display-host",
    "guest-host",
    "execution-host",
  ].includes(inferLucaLinkHostClass(input));
}

export function deriveLucaLinkExecutionCapability(
  input: LucaLinkHostConnectionInput,
): boolean {
  if (input.canExecute !== undefined) return input.canExecute;
  const hostClass = inferLucaLinkHostClass(input);
  const trust = normalize(input.trustLevel);
  return (
    ["primary-host", "execution-host"].includes(hostClass) &&
    ["trusted", "admin", "owner"].includes(trust)
  );
}

export function deriveLucaLinkSensorCapability(
  input: LucaLinkHostConnectionInput,
): boolean {
  if (input.canSense !== undefined) return input.canSense;
  const hostClass = inferLucaLinkHostClass(input);
  const surfaces = inferLucaLinkRuntimeSurfaces(input);
  return (
    ["sensor-host", "electronics-host", "embodied-host"].includes(hostClass) ||
    surfaces.some((surface) =>
      [
        "camera-stream",
        "sensor-stream",
        "ros-like",
        "mqtt",
        "iot-api",
      ].includes(surface),
    )
  );
}

export function deriveLucaLinkPhysicalActionCapability(
  input: LucaLinkHostConnectionInput,
): boolean {
  void input;
  return false;
}

export function deriveLucaLinkHandoffCapability(
  input: LucaLinkHostConnectionInput,
): boolean {
  if (input.canReceiveHandoff !== undefined) return input.canReceiveHandoff;
  const hostClass = inferLucaLinkHostClass(input);
  return ![
    "guest-host",
    "sensor-host",
    "electronics-host",
    "unknown-host",
  ].includes(hostClass);
}

function deriveRisk(
  input: LucaLinkHostConnectionInput,
): LucaLinkHostConnectionRisk {
  const hostClass = inferLucaLinkHostClass(input);
  const trust = normalize(input.trustLevel);
  const warnings = input.warnings ?? [];
  const errors = input.errors ?? [];
  if (errors.length || trust === "blocked" || trust === "revoked")
    return "critical";
  if (hostClass === "embodied-host") return "high";
  if (hostClass === "unknown-host")
    return warnings.length || evidenceText(input).trim() ? "high" : "medium";
  if (
    ["guest-host", "electronics-host"].includes(hostClass) ||
    inferLucaLinkPresenceCapability(input) === "public-surface"
  )
    return "medium";
  return "low";
}

export function createLucaLinkHostConnectionRecord(
  input: LucaLinkHostConnectionInput,
  options?: { now?: number },
): LucaLinkHostConnectionRecord {
  const now = options?.now ?? Date.now();
  const hostClass = inferLucaLinkHostClass(input);
  const connectionClass = inferLucaLinkHostConnectionClass(input);
  const runtimeSurfaces = inferLucaLinkRuntimeSurfaces(input);
  const reachability = inferLucaLinkReachability(input);
  const presenceCapability = inferLucaLinkPresenceCapability(input);
  const approvalCapability = deriveLucaLinkApprovalCapability(input);
  const limitations = [...(input.limitations ?? [])];
  const warnings = [...(input.warnings ?? [])];
  if (hostClass === "unknown-host")
    limitations.push(
      "Requires Host Adaptation Intelligence diagnosis before bridge planning.",
    );
  if (hostClass === "embodied-host")
    limitations.push(
      "Physical motion requires fresh Primary Host confirmation in a later PR; embodied hosts cannot approve their own physical actions.",
    );
  if (hostClass === "guest-host")
    limitations.push(
      "Guest hosts remain conversation/WebRTC limited with no memory, tool, safety, or identity authority.",
    );
  if (presenceCapability === "public-surface")
    warnings.push("Public/shared surfaces cannot approve by default.");
  return {
    id: input.id ?? input.deviceId ?? `host-${now}`,
    deviceId: input.deviceId,
    displayName:
      input.displayName ??
      input.name ??
      input.deviceId ??
      "Unknown LucaLink host",
    hostClass,
    connectionClass,
    runtimeSurfaces,
    reachability,
    presenceCapability,
    approvalCapability,
    connectionRisk: deriveRisk(input),
    trustLevel: input.trustLevel,
    deviceRole: input.deviceRole ?? input.role,
    status: input.status,
    canDisplay: deriveLucaLinkDisplayCapability(input),
    canApprove:
      input.canApprove ??
      !["none", "display-only"].includes(approvalCapability),
    canExecute: deriveLucaLinkExecutionCapability(input),
    canSense: deriveLucaLinkSensorCapability(input),
    canActPhysically: deriveLucaLinkPhysicalActionCapability(input),
    canReceiveHandoff: deriveLucaLinkHandoffCapability(input),
    canHostLucaUi:
      input.canHostLucaUi ?? deriveLucaLinkDisplayCapability(input),
    connectionEvidence: unique(
      [
        ...(input.connectionEvidence ?? []),
        input.type ?? input.deviceType ?? "",
      ].filter(Boolean),
    ),
    capabilityEvidence: unique([
      ...(input.capabilityEvidence ?? []),
      ...(input.capabilities ?? []),
      ...runtimeSurfaces,
    ]),
    limitations: unique(limitations),
    warnings: unique(warnings),
    errors: unique(input.errors ?? []),
    createdAt: now,
    updatedAt: now,
    lastSeenAt: input.lastSeenAt ?? input.lastSeen,
  };
}

export function summarizeLucaLinkHostConnections(
  records: LucaLinkHostConnectionRecord[],
): LucaLinkHostConnectionRegistrySummary {
  const summary: LucaLinkHostConnectionRegistrySummary = {
    total: records.length,
    online: 0,
    displayHosts: 0,
    approvalCapable: 0,
    executionHosts: 0,
    sensorHosts: 0,
    embodiedHosts: 0,
    publicSurfaces: 0,
    unknownHosts: 0,
    byHostClass: countMap(HOST_CLASSES),
    byConnectionClass: countMap(CONNECTION_CLASSES),
    byRisk: countMap(RISKS),
    warnings: [],
  };
  records.forEach((record) => {
    if (record.reachability === "online") summary.online += 1;
    if (record.canDisplay) summary.displayHosts += 1;
    if (record.canApprove) summary.approvalCapable += 1;
    if (record.canExecute) summary.executionHosts += 1;
    if (record.canSense) summary.sensorHosts += 1;
    if (record.hostClass === "embodied-host") summary.embodiedHosts += 1;
    if (record.presenceCapability === "public-surface")
      summary.publicSurfaces += 1;
    if (record.hostClass === "unknown-host") summary.unknownHosts += 1;
    summary.byHostClass[record.hostClass] += 1;
    summary.byConnectionClass[record.connectionClass] += 1;
    summary.byRisk[record.connectionRisk] += 1;
    summary.warnings.push(...record.warnings);
  });
  summary.warnings = unique(summary.warnings);
  return summary;
}

export function createLucaLinkHostConnectionRegistry(options?: {
  maxRecords?: number;
}): LucaLinkHostConnectionRegistryState {
  return { records: [], maxRecords: options?.maxRecords ?? 100 };
}

export function upsertLucaLinkHostConnection(
  registry: LucaLinkHostConnectionRegistryState,
  input: LucaLinkHostConnectionInput | LucaLinkHostConnectionRecord,
  options?: { now?: number },
): LucaLinkHostConnectionRecord {
  const existing = registry.records.find(
    (record) =>
      record.id === input.id ||
      (input.deviceId && record.deviceId === input.deviceId),
  );
  const record =
    "hostClass" in input && "createdAt" in input
      ? { ...input, updatedAt: options?.now ?? input.updatedAt }
      : createLucaLinkHostConnectionRecord(input, options);
  if (existing) {
    Object.assign(existing, {
      ...record,
      createdAt: existing.createdAt,
      updatedAt: options?.now ?? record.updatedAt,
    });
    return { ...existing };
  }
  registry.records = [record, ...registry.records].slice(
    0,
    registry.maxRecords,
  );
  return { ...record };
}

export function getLucaLinkHostConnection(
  registry: LucaLinkHostConnectionRegistryState,
  id: string,
): LucaLinkHostConnectionRecord | undefined {
  const record = registry.records.find(
    (candidate) => candidate.id === id || candidate.deviceId === id,
  );
  return record ? { ...record } : undefined;
}

export function listLucaLinkHostConnections(
  registry: LucaLinkHostConnectionRegistryState,
): LucaLinkHostConnectionRecord[] {
  return registry.records.map((record) => ({ ...record }));
}

export function removeLucaLinkHostConnection(
  registry: LucaLinkHostConnectionRegistryState,
  id: string,
): boolean {
  const before = registry.records.length;
  registry.records = registry.records.filter(
    (record) => record.id !== id && record.deviceId !== id,
  );
  return registry.records.length !== before;
}

export function clearLucaLinkHostConnectionRegistry(
  registry: LucaLinkHostConnectionRegistryState,
): void {
  registry.records = [];
}

export function summarizeLucaLinkHostConnectionRegistry(
  registry: LucaLinkHostConnectionRegistryState,
): LucaLinkHostConnectionRegistrySummary {
  return summarizeLucaLinkHostConnections(registry.records);
}

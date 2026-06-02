/**
 * LucaLink Device Trust Registry (PR #199)
 *
 * Pure, in-memory helpers for local LucaLink device trust management.
 * No sockets, network, storage, permission prompts, or runtime actions live here.
 */

export type LucaLinkDeviceTrustLevel =
  | "guest"
  | "paired"
  | "trusted"
  | "admin"
  | "owner";

export type LucaLinkDeviceTrustStatus =
  | "known"
  | "connected"
  | "disconnected"
  | "revoked"
  | "blocked";

export type LucaLinkDeviceRole =
  | "primary-host"
  | "companion"
  | "execution"
  | "guest"
  | "sensor"
  | "display"
  | "embodied"
  | "unknown";

export type LucaLinkDeviceTrustMutation =
  | "rename"
  | "set-trust-level"
  | "revoke"
  | "block"
  | "unblock"
  | "mark-connected"
  | "mark-disconnected"
  | "refresh-capabilities";

export interface LucaLinkTrustedDevicePermissions {
  conversation: boolean;
  notification: boolean;
  memory: boolean;
  tools: boolean;
  files: boolean;
  code: boolean;
  browser: boolean;
  shell: boolean;
  payment: boolean;
  physicalWorld: boolean;
  safety: boolean;
}

export interface LucaLinkTrustedDeviceRecord {
  deviceId: string;
  displayName: string;
  deviceType?: string;
  role: LucaLinkDeviceRole;
  trustLevel: LucaLinkDeviceTrustLevel;
  status: LucaLinkDeviceTrustStatus;

  createdAt: number;
  updatedAt: number;
  lastSeenAt?: number;
  revokedAt?: number;
  blockedAt?: number;

  capabilities: string[];
  deniedCapabilities: string[];
  permissionSummary: LucaLinkTrustedDevicePermissions;

  warnings: string[];
  errors: string[];
}

export interface LucaLinkDeviceTrustMutationResult {
  valid: boolean;
  device?: LucaLinkTrustedDeviceRecord;
  warnings: string[];
  errors: string[];
  audit?: LucaLinkDeviceTrustAuditRecord;
}

export interface LucaLinkDeviceTrustAuditRecord {
  id: string;
  timestamp: number;
  mutation: LucaLinkDeviceTrustMutation;
  deviceId: string;
  previousTrustLevel?: LucaLinkDeviceTrustLevel;
  nextTrustLevel?: LucaLinkDeviceTrustLevel;
  previousStatus?: LucaLinkDeviceTrustStatus;
  nextStatus?: LucaLinkDeviceTrustStatus;
  performedByDeviceId?: string;
  reason?: string;
  warnings: string[];
  errors: string[];
}

export interface LucaLinkDeviceTrustRegistryState {
  devices: LucaLinkTrustedDeviceRecord[];
  audit: LucaLinkDeviceTrustAuditRecord[];
  maxAuditRecords: number;
}

export interface LucaLinkDeviceTrustRegistryOptions {
  now?: number;
  maxAuditRecords?: number;
}

export interface LucaLinkTrustedDeviceInput {
  deviceId: string;
  displayName?: string;
  name?: string;
  deviceType?: string;
  type?: string;
  role?: LucaLinkDeviceRole;
  trustLevel?: LucaLinkDeviceTrustLevel;
  status?: LucaLinkDeviceTrustStatus;
  lastSeenAt?: number;
  lastSeen?: number;
  capabilities?: string[];
  isCurrentPrimaryHost?: boolean;
}

export interface LucaLinkDeviceTrustMutationOptions extends LucaLinkDeviceTrustRegistryOptions {
  performedByDeviceId?: string;
  currentPrimaryHostDeviceId?: string;
  allowOwnerAssignment?: boolean;
  reason?: string;
}

export interface LucaLinkDeviceTrustRegistrySummary {
  known: number;
  connected: number;
  disconnected: number;
  revoked: number;
  blocked: number;
  guests: number;
  trusted: number;
  admin: number;
  owner: number;
  total: number;
  auditCount: number;
  latestMutation?: LucaLinkDeviceTrustAuditRecord;
}

const DEFAULT_MAX_AUDIT_RECORDS = 100;
const MAX_DISPLAY_NAME_LENGTH = 64;

const EMPTY_PERMISSIONS: LucaLinkTrustedDevicePermissions = Object.freeze({
  conversation: false,
  notification: false,
  memory: false,
  tools: false,
  files: false,
  code: false,
  browser: false,
  shell: false,
  payment: false,
  physicalWorld: false,
  safety: false,
});

const SENSITIVE_CAPABILITY_PATTERNS = [
  "memory",
  "tool",
  "files",
  "file",
  "code",
  "browser",
  "shell",
  "git",
  "payment",
  "robotics",
  "motion",
  "smart_home",
  "physical",
];

function uniqueSorted(values: string[] = []): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort();
}

function normalizeText(value?: string | null): string {
  return (value ?? "").trim().toLowerCase();
}

function getNow(options?: LucaLinkDeviceTrustRegistryOptions): number {
  return options?.now ?? Date.now();
}

function cloneDevice(device: LucaLinkTrustedDeviceRecord): LucaLinkTrustedDeviceRecord {
  return {
    ...device,
    capabilities: [...device.capabilities],
    deniedCapabilities: [...device.deniedCapabilities],
    permissionSummary: { ...device.permissionSummary },
    warnings: [...device.warnings],
    errors: [...device.errors],
  };
}

function normalizeCapabilities(capabilities?: string[]): string[] {
  return uniqueSorted(capabilities ?? []);
}

function hasCapability(record: Pick<LucaLinkTrustedDeviceRecord, "capabilities">, ...needles: string[]): boolean {
  const joined = record.capabilities.join(" ").toLowerCase();
  return needles.some((needle) => joined.includes(needle));
}

function isSensitiveCapability(capability: string): boolean {
  const normalized = normalizeText(capability);
  return SENSITIVE_CAPABILITY_PATTERNS.some((pattern) => normalized.includes(pattern));
}

export function inferLucaLinkDeviceRole(input: Partial<LucaLinkTrustedDeviceInput>): LucaLinkDeviceRole {
  if (input.role) return input.role;
  if (input.isCurrentPrimaryHost) return "primary-host";

  const text = `${input.deviceType ?? ""} ${input.type ?? ""} ${input.displayName ?? ""} ${input.name ?? ""}`.toLowerCase();
  if (/guest|browser|\bweb\b/.test(text)) return "guest";
  if (/mobile|phone|tablet|iphone|ipad|android|ios/.test(text)) return "companion";
  if (/camera|watch|sensor|iot|microphone|speaker/.test(text)) return "sensor";
  if (/tv|display|projector|screen|monitor/.test(text)) return "display";
  if (/robot|drone|humanoid|embodied|ros\b/.test(text)) return "embodied";
  if (/desktop|laptop|workstation|server|mac|windows|linux/.test(text)) return "execution";
  return "execution";
}

export function defaultTrustLevelForRole(role: LucaLinkDeviceRole): LucaLinkDeviceTrustLevel {
  if (role === "primary-host") return "owner";
  if (role === "guest") return "guest";
  return "paired";
}

export function deviceCapabilitiesForTrust(record: LucaLinkTrustedDeviceRecord): string[] {
  const base = ["chat.send", "chat.receive"];
  if (record.trustLevel !== "guest") base.push("notification.send");
  if (record.trustLevel === "trusted" || record.trustLevel === "admin" || record.trustLevel === "owner") {
    if (hasCapability(record, "memory.read", "memory")) base.push("memory.read");
  }
  if (record.trustLevel === "admin" || record.trustLevel === "owner") {
    if (record.role === "execution" || record.role === "companion" || record.role === "primary-host") {
      if (hasCapability(record, "tools", "tool")) base.push("tools.request");
      if (hasCapability(record, "files.read", "file")) base.push("files.read");
      if (hasCapability(record, "code")) base.push("code.request");
      if (hasCapability(record, "browser")) base.push("browser.request");
      if (hasCapability(record, "shell")) base.push("shell.request");
    }
  }
  return uniqueSorted(base);
}

export function summarizeTrustedDevicePermissions(record: LucaLinkTrustedDeviceRecord): LucaLinkTrustedDevicePermissions {
  const granted = deviceCapabilitiesForTrust(record);
  const active = record.status !== "revoked" && record.status !== "blocked";
  if (!active) return { ...EMPTY_PERMISSIONS };

  return {
    conversation: granted.some((capability) => capability.startsWith("chat.")),
    notification: granted.includes("notification.send"),
    memory: granted.includes("memory.read"),
    tools: granted.includes("tools.request"),
    files: granted.includes("files.read"),
    code: granted.includes("code.request"),
    browser: granted.includes("browser.request"),
    shell: granted.includes("shell.request"),
    payment: false,
    physicalWorld: false,
    safety: record.trustLevel !== "guest",
  };
}

function deniedCapabilitiesFor(record: LucaLinkTrustedDeviceRecord): string[] {
  const denied = new Set<string>();
  if (!record.permissionSummary.memory) denied.add("memory.write");
  if (!record.permissionSummary.tools) denied.add("tools.execute");
  if (!record.permissionSummary.files) denied.add("files.write");
  if (!record.permissionSummary.code) denied.add("code.modify");
  if (!record.permissionSummary.browser) denied.add("browser.control");
  if (!record.permissionSummary.shell) denied.add("shell.execute");
  denied.add("payment.spend");
  denied.add("physical-world.action");
  if (record.role === "sensor" || record.role === "embodied") denied.add("robotics.motion");
  return [...denied].sort();
}

function normalizeDeviceRecord(record: LucaLinkTrustedDeviceRecord): LucaLinkTrustedDeviceRecord {
  const permissionSummary = summarizeTrustedDevicePermissions(record);
  const normalized = {
    ...record,
    capabilities: normalizeCapabilities(record.capabilities),
    permissionSummary,
    warnings: uniqueSorted(record.warnings),
    errors: uniqueSorted(record.errors),
  };
  return {
    ...normalized,
    deniedCapabilities: deniedCapabilitiesFor(normalized),
  };
}

export function createTrustedDeviceRecord(
  input: LucaLinkTrustedDeviceInput,
  options: LucaLinkDeviceTrustRegistryOptions = {},
): LucaLinkTrustedDeviceRecord {
  const now = getNow(options);
  const role = inferLucaLinkDeviceRole(input);
  const trustLevel = input.trustLevel ?? (input.isCurrentPrimaryHost ? "owner" : defaultTrustLevelForRole(role));
  const displayName = (input.displayName ?? input.name ?? input.deviceId).trim().slice(0, MAX_DISPLAY_NAME_LENGTH) || input.deviceId;
  const deviceType = input.deviceType ?? input.type;
  const warnings: string[] = [];

  if (trustLevel === "owner" && role !== "primary-host") {
    warnings.push("Owner trust is reserved for the current local Primary Host; this record should not be owner unless explicitly confirmed.");
  }
  if (role === "guest") warnings.push("Guest devices are conversation/WebRTC limited.");
  if (role === "sensor" || role === "embodied") warnings.push("Physical-world permissions are denied by default.");

  return normalizeDeviceRecord({
    deviceId: input.deviceId,
    displayName,
    deviceType,
    role,
    trustLevel,
    status: input.status ?? "known",
    createdAt: now,
    updatedAt: now,
    lastSeenAt: input.lastSeenAt ?? input.lastSeen,
    capabilities: normalizeCapabilities(input.capabilities),
    deniedCapabilities: [],
    permissionSummary: { ...EMPTY_PERMISSIONS },
    warnings,
    errors: [],
  });
}

export function createLucaLinkDeviceTrustRegistry(
  options: LucaLinkDeviceTrustRegistryOptions = {},
): LucaLinkDeviceTrustRegistryState {
  return {
    devices: [],
    audit: [],
    maxAuditRecords: options.maxAuditRecords ?? DEFAULT_MAX_AUDIT_RECORDS,
  };
}

function pushAudit(
  registry: LucaLinkDeviceTrustRegistryState,
  audit: LucaLinkDeviceTrustAuditRecord,
): LucaLinkDeviceTrustAuditRecord {
  registry.audit = [...registry.audit, audit].slice(-(registry.maxAuditRecords || DEFAULT_MAX_AUDIT_RECORDS));
  return audit;
}

function makeAudit(
  mutation: LucaLinkDeviceTrustMutation,
  deviceId: string,
  previous: LucaLinkTrustedDeviceRecord | undefined,
  next: LucaLinkTrustedDeviceRecord | undefined,
  options: LucaLinkDeviceTrustMutationOptions | undefined,
  warnings: string[],
  errors: string[],
): LucaLinkDeviceTrustAuditRecord {
  const timestamp = getNow(options);
  return {
    id: `device-trust-${timestamp}-${mutation}-${deviceId}-${Math.abs(
      [...`${mutation}:${deviceId}:${timestamp}:${warnings.join("|")}:${errors.join("|")}`].reduce(
        (acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0,
        0,
      ),
    )}`,
    timestamp,
    mutation,
    deviceId,
    previousTrustLevel: previous?.trustLevel,
    nextTrustLevel: next?.trustLevel,
    previousStatus: previous?.status,
    nextStatus: next?.status,
    performedByDeviceId: options?.performedByDeviceId,
    reason: options?.reason,
    warnings,
    errors,
  };
}

function mutationResult(
  registry: LucaLinkDeviceTrustRegistryState,
  mutation: LucaLinkDeviceTrustMutation,
  deviceId: string,
  previous: LucaLinkTrustedDeviceRecord | undefined,
  next: LucaLinkTrustedDeviceRecord | undefined,
  options: LucaLinkDeviceTrustMutationOptions | undefined,
  warnings: string[],
  errors: string[],
): LucaLinkDeviceTrustMutationResult {
  const audit = pushAudit(registry, makeAudit(mutation, deviceId, previous, next, options, warnings, errors));
  return { valid: errors.length === 0, device: next ? cloneDevice(next) : undefined, warnings, errors, audit };
}

function findDeviceIndex(registry: LucaLinkDeviceTrustRegistryState, deviceId: string): number {
  return registry.devices.findIndex((device) => device.deviceId === deviceId);
}

function getExistingOrError(
  registry: LucaLinkDeviceTrustRegistryState,
  mutation: LucaLinkDeviceTrustMutation,
  deviceId: string,
  options?: LucaLinkDeviceTrustMutationOptions,
): { index: number; device?: LucaLinkTrustedDeviceRecord; result?: LucaLinkDeviceTrustMutationResult } {
  const index = findDeviceIndex(registry, deviceId);
  if (index === -1) {
    return {
      index,
      result: mutationResult(registry, mutation, deviceId, undefined, undefined, options, [], [`Unknown LucaLink device: ${deviceId}`]),
    };
  }
  return { index, device: registry.devices[index] };
}

function saveDevice(
  registry: LucaLinkDeviceTrustRegistryState,
  index: number,
  device: LucaLinkTrustedDeviceRecord,
): LucaLinkTrustedDeviceRecord {
  const normalized = normalizeDeviceRecord(device);
  registry.devices = registry.devices.map((existing, idx) => (idx === index ? normalized : existing));
  return normalized;
}

export function upsertTrustedDevice(
  registry: LucaLinkDeviceTrustRegistryState,
  input: LucaLinkTrustedDeviceInput,
  options: LucaLinkDeviceTrustRegistryOptions = {},
): LucaLinkTrustedDeviceRecord {
  const index = findDeviceIndex(registry, input.deviceId);
  if (index === -1) {
    const created = createTrustedDeviceRecord(input, options);
    registry.devices = [...registry.devices, created];
    return cloneDevice(created);
  }

  const existing = registry.devices[index];
  const now = getNow(options);
  const preservesLocalRemoval = existing.status === "revoked" || existing.status === "blocked";
  const updated = normalizeDeviceRecord({
    ...existing,
    displayName: input.displayName ?? input.name ?? existing.displayName,
    deviceType: input.deviceType ?? input.type ?? existing.deviceType,
    role: input.role ?? existing.role,
    trustLevel: input.trustLevel ?? existing.trustLevel,
    status: preservesLocalRemoval ? existing.status : input.status ?? existing.status,
    lastSeenAt: input.lastSeenAt ?? input.lastSeen ?? existing.lastSeenAt,
    capabilities: input.capabilities ? normalizeCapabilities(input.capabilities) : existing.capabilities,
    updatedAt: now,
  });
  registry.devices = registry.devices.map((device, idx) => (idx === index ? updated : device));
  return cloneDevice(updated);
}

export function getTrustedDevice(
  registry: LucaLinkDeviceTrustRegistryState,
  deviceId: string,
): LucaLinkTrustedDeviceRecord | undefined {
  const device = registry.devices.find((record) => record.deviceId === deviceId);
  return device ? cloneDevice(device) : undefined;
}

export function listTrustedDevices(registry: LucaLinkDeviceTrustRegistryState): LucaLinkTrustedDeviceRecord[] {
  return registry.devices.map(cloneDevice);
}

export function listActiveTrustedDevices(registry: LucaLinkDeviceTrustRegistryState): LucaLinkTrustedDeviceRecord[] {
  return registry.devices.filter((device) => device.status !== "revoked" && device.status !== "blocked").map(cloneDevice);
}

export function renameTrustedDevice(
  registry: LucaLinkDeviceTrustRegistryState,
  deviceId: string,
  displayName: string,
  options?: LucaLinkDeviceTrustMutationOptions,
): LucaLinkDeviceTrustMutationResult {
  const lookup = getExistingOrError(registry, "rename", deviceId, options);
  if (!lookup.device) return lookup.result!;
  const previous = lookup.device;
  const trimmed = displayName.trim();
  if (!trimmed) {
    return mutationResult(registry, "rename", deviceId, previous, previous, options, [], ["Display name cannot be empty."]);
  }
  const next = saveDevice(registry, lookup.index, {
    ...previous,
    displayName: trimmed.slice(0, MAX_DISPLAY_NAME_LENGTH),
    updatedAt: getNow(options),
  });
  const warnings = trimmed.length > MAX_DISPLAY_NAME_LENGTH ? [`Display name was capped at ${MAX_DISPLAY_NAME_LENGTH} characters.`] : [];
  return mutationResult(registry, "rename", deviceId, previous, next, options, warnings, []);
}

function validateTrustLevelChange(
  device: LucaLinkTrustedDeviceRecord,
  trustLevel: LucaLinkDeviceTrustLevel,
  options?: LucaLinkDeviceTrustMutationOptions,
): { warnings: string[]; errors: string[] } {
  const warnings: string[] = [];
  const errors: string[] = [];
  if (device.role === "guest" && (trustLevel === "admin" || trustLevel === "owner")) {
    errors.push("Guest devices cannot become admin or owner; guest sessions remain conversation/WebRTC limited.");
  }
  if ((device.role === "sensor" || device.role === "embodied") && trustLevel === "owner") {
    errors.push("Sensor and embodied devices cannot be assigned owner trust.");
  }
  if (trustLevel === "owner") {
    const primaryMatch = options?.performedByDeviceId && options.performedByDeviceId === options.currentPrimaryHostDeviceId;
    if (!options?.allowOwnerAssignment || !primaryMatch || device.deviceId !== options.currentPrimaryHostDeviceId || device.role !== "primary-host") {
      errors.push("Owner trust is reserved for the current local Primary Host. Primary Host and owner transfer are not implemented.");
    }
  }
  if (trustLevel === "admin" && !(device.role === "execution" || device.role === "companion")) {
    errors.push("Admin trust is allowed only for trusted execution or companion devices.");
  }
  if (trustLevel === "admin") {
    warnings.push("Admin enables advanced device management only; it does not bypass Primary Host approvals or runtime enforcement.");
  }
  return { warnings, errors };
}

export function setTrustedDeviceTrustLevel(
  registry: LucaLinkDeviceTrustRegistryState,
  deviceId: string,
  trustLevel: LucaLinkDeviceTrustLevel,
  options?: LucaLinkDeviceTrustMutationOptions,
): LucaLinkDeviceTrustMutationResult {
  const lookup = getExistingOrError(registry, "set-trust-level", deviceId, options);
  if (!lookup.device) return lookup.result!;
  const previous = lookup.device;
  const validation = validateTrustLevelChange(previous, trustLevel, options);
  if (validation.errors.length) {
    return mutationResult(registry, "set-trust-level", deviceId, previous, previous, options, validation.warnings, validation.errors);
  }
  const next = saveDevice(registry, lookup.index, {
    ...previous,
    trustLevel,
    updatedAt: getNow(options),
  });
  return mutationResult(registry, "set-trust-level", deviceId, previous, next, options, validation.warnings, []);
}

function clearSensitiveCapabilities(capabilities: string[]): string[] {
  return capabilities.filter((capability) => !isSensitiveCapability(capability));
}

export function revokeTrustedDevice(
  registry: LucaLinkDeviceTrustRegistryState,
  deviceId: string,
  options?: LucaLinkDeviceTrustMutationOptions,
): LucaLinkDeviceTrustMutationResult {
  const lookup = getExistingOrError(registry, "revoke", deviceId, options);
  if (!lookup.device) return lookup.result!;
  const previous = lookup.device;
  const now = getNow(options);
  const next = saveDevice(registry, lookup.index, {
    ...previous,
    status: "revoked",
    revokedAt: now,
    updatedAt: now,
    capabilities: clearSensitiveCapabilities(previous.capabilities),
  });
  return mutationResult(registry, "revoke", deviceId, previous, next, options, ["Local only; does not disconnect remote transport yet."], []);
}

export function blockTrustedDevice(
  registry: LucaLinkDeviceTrustRegistryState,
  deviceId: string,
  options?: LucaLinkDeviceTrustMutationOptions,
): LucaLinkDeviceTrustMutationResult {
  const lookup = getExistingOrError(registry, "block", deviceId, options);
  if (!lookup.device) return lookup.result!;
  const previous = lookup.device;
  const now = getNow(options);
  const next = saveDevice(registry, lookup.index, {
    ...previous,
    status: "blocked",
    blockedAt: now,
    updatedAt: now,
    capabilities: clearSensitiveCapabilities(previous.capabilities),
  });
  return mutationResult(registry, "block", deviceId, previous, next, options, ["Local only; does not disconnect remote transport yet."], []);
}

export function unblockTrustedDevice(
  registry: LucaLinkDeviceTrustRegistryState,
  deviceId: string,
  options?: LucaLinkDeviceTrustMutationOptions,
): LucaLinkDeviceTrustMutationResult {
  const lookup = getExistingOrError(registry, "unblock", deviceId, options);
  if (!lookup.device) return lookup.result!;
  const previous = lookup.device;
  const nextStatus: LucaLinkDeviceTrustStatus = previous.lastSeenAt ? "disconnected" : "known";
  const next = saveDevice(registry, lookup.index, {
    ...previous,
    status: nextStatus,
    blockedAt: undefined,
    updatedAt: getNow(options),
  });
  return mutationResult(registry, "unblock", deviceId, previous, next, options, ["Unblock is local-only and does not auto-trust the device."], []);
}

export function markTrustedDeviceConnected(
  registry: LucaLinkDeviceTrustRegistryState,
  deviceId: string,
  options?: LucaLinkDeviceTrustMutationOptions,
): LucaLinkDeviceTrustMutationResult {
  const lookup = getExistingOrError(registry, "mark-connected", deviceId, options);
  if (!lookup.device) return lookup.result!;
  const previous = lookup.device;
  if (previous.status === "revoked" || previous.status === "blocked") {
    return mutationResult(registry, "mark-connected", deviceId, previous, previous, options, [], [`Cannot mark ${previous.status} device connected.`]);
  }
  const now = getNow(options);
  const next = saveDevice(registry, lookup.index, { ...previous, status: "connected", lastSeenAt: now, updatedAt: now });
  return mutationResult(registry, "mark-connected", deviceId, previous, next, options, [], []);
}

export function markTrustedDeviceDisconnected(
  registry: LucaLinkDeviceTrustRegistryState,
  deviceId: string,
  options?: LucaLinkDeviceTrustMutationOptions,
): LucaLinkDeviceTrustMutationResult {
  const lookup = getExistingOrError(registry, "mark-disconnected", deviceId, options);
  if (!lookup.device) return lookup.result!;
  const previous = lookup.device;
  if (previous.status === "revoked" || previous.status === "blocked") {
    return mutationResult(registry, "mark-disconnected", deviceId, previous, previous, options, [], [`Cannot mark ${previous.status} device disconnected.`]);
  }
  const next = saveDevice(registry, lookup.index, { ...previous, status: "disconnected", updatedAt: getNow(options) });
  return mutationResult(registry, "mark-disconnected", deviceId, previous, next, options, [], []);
}

export function refreshTrustedDeviceCapabilities(
  registry: LucaLinkDeviceTrustRegistryState,
  deviceId: string,
  capabilities: string[],
  options?: LucaLinkDeviceTrustMutationOptions,
): LucaLinkDeviceTrustMutationResult {
  const lookup = getExistingOrError(registry, "refresh-capabilities", deviceId, options);
  if (!lookup.device) return lookup.result!;
  const previous = lookup.device;
  const next = saveDevice(registry, lookup.index, {
    ...previous,
    capabilities: normalizeCapabilities(capabilities),
    updatedAt: getNow(options),
  });
  return mutationResult(registry, "refresh-capabilities", deviceId, previous, next, options, ["Capabilities are summarized conservatively; runtime enforcement is unchanged."], []);
}

export function summarizeDeviceTrustRegistry(
  registry: LucaLinkDeviceTrustRegistryState,
): LucaLinkDeviceTrustRegistrySummary {
  const summary: LucaLinkDeviceTrustRegistrySummary = {
    known: registry.devices.filter((device) => device.status === "known").length,
    connected: registry.devices.filter((device) => device.status === "connected").length,
    disconnected: registry.devices.filter((device) => device.status === "disconnected").length,
    revoked: registry.devices.filter((device) => device.status === "revoked").length,
    blocked: registry.devices.filter((device) => device.status === "blocked").length,
    guests: registry.devices.filter((device) => device.role === "guest" || device.trustLevel === "guest").length,
    trusted: registry.devices.filter((device) => device.trustLevel === "trusted").length,
    admin: registry.devices.filter((device) => device.trustLevel === "admin").length,
    owner: registry.devices.filter((device) => device.trustLevel === "owner").length,
    total: registry.devices.length,
    auditCount: registry.audit.length,
    latestMutation: registry.audit[registry.audit.length - 1],
  };
  return summary;
}

export function getDeviceTrustAudit(registry: LucaLinkDeviceTrustRegistryState): LucaLinkDeviceTrustAuditRecord[] {
  return registry.audit.map((audit) => ({ ...audit, warnings: [...audit.warnings], errors: [...audit.errors] }));
}

export function clearDeviceTrustAudit(registry: LucaLinkDeviceTrustRegistryState): void {
  registry.audit = [];
}

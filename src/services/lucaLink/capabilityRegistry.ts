/**
 * LucaLink Host Mesh — Capability Registry (PR #183)
 *
 * Static + runtime-safe helpers for building, inferring, normalizing, and
 * validating {@link LucaHostManifest} values, plus a conservative default
 * permission map per host role.
 *
 * HARD CONSTRAINTS (do not violate when editing this file):
 * - ADDITIVE only. Does not touch existing LucaLink runtime/transport/pairing.
 * - No network calls, no socket calls, no storage writes, no UI coupling.
 * - No side effects at module import — everything is pure functions + frozen
 *   data. The local-capability detection helper is permissionless and only
 *   reads ambient globals when *called* (never at import).
 * - Role / trust / permission vocabularies are imported from
 *   `lucaLinkArchitectureMap.ts` to stay in parity with PR #182.
 *
 * NOTE: This PR classifies capabilities only. Permission enforcement is
 * implemented in PR #184 (Trust & Permission Policy).
 */

import {
  lucaLinkHostRoles,
  lucaLinkPermissionCategories,
  lucaLinkTrustLevels,
  type LucaLinkPermissionCategory,
} from "./lucaLinkArchitectureMap";
import {
  LUCA_HOST_MANIFEST_SCHEMA_VERSION,
  type LucaHostCapabilities,
  type LucaHostCapabilityKey,
  type LucaHostManifest,
  type LucaHostManifestValidation,
  type LucaHostPlatform,
  type LucaHostRole,
  type LucaHostStatus,
  type LucaHostTrustLevel,
} from "./lucaHostManifest";
// Type-only import: erased at compile time, so this never loads the
// lucaLinkService runtime singleton (no side effects at import).
import type { LucaLinkDevice } from "../lucaLinkService";

// ===========================================================================
// Frozen lookup sets (derived once from the PR #182 architecture vocabulary)
// ===========================================================================

const KNOWN_ROLE_IDS: ReadonlySet<LucaHostRole> = new Set(
  lucaLinkHostRoles.map((r) => r.id),
);

const KNOWN_TRUST_IDS: ReadonlySet<LucaHostTrustLevel> = new Set(
  lucaLinkTrustLevels.map((t) => t.id),
);

const KNOWN_PERMISSION_IDS: ReadonlySet<LucaLinkPermissionCategory> = new Set(
  lucaLinkPermissionCategories.map((p) => p.id),
);

const HIGH_RISK_PERMISSION_IDS: ReadonlySet<LucaLinkPermissionCategory> =
  new Set(
    lucaLinkPermissionCategories
      .filter((p) => p.risk === "high" || p.risk === "critical")
      .map((p) => p.id),
  );

const ALL_PLATFORMS: readonly LucaHostPlatform[] = [
  "windows",
  "macos",
  "linux",
  "ios",
  "android",
  "web",
  "robotics",
  "unknown",
];

// ===========================================================================
// Capability → permission mapping
// ===========================================================================

/**
 * Maps each advertised capability flag to the permission categories it would
 * require. Used to classify high-risk capabilities and to keep capability
 * naming anchored to the PR #182 permission vocabulary.
 */
export const CAPABILITY_PERMISSION_MAP: Readonly<
  Record<LucaHostCapabilityKey, readonly LucaLinkPermissionCategory[]>
> = Object.freeze({
  chat: ["chat.send", "chat.receive"],
  voiceInput: ["voice.capture"],
  voiceOutput: ["voice.playback"],
  visionCapture: ["camera.capture"],
  screenUnderstanding: ["screen.capture"],
  notifications: ["notification.send"],
  fileAccess: ["files.read", "files.write"],
  shellAccess: ["shell.execute"],
  browserControl: ["browser.control"],
  localModels: [],
  codeExecution: ["code.modify"],
  smartHomeControl: ["smart_home.control"],
  roboticsControl: ["robotics.motion"],
} as const);

// ===========================================================================
// Inference helpers
// ===========================================================================

/**
 * Best-effort platform classification from a user-agent string. Pure: does not
 * read ambient globals. Returns `"unknown"` for empty input and `"web"` for an
 * unrecognized browser-like UA.
 */
export function inferPlatformFromUserAgent(
  userAgent?: string | null,
): LucaHostPlatform {
  if (!userAgent) return "unknown";
  const ua = userAgent.toLowerCase();

  if (/robot|humanoid|drone|ros\//.test(ua)) return "robotics";
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  if (/mac os|macintosh|mac_/.test(ua)) return "macos";
  if (/windows|win32|win64/.test(ua)) return "windows";
  if (/linux|x11|ubuntu/.test(ua)) return "linux";

  // Recognizable browser engines we cannot pin to an OS → generic web host.
  if (/mozilla|webkit|gecko|chrome|safari|firefox|edg/.test(ua)) return "web";

  return "unknown";
}

/**
 * Conservative host-role inference from platform.
 *
 * - desktop platforms (windows/macos/linux): `origin` only when the caller
 *   knows this is the local/current host, otherwise `execution`.
 * - mobile (ios/android): `companion`.
 * - robotics: `embodied`.
 * - web: `guest` (least-privilege by default).
 * - unknown: `guest`.
 */
export function inferHostRoleFromPlatform(
  platform: LucaHostPlatform,
  options: { isLocalOrigin?: boolean } = {},
): LucaHostRole {
  switch (platform) {
    case "windows":
    case "macos":
    case "linux":
      return options.isLocalOrigin ? "origin" : "execution";
    case "ios":
    case "android":
      return "companion";
    case "robotics":
      return "embodied";
    case "web":
    case "unknown":
    default:
      return "guest";
  }
}

// ===========================================================================
// Default permissions per role (conservative; NOT enforced yet — PR #184)
// ===========================================================================

const DEFAULT_PERMISSIONS_BY_ROLE: Readonly<
  Record<LucaHostRole, readonly LucaLinkPermissionCategory[]>
> = Object.freeze({
  // Origin holds memory authority. Dangerous permissions are listed *clearly*
  // here so the future policy layer (PR #184) can reason about them.
  origin: [
    "chat.send",
    "chat.receive",
    "memory.read",
    "memory.write",
    "settings.sync",
    "files.read",
    "files.write",
    "browser.control",
    "shell.execute",
    "code.modify",
    "git.create_pr",
  ],
  // Execution hosts can run heavy/dangerous tools but never own memory write.
  execution: [
    "chat.send",
    "chat.receive",
    "memory.read",
    "files.read",
    "files.write",
    "shell.execute",
    "code.modify",
    "git.create_pr",
  ],
  // Companion: phone/tablet. May request actions; NO shell/files.write/PRs.
  companion: [
    "chat.send",
    "chat.receive",
    "voice.capture",
    "voice.playback",
    "camera.capture",
    "notification.send",
  ],
  // Sensor: read-mostly perception node.
  sensor: ["voice.capture", "camera.capture", "location.read"],
  // Display: output-only surface.
  display: ["chat.receive", "notification.send"],
  // Guest: least privilege — chat only, no memory write, no tools.
  guest: ["chat.send", "chat.receive"],
  // Embodied: conservative by default. Robotics motion is advertised as a
  // capability but NOT granted here — it must be granted explicitly (PR #184).
  embodied: ["chat.receive", "camera.capture", "location.read"],
} as const);

/**
 * Conservative default permission grant for a role. Every returned permission
 * is a member of `lucaLinkPermissionCategories`.
 *
 * NOTE: These are defaults for classification/design only — nothing is
 * enforced until PR #184.
 */
export function getDefaultPermissionsForRole(
  role: LucaHostRole,
): LucaLinkPermissionCategory[] {
  return [...(DEFAULT_PERMISSIONS_BY_ROLE[role] ?? [])];
}

function defaultTrustLevelForRole(role: LucaHostRole): LucaHostTrustLevel {
  switch (role) {
    case "origin":
      return "origin";
    case "execution":
      return "trusted";
    case "companion":
    case "sensor":
    case "display":
    case "embodied":
      return "paired";
    case "guest":
    default:
      return "guest";
  }
}

// ===========================================================================
// Capability risk classification
// ===========================================================================

/**
 * Whether an advertised capability maps to any high- or critical-risk
 * permission category (per the PR #182 risk bands).
 */
export function isHighRiskCapability(capability: LucaHostCapabilityKey): boolean {
  const perms = CAPABILITY_PERMISSION_MAP[capability] ?? [];
  return perms.some((p) => HIGH_RISK_PERMISSION_IDS.has(p));
}

/**
 * Whether a permission category is high- or critical-risk.
 */
export function isHighRiskPermission(
  permission: LucaLinkPermissionCategory,
): boolean {
  return HIGH_RISK_PERMISSION_IDS.has(permission);
}

// ===========================================================================
// Default sub-shapes
// ===========================================================================

function emptySensors() {
  return {
    microphone: false,
    camera: false,
    screen: false,
    location: false,
    motion: false,
  };
}

function emptyCapabilities(): LucaHostCapabilities {
  return {
    chat: true,
    voiceInput: false,
    voiceOutput: false,
    visionCapture: false,
    screenUnderstanding: false,
    notifications: false,
    fileAccess: false,
    shellAccess: false,
    browserControl: false,
    localModels: false,
    codeExecution: false,
    smartHomeControl: false,
  };
}

function emptyModels() {
  return {
    chatModels: [],
    visionModels: [],
    sttModels: [],
    ttsModels: [],
    embeddingModels: [],
  };
}

// ===========================================================================
// Manifest construction
// ===========================================================================

export interface CreateDefaultHostManifestInput {
  deviceId: string;
  deviceName?: string;
  platform?: LucaHostPlatform;
  hostRole?: LucaHostRole;
  /** Hint that this manifest describes the local/current host. */
  isLocalOrigin?: boolean;
  /** Optional clock override for deterministic tests. */
  now?: number;
}

/**
 * Build a complete, conservative {@link LucaHostManifest}. Pure — no I/O, no
 * permission prompts. Platform defaults to `"unknown"`; role is inferred from
 * platform when not supplied.
 */
export function createDefaultHostManifest(
  input: CreateDefaultHostManifestInput,
): LucaHostManifest {
  const now = input.now ?? Date.now();
  const platform = input.platform ?? "unknown";
  const hostRole =
    input.hostRole ??
    inferHostRoleFromPlatform(platform, {
      isLocalOrigin: input.isLocalOrigin,
    });

  const permissions = getDefaultPermissionsForRole(hostRole);
  const requiresApprovalFor = permissions.filter((p) =>
    HIGH_RISK_PERMISSION_IDS.has(p),
  );

  return {
    schemaVersion: LUCA_HOST_MANIFEST_SCHEMA_VERSION,
    deviceId: input.deviceId,
    deviceName: input.deviceName ?? input.deviceId,
    platform,
    hostRole,
    hardware: {},
    sensors: emptySensors(),
    capabilities: emptyCapabilities(),
    models: emptyModels(),
    trust: {
      trustLevel: defaultTrustLevelForRole(hostRole),
      permissions,
      requiresApprovalFor,
    },
    status: {
      online: false,
      lastSeen: now,
      activeAppState: "unknown",
    },
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Fill in any missing fields of a partial manifest with conservative defaults
 * and refresh `schemaVersion`. Pure and side-effect free.
 */
export function normalizeManifest(
  partial: Partial<LucaHostManifest> & { deviceId: string },
  options: { now?: number } = {},
): LucaHostManifest {
  const base = createDefaultHostManifest({
    deviceId: partial.deviceId,
    deviceName: partial.deviceName,
    platform: partial.platform,
    hostRole: partial.hostRole,
    now: options.now,
  });

  return {
    ...base,
    ...partial,
    schemaVersion: LUCA_HOST_MANIFEST_SCHEMA_VERSION,
    hardware: { ...base.hardware, ...partial.hardware },
    sensors: { ...base.sensors, ...partial.sensors },
    capabilities: { ...base.capabilities, ...partial.capabilities },
    models: { ...base.models, ...partial.models },
    trust: { ...base.trust, ...partial.trust },
    status: { ...base.status, ...partial.status },
    createdAt: partial.createdAt ?? base.createdAt,
    updatedAt: options.now ?? partial.updatedAt ?? base.updatedAt,
  };
}

/**
 * Return a new manifest with status fields merged and `updatedAt` advanced.
 * Pure — does not mutate the input.
 */
export function mergeManifestStatus(
  manifest: LucaHostManifest,
  statusPatch: Partial<LucaHostStatus>,
  options: { now?: number } = {},
): LucaHostManifest {
  const now = options.now ?? Date.now();
  return {
    ...manifest,
    status: { ...manifest.status, ...statusPatch },
    updatedAt: now,
  };
}

// ===========================================================================
// Validation
// ===========================================================================

/**
 * Validate a manifest against the schema and the PR #182 vocabularies. Pure.
 */
export function validateHostManifest(
  manifest: LucaHostManifest,
): LucaHostManifestValidation {
  const errors: string[] = [];

  if (manifest.schemaVersion !== LUCA_HOST_MANIFEST_SCHEMA_VERSION) {
    errors.push(
      `Unexpected schemaVersion "${String(
        manifest.schemaVersion,
      )}" (expected "${LUCA_HOST_MANIFEST_SCHEMA_VERSION}").`,
    );
  }
  if (!manifest.deviceId) errors.push("deviceId is required.");
  if (!manifest.deviceName) errors.push("deviceName is required.");

  if (!ALL_PLATFORMS.includes(manifest.platform)) {
    errors.push(`Unknown platform "${String(manifest.platform)}".`);
  }
  if (!KNOWN_ROLE_IDS.has(manifest.hostRole)) {
    errors.push(`Unknown hostRole "${String(manifest.hostRole)}".`);
  }
  if (!KNOWN_TRUST_IDS.has(manifest.trust?.trustLevel)) {
    errors.push(
      `Unknown trustLevel "${String(manifest.trust?.trustLevel)}".`,
    );
  }

  for (const perm of manifest.trust?.permissions ?? []) {
    if (!KNOWN_PERMISSION_IDS.has(perm)) {
      errors.push(`Unknown permission "${String(perm)}".`);
    }
  }
  for (const perm of manifest.trust?.requiresApprovalFor ?? []) {
    if (!KNOWN_PERMISSION_IDS.has(perm)) {
      errors.push(`Unknown requiresApprovalFor permission "${String(perm)}".`);
    }
  }

  return { valid: errors.length === 0, errors };
}

// ===========================================================================
// Mapping from the active LucaLinkDevice shape
// ===========================================================================

function inferRoleFromLucaLinkDeviceType(
  type: string,
  isLocalOrigin: boolean,
): LucaHostRole {
  switch (type.toLowerCase()) {
    case "desktop":
    case "laptop":
    case "workstation":
    case "server":
      return isLocalOrigin ? "origin" : "execution";
    case "mobile":
    case "phone":
    case "tablet":
      return "companion";
    case "tv":
    case "display":
    case "projector":
    case "car":
      return "display";
    case "watch":
    case "iot":
    case "speaker":
    case "camera":
    case "sensor":
      return "sensor";
    case "robot":
    case "humanoid":
    case "drone":
      return "embodied";
    case "guest":
    case "web":
    case "browser":
      return "guest";
    default:
      return "guest";
  }
}

/**
 * Pure mapper from the active runtime `LucaLinkDevice` shape (used by
 * `lucaLinkService.ts`) into a {@link LucaHostManifest}. Conservative by
 * default and never mutates the input.
 *
 * Preserves `deviceId`, `name`, and `lastSeen`. Does NOT change the
 * `LucaLinkDevice` interface or any runtime registry behavior.
 */
export function manifestFromLucaLinkDevice(
  device: LucaLinkDevice,
  options: { isLocalOrigin?: boolean; now?: number } = {},
): LucaHostManifest {
  const isLocalOrigin = options.isLocalOrigin ?? false;
  const hostRole = inferRoleFromLucaLinkDeviceType(
    device.type ?? "",
    isLocalOrigin,
  );

  const manifest = createDefaultHostManifest({
    deviceId: device.deviceId,
    deviceName: device.name,
    hostRole,
    isLocalOrigin,
    now: options.now,
  });

  return {
    ...manifest,
    status: {
      ...manifest.status,
      lastSeen: device.lastSeen,
    },
  };
}

// ===========================================================================
// Local capability detection (permissionless, called explicitly)
// ===========================================================================

export interface LocalHostHints {
  platform: LucaHostPlatform;
  /** Coarse runtime classification. */
  runtime: "electron" | "capacitor" | "browser" | "node" | "unknown";
  formFactor: "desktop" | "mobile" | "web" | "unknown";
  online?: boolean;
  /** True when a screen surface is presumed available (NOT a capture grant). */
  hasScreen: boolean;
}

/**
 * Detect basic, permissionless local host hints from ambient globals.
 *
 * SAFETY: This function does NOT prompt for permissions and does NOT access
 * camera/microphone/location, scan the filesystem, run shell commands, make
 * network calls, or write storage. It only reads already-available globals
 * (userAgent, online flag, presence of `screen`/`Capacitor`/`electron`) and is
 * only invoked when explicitly called — never at module import.
 */
export function detectLocalHostHints(): LocalHostHints {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = globalThis as any;

  const nav: { userAgent?: string; onLine?: boolean } | undefined =
    typeof g.navigator !== "undefined" ? g.navigator : undefined;
  const userAgent = nav?.userAgent;
  const platform = inferPlatformFromUserAgent(userAgent);

  const hasWindow = typeof g.window !== "undefined";
  const isCapacitor = hasWindow && !!g.window?.Capacitor;
  const isElectron = hasWindow && !!g.window?.electron;

  let runtime: LocalHostHints["runtime"];
  if (isElectron) runtime = "electron";
  else if (isCapacitor) runtime = "capacitor";
  else if (hasWindow) runtime = "browser";
  else if (typeof g.process !== "undefined" && g.process?.versions?.node)
    runtime = "node";
  else runtime = "unknown";

  let formFactor: LocalHostHints["formFactor"];
  if (platform === "ios" || platform === "android") formFactor = "mobile";
  else if (
    platform === "windows" ||
    platform === "macos" ||
    platform === "linux"
  )
    formFactor = isElectron ? "desktop" : "web";
  else if (platform === "web") formFactor = "web";
  else formFactor = "unknown";

  return {
    platform,
    runtime,
    formFactor,
    online: typeof nav?.onLine === "boolean" ? nav.onLine : undefined,
    hasScreen: typeof g.screen !== "undefined",
  };
}

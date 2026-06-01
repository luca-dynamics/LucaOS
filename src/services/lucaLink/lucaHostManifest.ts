/**
 * LucaLink Host Mesh — Device Manifest (PR #183)
 *
 * Typed, static/runtime-safe **device manifest** layer for LucaLink Mesh.
 *
 * This is the first implementation foundation from the architecture roadmap
 * defined in PR #182 (`docs/lucalink-host-mesh-architecture.md` §H and
 * `src/services/lucaLink/lucaLinkArchitectureMap.ts`).
 *
 * HARD CONSTRAINTS (do not violate when editing this file):
 * - This module is ADDITIVE. It MUST NOT change existing LucaLink runtime,
 *   transport, pairing, relay/local/VPN, guest, WebRTC, or crypto behavior.
 * - No side effects at module load (no network calls, no timers, no I/O,
 *   no storage writes). Everything here is types + pure data.
 * - The role/trust/permission vocabularies are imported from
 *   `lucaLinkArchitectureMap.ts` so the manifest stays in parity with the
 *   PR #182 architecture without duplicating conflicting definitions.
 *
 * NOTE: This PR classifies capabilities only. Permission enforcement is
 * implemented in PR #184 (Trust & Permission Policy).
 */

import type {
  LucaLinkHostRoleId,
  LucaLinkPermissionCategory,
  LucaLinkTrustLevelId,
} from "./lucaLinkArchitectureMap";

// ===========================================================================
// Vocabulary aliases
// ===========================================================================

/**
 * Host role for a manifest. Aliased to the PR #182 architecture vocabulary so
 * the two never drift. See `lucaLinkHostRoles` in `lucaLinkArchitectureMap.ts`.
 */
export type LucaHostRole = LucaLinkHostRoleId;

/**
 * Trust level for a manifest. Aliased to the PR #182 architecture vocabulary.
 * See `lucaLinkTrustLevels` in `lucaLinkArchitectureMap.ts`.
 */
export type LucaHostTrustLevel = LucaLinkTrustLevelId;

/**
 * Platform classification used by manifests. This is intentionally coarser
 * than the runtime `Device["platform"]` (which includes tizen/webos/wearos):
 * the mesh only needs a high-level body classification, plus `robotics` for
 * embodied hosts and `unknown` for unclassifiable sessions.
 */
export type LucaHostPlatform =
  | "windows"
  | "macos"
  | "linux"
  | "ios"
  | "android"
  | "web"
  | "robotics"
  | "unknown";

export const LUCA_HOST_MANIFEST_SCHEMA_VERSION = "luca-host-manifest/v1" as const;

// ===========================================================================
// Sub-shapes
// ===========================================================================

export interface LucaHostHardware {
  cpu?: string;
  gpu?: string;
  npu?: string;
  memoryGb?: number;
  batteryLevel?: number;
  thermalState?: "normal" | "warm" | "hot" | "critical" | "unknown";
  networkType?:
    | "local"
    | "vpn"
    | "relay"
    | "cellular"
    | "offline"
    | "unknown";
}

export interface LucaHostSensors {
  microphone: boolean;
  camera: boolean;
  screen: boolean;
  location: boolean;
  motion: boolean;
  lidar?: boolean;
  depthCamera?: boolean;
}

/**
 * What a host *can* do (pre-policy). These are advertised capabilities, not
 * granted permissions. Granting/enforcement lands in PR #184.
 */
export interface LucaHostCapabilities {
  chat: boolean;
  voiceInput: boolean;
  voiceOutput: boolean;
  visionCapture: boolean;
  screenUnderstanding: boolean;
  notifications: boolean;
  fileAccess: boolean;
  shellAccess: boolean;
  browserControl: boolean;
  localModels: boolean;
  codeExecution: boolean;
  smartHomeControl: boolean;
  roboticsControl?: boolean;
}

export type LucaHostCapabilityKey = keyof LucaHostCapabilities;

export interface LucaHostModels {
  chatModels: string[];
  visionModels: string[];
  sttModels: string[];
  ttsModels: string[];
  embeddingModels: string[];
}

export interface LucaHostTrust {
  trustLevel: LucaHostTrustLevel;
  /**
   * Permission categories granted to this host. Typed against the PR #182
   * permission vocabulary so every grant is validatable against
   * `lucaLinkPermissionCategories`.
   */
  permissions: LucaLinkPermissionCategory[];
  expiresAt?: number;
  /** Permission categories that always require explicit Primary Host approval. */
  requiresApprovalFor: LucaLinkPermissionCategory[];
}

export interface LucaHostStatus {
  online: boolean;
  lastSeen: number;
  activeAppState:
    | "foreground"
    | "background"
    | "locked"
    | "sleeping"
    | "unknown";
  currentTaskId?: string;
}

// ===========================================================================
// Manifest
// ===========================================================================

export interface LucaHostManifest {
  schemaVersion: typeof LUCA_HOST_MANIFEST_SCHEMA_VERSION;
  deviceId: string;
  deviceName: string;
  platform: LucaHostPlatform;
  hostRole: LucaHostRole;

  hardware: LucaHostHardware;
  sensors: LucaHostSensors;
  capabilities: LucaHostCapabilities;
  models: LucaHostModels;
  trust: LucaHostTrust;
  status: LucaHostStatus;

  createdAt: number;
  updatedAt: number;
}

/**
 * Result of {@link validateHostManifest}. `valid` is true only when `errors`
 * is empty.
 */
export interface LucaHostManifestValidation {
  valid: boolean;
  errors: string[];
}

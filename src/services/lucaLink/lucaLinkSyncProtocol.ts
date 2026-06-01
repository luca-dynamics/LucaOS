/**
 * LucaLink Sync Lane Protocol (PR #185)
 *
 * Typed, pure envelope + lane payload model for the future LucaLink Mesh sync
 * layer. This module intentionally does not wire into live Socket.IO, relay,
 * guest, WebRTC, crypto/session, mission, sensor, or Settings runtime paths.
 *
 * A follow-up adapter can translate the existing runtime message/event shapes
 * into LucaLinkEnvelope instances without replacing those live shapes here.
 */

import {
  lucaLinkSyncLanes,
  lucaLinkTrustLevels,
} from "./lucaLinkArchitectureMap";
import type {
  LucaLinkPermissionCategory,
  LucaLinkSyncLane,
  LucaLinkSyncLaneId,
  LucaLinkTrustLevelId,
} from "./lucaLinkArchitectureMap";
import type { LucaHostManifest } from "./lucaHostManifest";
import {
  canHostParticipateInLane,
  evaluateHostPermission,
} from "./lucaLinkTrustPolicy";
import type {
  LucaLinkLaneEvaluation,
  LucaLinkPolicyEvaluation,
  LucaLinkPolicyOptions,
} from "./lucaLinkTrustPolicy";

// ===========================================================================
// Core envelope model
// ===========================================================================

export const LUCA_LINK_ENVELOPE_VERSION = "luca-link/v1" as const;

export type LucaLinkEnvelopeTarget =
  | string
  | "primary"
  | "all"
  | "trusted"
  | "nearby";

export type LucaLinkEnvelopePriority = "low" | "normal" | "high" | "critical";
export type LucaLinkEnvelopeDelivery =
  | "direct"
  | "relay"
  | "local"
  | "store-and-forward";
export type LucaLinkEnvelopeRetryPolicy = "none" | "standard" | "persistent";

export interface LucaLinkEnvelopeSecurity {
  encrypted: boolean;
  signed: boolean;
  requiresAck: boolean;
  trustLevelRequired?: LucaLinkTrustLevelId;
  expiresAt?: number;
}

export interface LucaLinkEnvelopeRouting {
  priority: LucaLinkEnvelopePriority;
  delivery: LucaLinkEnvelopeDelivery;
  retryPolicy: LucaLinkEnvelopeRetryPolicy;
}

export interface LucaLinkEnvelope<TPayload = unknown> {
  version: typeof LUCA_LINK_ENVELOPE_VERSION;
  id: string;
  lane: LucaLinkSyncLaneId;
  type: string;
  sourceDeviceId: string;
  targetDeviceId: LucaLinkEnvelopeTarget;
  timestamp: number;
  security: LucaLinkEnvelopeSecurity;
  routing: LucaLinkEnvelopeRouting;
  payload: TPayload;
}

export interface LucaLinkEnvelopeValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ===========================================================================
// Lane payload model
// ===========================================================================

export interface LucaLinkIdentityPayload {
  kind:
    | "host-manifest"
    | "public-key"
    | "trust-grant"
    | "role-update"
    | "device-revocation"
    | "identity-bootstrap";
  manifest?: LucaHostManifest;
  publicKey?: string;
  deviceId?: string;
  trustLevel?: LucaLinkTrustLevelId;
  expiresAt?: number;
  reason?: string;
}

export interface LucaLinkPresencePayload {
  kind: "online" | "offline" | "heartbeat" | "status";
  online: boolean;
  lastSeen: number;
  activeAppState?: LucaHostManifest["status"]["activeAppState"];
  batteryLevel?: number;
  networkType?: LucaHostManifest["hardware"]["networkType"];
}

export interface LucaLinkConversationPayload {
  kind: "message" | "handoff" | "typing" | "thread-state";
  threadId?: string;
  messageId?: string;
  text?: string;
  role?: "user" | "assistant" | "system" | "tool";
  handoffReason?: string;
}

export interface LucaLinkMemoryPayload {
  kind:
    | "memory-proposal"
    | "memory-accepted"
    | "memory-rejected"
    | "memory-conflict";
  memoryId?: string;
  proposalId?: string;
  sensitivity?: "low" | "medium" | "high";
  confidence?: number;
  summary?: string;
  sourceDeviceId?: string;
}

export interface LucaLinkSettingsPayload {
  kind:
    | "settings-sync"
    | "settings-diff"
    | "settings-conflict"
    | "settings-ack";
  scope?:
    | "appearance"
    | "voice"
    | "brain"
    | "privacy"
    | "notifications"
    | "lucalink";
  diff?: Record<string, unknown>;
  conflictId?: string;
}

export interface LucaLinkMissionPayload {
  kind:
    | "mission-state"
    | "mission-handoff"
    | "mission-progress"
    | "mission-cancel";
  missionId?: string;
  status?:
    | "queued"
    | "running"
    | "paused"
    | "completed"
    | "failed"
    | "cancelled";
  progress?: number;
  summary?: string;
}

export interface LucaLinkSensorPayload {
  kind:
    | "camera-frame"
    | "mic-chunk"
    | "screen-context"
    | "location"
    | "motion"
    | "iot-pulse";
  mediaRef?: string;
  mimeType?: string;
  sampleRate?: number;
  location?: { latitude: number; longitude: number; accuracy?: number };
  metadata?: Record<string, unknown>;
}

export interface LucaLinkToolPayload {
  kind:
    | "tool-request"
    | "tool-result"
    | "tool-approval-request"
    | "tool-denied";
  toolId?: string;
  requestId?: string;
  permission?: LucaLinkPermissionCategory;
  args?: Record<string, unknown>;
  result?: unknown;
  error?: string;
}

export interface LucaLinkArtifactPayload {
  kind:
    | "artifact-created"
    | "artifact-updated"
    | "artifact-transfer"
    | "artifact-delete-request";
  artifactId?: string;
  name?: string;
  mimeType?: string;
  sizeBytes?: number;
  uri?: string;
  checksum?: string;
}

export interface LucaLinkNotificationPayload {
  kind:
    | "alert"
    | "approval-request"
    | "approval-result"
    | "reminder"
    | "progress";
  title?: string;
  body?: string;
  actionId?: string;
  approved?: boolean;
  severity?: "info" | "warning" | "critical";
}

export interface LucaLinkModelPayload {
  kind:
    | "capability-report"
    | "model-available"
    | "model-unavailable"
    | "model-route-request";
  modelId?: string;
  modelType?: "chat" | "vision" | "stt" | "tts" | "embedding";
  available?: boolean;
  reason?: string;
}

export interface LucaLinkSafetyPayload {
  kind:
    | "killswitch"
    | "revoke-device"
    | "pause-sync"
    | "resume-sync"
    | "rotate-keys"
    | "security-alert";
  targetDeviceId?: string;
  reason?: string;
  severity?: "warning" | "critical";
}

export type LucaLinkLanePayload =
  | LucaLinkIdentityPayload
  | LucaLinkPresencePayload
  | LucaLinkConversationPayload
  | LucaLinkMemoryPayload
  | LucaLinkSettingsPayload
  | LucaLinkMissionPayload
  | LucaLinkSensorPayload
  | LucaLinkToolPayload
  | LucaLinkArtifactPayload
  | LucaLinkNotificationPayload
  | LucaLinkModelPayload
  | LucaLinkSafetyPayload;

export interface LucaLinkLanePayloadMap {
  identity: LucaLinkIdentityPayload;
  presence: LucaLinkPresencePayload;
  conversation: LucaLinkConversationPayload;
  memory: LucaLinkMemoryPayload;
  settings: LucaLinkSettingsPayload;
  mission: LucaLinkMissionPayload;
  sensor: LucaLinkSensorPayload;
  tool: LucaLinkToolPayload;
  artifact: LucaLinkArtifactPayload;
  notification: LucaLinkNotificationPayload;
  model: LucaLinkModelPayload;
  safety: LucaLinkSafetyPayload;
}

export type LucaLinkEnvelopeForLane<TLane extends LucaLinkSyncLaneId> =
  LucaLinkEnvelope<LucaLinkLanePayloadMap[TLane]> & { lane: TLane };

export interface LucaLinkEnvelopeFactoryInput<
  TLane extends LucaLinkSyncLaneId,
> {
  id?: string;
  lane: TLane;
  type: string;
  sourceDeviceId: string;
  targetDeviceId: LucaLinkEnvelopeTarget;
  timestamp?: number;
  security?: Partial<LucaLinkEnvelopeSecurity>;
  routing?: Partial<LucaLinkEnvelopeRouting>;
  payload: LucaLinkLanePayloadMap[TLane];
}

export interface LucaLinkEnvelopePolicyEvaluation {
  envelopeValidation: LucaLinkEnvelopeValidation;
  lanePolicy: LucaLinkLaneEvaluation;
  permissionPolicy?: LucaLinkPolicyEvaluation;
  valid: boolean;
  allowed: boolean;
  requiresApproval: boolean;
}

// ===========================================================================
// Static descriptors and defaults
// ===========================================================================

const LANE_DESCRIPTORS: ReadonlyMap<LucaLinkSyncLaneId, LucaLinkSyncLane> =
  new Map(lucaLinkSyncLanes.map((lane) => [lane.id, lane]));

const TRUST_LEVEL_IDS: ReadonlySet<LucaLinkTrustLevelId> = new Set(
  lucaLinkTrustLevels.map((level) => level.id),
);

const PRIORITY_VALUES: ReadonlySet<LucaLinkEnvelopePriority> = new Set([
  "low",
  "normal",
  "high",
  "critical",
]);

const DELIVERY_VALUES: ReadonlySet<LucaLinkEnvelopeDelivery> = new Set([
  "direct",
  "relay",
  "local",
  "store-and-forward",
]);

const RETRY_POLICY_VALUES: ReadonlySet<LucaLinkEnvelopeRetryPolicy> = new Set([
  "none",
  "standard",
  "persistent",
]);

const ACK_REQUIRED_LANES: ReadonlySet<LucaLinkSyncLaneId> = new Set([
  "identity",
  "memory",
  "settings",
  "tool",
  "artifact",
  "safety",
]);

const ENCRYPTION_REQUIRED_LANES: ReadonlySet<LucaLinkSyncLaneId> = new Set([
  "identity",
  "memory",
  "settings",
  "mission",
  "sensor",
  "tool",
  "artifact",
  "notification",
  "model",
  "safety",
]);

const PAYLOAD_KINDS: Readonly<Record<LucaLinkSyncLaneId, ReadonlySet<string>>> =
  {
    identity: new Set([
      "host-manifest",
      "public-key",
      "trust-grant",
      "role-update",
      "device-revocation",
      "identity-bootstrap",
    ]),
    presence: new Set(["online", "offline", "heartbeat", "status"]),
    conversation: new Set(["message", "handoff", "typing", "thread-state"]),
    memory: new Set([
      "memory-proposal",
      "memory-accepted",
      "memory-rejected",
      "memory-conflict",
    ]),
    settings: new Set([
      "settings-sync",
      "settings-diff",
      "settings-conflict",
      "settings-ack",
    ]),
    mission: new Set([
      "mission-state",
      "mission-handoff",
      "mission-progress",
      "mission-cancel",
    ]),
    sensor: new Set([
      "camera-frame",
      "mic-chunk",
      "screen-context",
      "location",
      "motion",
      "iot-pulse",
    ]),
    tool: new Set([
      "tool-request",
      "tool-result",
      "tool-approval-request",
      "tool-denied",
    ]),
    artifact: new Set([
      "artifact-created",
      "artifact-updated",
      "artifact-transfer",
      "artifact-delete-request",
    ]),
    notification: new Set([
      "alert",
      "approval-request",
      "approval-result",
      "reminder",
      "progress",
    ]),
    model: new Set([
      "capability-report",
      "model-available",
      "model-unavailable",
      "model-route-request",
    ]),
    safety: new Set([
      "killswitch",
      "revoke-device",
      "pause-sync",
      "resume-sync",
      "rotate-keys",
      "security-alert",
    ]),
  };

function createEnvelopeId(lane: LucaLinkSyncLaneId, timestamp: number): string {
  return `ll-${lane}-${timestamp}-${Math.random().toString(36).slice(2, 10)}`;
}

function getDefaultPriority(
  lane: LucaLinkSyncLaneId,
): LucaLinkEnvelopePriority {
  if (lane === "safety") return "critical";
  if (lane === "tool" || lane === "mission" || lane === "notification") {
    return "high";
  }
  return "normal";
}

function getDefaultDelivery(
  lane: LucaLinkSyncLaneId,
): LucaLinkEnvelopeDelivery {
  if (lane === "presence") return "direct";
  return "relay";
}

function getDefaultRetryPolicy(
  lane: LucaLinkSyncLaneId,
): LucaLinkEnvelopeRetryPolicy {
  if (lane === "safety") return "persistent";
  if (
    lane === "identity" ||
    lane === "memory" ||
    lane === "settings" ||
    lane === "artifact"
  ) {
    return "persistent";
  }
  if (lane === "sensor") return "none";
  return "standard";
}

// ===========================================================================
// Factory and validation helpers
// ===========================================================================

export function createLucaLinkEnvelope<TLane extends LucaLinkSyncLaneId>(
  input: LucaLinkEnvelopeFactoryInput<TLane>,
): LucaLinkEnvelopeForLane<TLane> {
  const timestamp = input.timestamp ?? Date.now();
  const security: LucaLinkEnvelopeSecurity = {
    encrypted: input.lane !== "presence",
    signed: true,
    requiresAck: ACK_REQUIRED_LANES.has(input.lane),
    ...input.security,
  };
  const routing: LucaLinkEnvelopeRouting = {
    priority: getDefaultPriority(input.lane),
    delivery: getDefaultDelivery(input.lane),
    retryPolicy: getDefaultRetryPolicy(input.lane),
    ...input.routing,
  };

  return {
    version: LUCA_LINK_ENVELOPE_VERSION,
    id: input.id ?? createEnvelopeId(input.lane, timestamp),
    lane: input.lane,
    type: input.type,
    sourceDeviceId: input.sourceDeviceId,
    targetDeviceId: input.targetDeviceId,
    timestamp,
    security,
    routing,
    payload: input.payload,
  } as LucaLinkEnvelopeForLane<TLane>;
}

export function isKnownLane(lane: unknown): lane is LucaLinkSyncLaneId {
  return (
    typeof lane === "string" && LANE_DESCRIPTORS.has(lane as LucaLinkSyncLaneId)
  );
}

export function getLaneDescriptor(lane: unknown): LucaLinkSyncLane | undefined {
  return isKnownLane(lane) ? LANE_DESCRIPTORS.get(lane) : undefined;
}

export function getPayloadKind(envelope: {
  payload?: unknown;
}): string | undefined {
  if (!envelope.payload || typeof envelope.payload !== "object")
    return undefined;
  const kind = (envelope.payload as { kind?: unknown }).kind;
  return typeof kind === "string" ? kind : undefined;
}

export function isEnvelopeExpired(
  envelope: { security?: { expiresAt?: number } },
  now = Date.now(),
): boolean {
  return (
    typeof envelope.security?.expiresAt === "number" &&
    Number.isFinite(envelope.security.expiresAt) &&
    envelope.security.expiresAt <= now
  );
}

export function requiresEnvelopeAck(envelope: {
  security?: { requiresAck?: boolean };
}): boolean {
  return envelope.security?.requiresAck === true;
}

export function requiresEncryptedLane(lane: unknown): boolean {
  return isKnownLane(lane) && ENCRYPTION_REQUIRED_LANES.has(lane);
}

export function requiresSignedLane(lane: unknown): boolean {
  return isKnownLane(lane);
}

export function validateLucaLinkEnvelope(
  envelope: unknown,
): LucaLinkEnvelopeValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!envelope || typeof envelope !== "object") {
    return { valid: false, errors: ["envelope must be an object"], warnings };
  }

  const candidate = envelope as Partial<LucaLinkEnvelope>;
  if (candidate.version !== LUCA_LINK_ENVELOPE_VERSION) {
    errors.push("version must be luca-link/v1");
  }
  if (!candidate.id) errors.push("id is required");
  if (!isKnownLane(candidate.lane)) errors.push("lane must be known");
  if (!candidate.type) errors.push("type is required");
  if (!candidate.sourceDeviceId) errors.push("sourceDeviceId is required");
  if (!candidate.targetDeviceId) errors.push("targetDeviceId is required");
  if (
    typeof candidate.timestamp !== "number" ||
    !Number.isFinite(candidate.timestamp)
  ) {
    errors.push("timestamp must be a finite number");
  }
  if (!candidate.security || typeof candidate.security !== "object") {
    errors.push("security is required");
  } else {
    if (typeof candidate.security.encrypted !== "boolean") {
      errors.push("security.encrypted must be boolean");
    }
    if (typeof candidate.security.signed !== "boolean") {
      errors.push("security.signed must be boolean");
    }
    if (typeof candidate.security.requiresAck !== "boolean") {
      errors.push("security.requiresAck must be boolean");
    }
    if (
      candidate.security.trustLevelRequired !== undefined &&
      !TRUST_LEVEL_IDS.has(
        candidate.security.trustLevelRequired as LucaLinkTrustLevelId,
      )
    ) {
      errors.push("security.trustLevelRequired must be a known trust level");
    }
    if (
      candidate.security.expiresAt !== undefined &&
      (typeof candidate.security.expiresAt !== "number" ||
        !Number.isFinite(candidate.security.expiresAt))
    ) {
      errors.push("security.expiresAt must be a finite number");
    }
  }
  if (!candidate.routing || typeof candidate.routing !== "object") {
    errors.push("routing is required");
  } else {
    if (
      !PRIORITY_VALUES.has(
        candidate.routing.priority as LucaLinkEnvelopePriority,
      )
    ) {
      errors.push("routing.priority must be low, normal, high, or critical");
    }
    if (
      !DELIVERY_VALUES.has(
        candidate.routing.delivery as LucaLinkEnvelopeDelivery,
      )
    ) {
      errors.push(
        "routing.delivery must be direct, relay, local, or store-and-forward",
      );
    }
    if (
      !RETRY_POLICY_VALUES.has(
        candidate.routing.retryPolicy as LucaLinkEnvelopeRetryPolicy,
      )
    ) {
      errors.push("routing.retryPolicy must be none, standard, or persistent");
    }
  }
  if (candidate.payload === undefined || candidate.payload === null) {
    errors.push("payload is required");
  }

  if (isKnownLane(candidate.lane)) {
    const lane = candidate.lane;
    const kind = getPayloadKind(candidate);
    if (!kind) {
      errors.push("payload.kind is required");
    } else if (!PAYLOAD_KINDS[lane].has(kind)) {
      errors.push(`payload.kind ${kind} is not valid for lane ${lane}`);
    } else if (candidate.type && candidate.type !== kind) {
      warnings.push(`type ${candidate.type} differs from payload.kind ${kind}`);
    }

    if (requiresEncryptedLane(lane) && candidate.security?.encrypted !== true) {
      errors.push(`lane ${lane} requires encrypted security`);
    }
    if (requiresSignedLane(lane) && candidate.security?.signed !== true) {
      errors.push(`lane ${lane} requires signed security`);
    }
    if (
      ACK_REQUIRED_LANES.has(lane) &&
      candidate.security?.requiresAck !== true
    ) {
      errors.push(`lane ${lane} requires ack`);
    }
    if (
      lane === "safety" &&
      candidate.routing?.priority !== "critical" &&
      candidate.routing?.priority !== "high"
    ) {
      errors.push("safety lane priority must be critical or high");
    }
    if (lane === "safety" && candidate.security?.requiresAck !== true) {
      errors.push("safety lane requires ack");
    }
  }

  if (isEnvelopeExpired(candidate)) warnings.push("envelope is expired");

  return { valid: errors.length === 0, errors, warnings };
}

// ===========================================================================
// Pure policy bridge
// ===========================================================================

function getPayloadPermission(
  payload: unknown,
): LucaLinkPermissionCategory | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const permission = (payload as { permission?: unknown }).permission;
  return typeof permission === "string"
    ? (permission as LucaLinkPermissionCategory)
    : undefined;
}

export function evaluateEnvelopePolicy(
  manifest: LucaHostManifest,
  envelope: LucaLinkEnvelope,
  options: LucaLinkPolicyOptions = {},
): LucaLinkEnvelopePolicyEvaluation {
  const envelopeValidation = validateLucaLinkEnvelope(envelope);
  const lanePolicy = canHostParticipateInLane(manifest, envelope.lane, options);
  const permission = getPayloadPermission(envelope.payload);
  const permissionPolicy = permission
    ? evaluateHostPermission(manifest, permission, options)
    : undefined;
  const decisions = [lanePolicy.decision, permissionPolicy?.decision].filter(
    Boolean,
  );

  return {
    envelopeValidation,
    lanePolicy,
    permissionPolicy,
    valid: envelopeValidation.valid,
    allowed:
      envelopeValidation.valid &&
      decisions.every((decision) => decision === "allow"),
    requiresApproval: decisions.some(
      (decision) => decision === "requires-primary-host-approval",
    ),
  };
}

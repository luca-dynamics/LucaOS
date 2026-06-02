/**
 * LucaLink Host Mesh — Host Routing Engine (PR #187)
 *
 * Pure, additive routing engine for LucaLink Mesh. Given a routing task and a
 * set of candidate hosts (each described by a {@link LucaHostManifest} plus
 * optional transport/context hints), it SCORES and EXPLAINS which host is the
 * best candidate to handle the task.
 *
 * It builds on the existing additive LucaLink Mesh layers:
 * - PR #182 vocabularies (`lucaLinkArchitectureMap.ts`): roles, trust levels,
 *   permission risk bands, sync lanes.
 * - PR #183 manifest layer (`lucaHostManifest.ts` / `capabilityRegistry.ts`):
 *   host capabilities, hardware, trust grants.
 * - PR #184 trust policy (`lucaLinkTrustPolicy.ts`): permission + lane policy.
 * - PR #185 sync protocol (`lucaLinkSyncProtocol.ts`): envelope policy.
 *
 * HARD CONSTRAINTS (do not violate when editing this file):
 * - ADDITIVE + PURE. This module only scores and explains routing decisions.
 *   It does NOT enforce routing, send messages, or wire into live runtime.
 * - No network calls, no socket calls, no storage writes, no UI coupling.
 * - No camera/mic/location access, no shell execution, no filesystem access.
 * - No side effects at module import — pure functions + frozen data only.
 * - Preserves the Origin vs Primary Host boundary: `Origin` is reserved for the
 *   LucaOS Creator/source-code authority and is NEVER used here as a normal
 *   device mesh role, trust level, or approval concept. Normal device/mesh
 *   authority is `Primary Host`; the user's highest mesh trust is `owner`.
 *
 * NOTE: Wiring this engine into the live LucaLink runtime (transport, pairing,
 * relay/local/VPN, guest, WebRTC, crypto, mission/sensor sync, Settings UI) is
 * intentionally out of scope and lands in a follow-up PR.
 */

import {
  lucaLinkHostRoles,
  lucaLinkTrustLevels,
  type LucaLinkPermissionCategory,
  type LucaLinkSyncLaneId,
} from "./lucaLinkArchitectureMap";
import type {
  LucaHostCapabilities,
  LucaHostCapabilityKey,
  LucaHostManifest,
  LucaHostRole,
  LucaHostTrustLevel,
} from "./lucaHostManifest";
import {
  canHostParticipateInLane,
  evaluateHostPermission,
  type LucaLinkLaneEvaluation,
  type LucaLinkPolicyDecision,
  type LucaLinkPolicyEvaluation,
  type LucaLinkPolicyOptions,
} from "./lucaLinkTrustPolicy";
import {
  evaluateEnvelopePolicy,
  type LucaLinkEnvelope,
  type LucaLinkEnvelopeDelivery,
  type LucaLinkEnvelopePolicyEvaluation,
} from "./lucaLinkSyncProtocol";

// ===========================================================================
// 1. Routing task model
// ===========================================================================

export type LucaLinkRoutingTaskType =
  | "conversation"
  | "voice"
  | "vision"
  | "memory"
  | "settings"
  | "mission"
  | "sensor"
  | "tool"
  | "artifact"
  | "notification"
  | "model"
  | "safety";

export type LucaLinkRoutingRisk = "low" | "medium" | "high" | "critical";

export type LucaLinkRoutingPrivacy =
  | "local-only"
  | "trusted-only"
  | "relay-ok"
  | "guest-ok";

export type LucaLinkRoutingCompute = "low" | "medium" | "high" | "very-high";

export type LucaLinkRoutingLatencySensitivity =
  | "low"
  | "medium"
  | "high"
  | "realtime";

export interface LucaLinkRoutingTask {
  id: string;
  type: LucaLinkRoutingTaskType;
  lane?: LucaLinkSyncLaneId;
  title?: string;
  description?: string;

  requiredCapabilities?: Partial<Record<LucaHostCapabilityKey, boolean>>;
  preferredCapabilities?: Partial<Record<LucaHostCapabilityKey, boolean>>;
  requiredPermissions?: LucaLinkPermissionCategory[];

  risk?: LucaLinkRoutingRisk;
  privacy?: LucaLinkRoutingPrivacy;
  requiresUserPresence?: boolean;
  requiresPrimaryHostApproval?: boolean;

  expectedPayloadBytes?: number;
  estimatedCompute?: LucaLinkRoutingCompute;
  latencySensitivity?: LucaLinkRoutingLatencySensitivity;

  preferredDelivery?: LucaLinkEnvelopeDelivery;
  avoidRelay?: boolean;
  allowStoreAndForward?: boolean;

  sourceDeviceId?: string;
  activeUserDeviceId?: string;
}

// ===========================================================================
// 2. Routing candidate model
// ===========================================================================

export interface LucaLinkRoutingTransportHint {
  delivery: LucaLinkEnvelopeDelivery;
  latencyMs?: number;
  reachable: boolean;
  relayAvailable?: boolean;
  localAvailable?: boolean;
}

export interface LucaLinkRoutingContextHint {
  isActiveUserDevice?: boolean;
  isCurrentHost?: boolean;
  isPrimaryHost?: boolean;
  lastInteractionAt?: number;
}

export interface LucaLinkRoutingCandidate {
  manifest: LucaHostManifest;
  transport?: LucaLinkRoutingTransportHint;
  context?: LucaLinkRoutingContextHint;
}

// ===========================================================================
// 3. Scoring model
// ===========================================================================

export interface LucaLinkRoutingScoreBreakdown {
  capability: number;
  permission: number;
  trust: number;
  privacy: number;
  latency: number;
  battery: number;
  thermal: number;
  compute: number;
  userContext: number;
  transport: number;
  /** Risk fit (0–1) applied as a multiplicative penalty to the weighted total. */
  risk: number;
  /** Weighted, risk-adjusted total in the range 0–100. */
  total: number;
}

export interface LucaLinkRoutingWeights {
  capability: number;
  permission: number;
  trust: number;
  privacy: number;
  latency: number;
  compute: number;
  battery: number;
  thermal: number;
  userContext: number;
  transport: number;
}

/**
 * Default subscore weights. These sum to 1.0; the weighted base (0–1) is scaled
 * to 0–100 and then multiplied by the risk-fit subscore as a penalty.
 */
export const DEFAULT_ROUTING_WEIGHTS: Readonly<LucaLinkRoutingWeights> =
  Object.freeze({
    capability: 0.25,
    permission: 0.2,
    trust: 0.15,
    privacy: 0.1,
    latency: 0.08,
    compute: 0.08,
    battery: 0.04,
    thermal: 0.03,
    userContext: 0.04,
    transport: 0.03,
  });

export interface LucaLinkRoutingOptions {
  /** Clock override for deterministic tests. */
  now?: number;
  /** Subscore weight overrides (merged over {@link DEFAULT_ROUTING_WEIGHTS}). */
  weights?: Partial<LucaLinkRoutingWeights>;
  /** Permit critical-risk permissions for the local Primary Host/execution host. */
  allowCriticalForPrimaryHost?: boolean;
  /** Permit high-risk permissions for admin (and local execution) hosts. */
  allowHighRiskForAdmin?: boolean;
  /**
   * Optional pure builder that produces a representative envelope for the
   * selected host so the decision can carry a {@link LucaLinkEnvelopePolicyEvaluation}.
   * Must be side-effect free. When omitted, no envelope policy is computed.
   */
  buildProbeEnvelope?: (
    task: LucaLinkRoutingTask,
    candidate: LucaLinkRoutingCandidate,
  ) => LucaLinkEnvelope;
}

// ===========================================================================
// 4. Routing result model
// ===========================================================================

export interface LucaLinkRankedHost {
  candidate: LucaLinkRoutingCandidate;
  score: LucaLinkRoutingScoreBreakdown;
  reasons: string[];
  warnings: string[];
}

export interface LucaLinkBlockedHost {
  candidate: LucaLinkRoutingCandidate;
  reasons: string[];
  policyDecision?: LucaLinkPolicyDecision;
}

export interface LucaLinkHostRouteDecision {
  taskId: string;
  selectedHost?: LucaHostManifest;
  selectedCandidate?: LucaLinkRoutingCandidate;
  fallbackHosts: LucaLinkRoutingCandidate[];
  blockedHosts: LucaLinkBlockedHost[];
  rankedCandidates: LucaLinkRankedHost[];
  requiresPrimaryHostApproval: boolean;
  approvalReasons: string[];
  envelopePolicy?: LucaLinkEnvelopePolicyEvaluation;
  explain: string;
}

// ===========================================================================
// Frozen lookup tables
// ===========================================================================

const ROLE_LABEL: Readonly<Record<LucaHostRole, string>> = Object.freeze(
  Object.fromEntries(
    lucaLinkHostRoles.map((r) => [r.id, r.label]),
  ) as Record<LucaHostRole, string>,
);

const TRUST_RANK: Readonly<Record<LucaHostTrustLevel, number>> = Object.freeze(
  Object.fromEntries(
    lucaLinkTrustLevels.map((t) => [t.id, t.rank]),
  ) as Record<LucaHostTrustLevel, number>,
);

/** Permissions that mutate state / execute tools (need Primary Host approval). */
const TOOL_EXEC_PERMISSIONS: ReadonlySet<LucaLinkPermissionCategory> = new Set([
  "shell.execute",
  "browser.control",
  "files.write",
  "code.modify",
  "git.create_pr",
]);

/** Task types a guest host must never be selected for. */
const GUEST_FORBIDDEN_TASK_TYPES: ReadonlySet<LucaLinkRoutingTaskType> = new Set(
  ["memory", "tool", "safety", "model", "artifact"],
);

/** Default sync lane per task type (some task types are lane-agnostic). */
const DEFAULT_TASK_LANE: Readonly<
  Partial<Record<LucaLinkRoutingTaskType, LucaLinkSyncLaneId>>
> = Object.freeze({
  conversation: "conversation",
  memory: "memory",
  settings: "settings",
  mission: "mission",
  sensor: "sensor",
  tool: "tool",
  artifact: "artifact",
  notification: "notification",
  model: "model",
  safety: "safety",
});

/** Maps a permission to the advertised capability that provides it. */
const PERMISSION_TO_CAPABILITY: Readonly<
  Partial<Record<LucaLinkPermissionCategory, LucaHostCapabilityKey>>
> = Object.freeze({
  "shell.execute": "shellAccess",
  "code.modify": "codeExecution",
  "files.read": "fileAccess",
  "files.write": "fileAccess",
  "browser.control": "browserControl",
  "camera.capture": "visionCapture",
  "screen.capture": "screenUnderstanding",
  "voice.capture": "voiceInput",
  "voice.playback": "voiceOutput",
  "notification.send": "notifications",
  "smart_home.control": "smartHomeControl",
  "robotics.motion": "roboticsControl",
});

// ===========================================================================
// Small pure helpers
// ===========================================================================

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function taskText(task: LucaLinkRoutingTask): string {
  return `${task.title ?? ""} ${task.description ?? ""}`.toLowerCase();
}

function hasCapability(
  manifest: LucaHostManifest,
  key: LucaHostCapabilityKey,
): boolean {
  return manifest.capabilities[key as keyof LucaHostCapabilities] === true;
}

function trustRank(manifest: LucaHostManifest): number {
  return TRUST_RANK[manifest.trust.trustLevel] ?? 0;
}

function isPrimaryHostCandidate(candidate: LucaLinkRoutingCandidate): boolean {
  const ctx = candidate.context;
  if (ctx?.isPrimaryHost === true) return true;
  // The local/current desktop host acting as primary/execution is treated as
  // the Primary Host for policy elevation purposes.
  return (
    ctx?.isCurrentHost === true &&
    (candidate.manifest.hostRole === "primary" ||
      candidate.manifest.hostRole === "execution")
  );
}

function policyOptionsFor(
  candidate: LucaLinkRoutingCandidate,
  options: LucaLinkRoutingOptions,
): LucaLinkPolicyOptions {
  return {
    now: options.now,
    isPrimaryHost: isPrimaryHostCandidate(candidate),
    allowCriticalForPrimaryHost: options.allowCriticalForPrimaryHost,
    allowHighRiskForAdmin: options.allowHighRiskForAdmin,
  };
}

function isHeavyTask(task: LucaLinkRoutingTask): boolean {
  if (task.estimatedCompute === "high" || task.estimatedCompute === "very-high") {
    return true;
  }
  return task.type === "tool" || task.type === "model" || task.type === "artifact";
}

function isCriticalTask(task: LucaLinkRoutingTask): boolean {
  return task.risk === "critical" || task.type === "safety";
}

// ===========================================================================
// 6. Required capabilities / permissions / lane per task
// ===========================================================================

/**
 * Resolve the capabilities a host MUST advertise to handle this task. Merges
 * conservative task-type defaults with the caller's explicit requirements and
 * the capabilities implied by the task's required permissions.
 */
export function getRequiredCapabilitiesForTask(
  task: LucaLinkRoutingTask,
): Partial<Record<LucaHostCapabilityKey, boolean>> {
  const required: Partial<Record<LucaHostCapabilityKey, boolean>> = {};
  const text = taskText(task);

  switch (task.type) {
    case "conversation":
      required.chat = true;
      break;
    case "voice":
      if (/listen|capture|record|microphone|hear|stt|transcrib/.test(text)) {
        required.voiceInput = true;
      } else {
        required.voiceOutput = true;
      }
      break;
    case "vision":
      if (/screen|monitor|window|desktop ui/.test(text)) {
        required.screenUnderstanding = true;
      } else {
        required.visionCapture = true;
      }
      break;
    case "notification":
      required.notifications = true;
      break;
    case "model":
      required.localModels = true;
      break;
    default:
      break;
  }

  // Capabilities implied by required permissions (e.g. shell.execute → shellAccess).
  for (const perm of task.requiredPermissions ?? []) {
    const cap = PERMISSION_TO_CAPABILITY[perm];
    if (cap) required[cap] = true;
  }

  // Explicit caller requirements win.
  return { ...required, ...(task.requiredCapabilities ?? {}) };
}

/**
 * Resolve the permission categories a host MUST hold to handle this task.
 * Merges task-type defaults (direction-aware) with the caller's explicit list.
 */
export function getRequiredPermissionsForTask(
  task: LucaLinkRoutingTask,
): LucaLinkPermissionCategory[] {
  const perms = new Set<LucaLinkPermissionCategory>(
    task.requiredPermissions ?? [],
  );
  const text = taskText(task);

  switch (task.type) {
    case "conversation":
      perms.add("chat.send");
      perms.add("chat.receive");
      break;
    case "voice":
      if (/listen|capture|record|microphone|hear|stt|transcrib/.test(text)) {
        perms.add("voice.capture");
      } else {
        perms.add("voice.playback");
      }
      break;
    case "vision":
      if (/screen|monitor|window|desktop ui/.test(text)) {
        perms.add("screen.capture");
      } else {
        perms.add("camera.capture");
      }
      break;
    case "memory":
      perms.add("memory.read");
      if (/write|save|store|remember|persist|mutate|update/.test(text)) {
        perms.add("memory.write");
      }
      break;
    case "settings":
      perms.add("settings.sync");
      break;
    case "mission":
      perms.add("memory.read");
      break;
    case "notification":
      perms.add("notification.send");
      break;
    default:
      break;
  }

  return [...perms];
}

/** Resolve the effective sync lane for a task (explicit lane wins). */
export function getLaneForTask(
  task: LucaLinkRoutingTask,
): LucaLinkSyncLaneId | undefined {
  return task.lane ?? DEFAULT_TASK_LANE[task.type];
}

// ===========================================================================
// Eligibility (hard blocks)
// ===========================================================================

export interface LucaLinkEligibilityResult {
  eligible: boolean;
  reasons: string[];
  policyDecision?: LucaLinkPolicyDecision;
  /** Permission evaluations that require Primary Host approval (not blocking). */
  approvalReasons: string[];
  lane?: LucaLinkSyncLaneId;
  laneEvaluation?: LucaLinkLaneEvaluation;
  permissionEvaluations: LucaLinkPolicyEvaluation[];
}

/**
 * Decide whether a candidate host is eligible (not hard-blocked) for a task,
 * collecting human-readable block reasons and any Primary Host approval flags.
 * Pure; no side effects.
 */
export function isHostEligibleForTask(
  candidate: LucaLinkRoutingCandidate,
  task: LucaLinkRoutingTask,
  options: LucaLinkRoutingOptions = {},
): LucaLinkEligibilityResult {
  const manifest = candidate.manifest;
  const role = manifest.hostRole;
  const reasons: string[] = [];
  const approvalReasons: string[] = [];
  let policyDecision: LucaLinkPolicyDecision | undefined;

  const policyOpts = policyOptionsFor(candidate, options);
  const lane = getLaneForTask(task);
  const requiredCaps = getRequiredCapabilitiesForTask(task);
  const requiredPerms = getRequiredPermissionsForTask(task);

  // --- Transport reachability ---------------------------------------------
  const transport = candidate.transport;
  if (transport && transport.reachable === false) {
    reasons.push("Host is unreachable over its transport.");
  }

  // --- Store-and-forward gating -------------------------------------------
  if (
    transport &&
    transport.delivery === "store-and-forward" &&
    task.allowStoreAndForward !== true &&
    transport.localAvailable !== true &&
    transport.relayAvailable !== true
  ) {
    reasons.push(
      "Only store-and-forward delivery is available but the task does not allow it.",
    );
  }

  // --- Required capabilities ----------------------------------------------
  for (const [key, needed] of Object.entries(requiredCaps)) {
    if (needed && !hasCapability(manifest, key as LucaHostCapabilityKey)) {
      reasons.push(`Host is missing required capability: ${key}.`);
    }
  }

  // --- Role/task hard guards ----------------------------------------------
  if (role === "guest" && GUEST_FORBIDDEN_TASK_TYPES.has(task.type)) {
    reasons.push(`Guest hosts may not handle ${task.type} tasks.`);
  }
  if (
    role === "companion" &&
    requiredPerms.some((p) => TOOL_EXEC_PERMISSIONS.has(p))
  ) {
    reasons.push(
      "Companion hosts may not perform shell/code/file-mutation tasks.",
    );
  }

  // --- Privacy hard blocks ------------------------------------------------
  const privacyBlock = evaluatePrivacyBlock(candidate, task);
  if (privacyBlock) reasons.push(privacyBlock);

  // --- Lane policy ---------------------------------------------------------
  let laneEvaluation: LucaLinkLaneEvaluation | undefined;
  if (lane) {
    laneEvaluation = canHostParticipateInLane(manifest, lane, policyOpts);
    if (laneEvaluation.decision === "deny") {
      policyDecision = "deny";
      reasons.push(
        `Host role ${ROLE_LABEL[role]} is not permitted in the ${lane} lane.`,
      );
    } else if (laneEvaluation.decision === "requires-primary-host-approval") {
      approvalReasons.push(`Lane ${lane} requires Primary Host approval.`);
    }
  }

  // --- Required permission policy -----------------------------------------
  const permissionEvaluations: LucaLinkPolicyEvaluation[] = [];
  for (const perm of requiredPerms) {
    const evalResult = evaluateHostPermission(manifest, perm, policyOpts);
    permissionEvaluations.push(evalResult);
    if (evalResult.decision === "deny") {
      policyDecision = "deny";
      reasons.push(`Permission ${perm} denied for this host (${evalResult.reason}).`);
    } else if (evalResult.decision === "requires-primary-host-approval") {
      approvalReasons.push(`Permission ${perm} requires Primary Host approval.`);
    }
  }

  // --- Battery / thermal hard blocks --------------------------------------
  const battery = manifest.hardware.batteryLevel;
  const thermal = manifest.hardware.thermalState;
  const heavy = isHeavyTask(task);
  const critical = isCriticalTask(task);

  if (
    typeof battery === "number" &&
    battery < 5 &&
    heavy &&
    !critical
  ) {
    reasons.push("Battery critically low (<5%) for a heavy non-critical task.");
  }
  if (thermal === "critical" && heavy && !critical) {
    reasons.push("Thermal state critical for a heavy compute task.");
  }

  return {
    eligible: reasons.length === 0,
    reasons,
    policyDecision,
    approvalReasons,
    lane,
    laneEvaluation,
    permissionEvaluations,
  };
}

/**
 * Pure privacy hard-block evaluation. Returns a block reason string when the
 * candidate is disallowed by the task's privacy requirement, otherwise null.
 */
function evaluatePrivacyBlock(
  candidate: LucaLinkRoutingCandidate,
  task: LucaLinkRoutingTask,
): string | null {
  const privacy = task.privacy;
  if (!privacy) return null;

  const manifest = candidate.manifest;
  const role = manifest.hostRole;
  const trust = manifest.trust.trustLevel;
  const transport = candidate.transport;
  const isLocal =
    candidate.context?.isCurrentHost === true ||
    candidate.context?.isPrimaryHost === true ||
    transport?.localAvailable === true ||
    transport?.delivery === "local";
  const relayOnly =
    transport?.delivery === "relay" &&
    transport?.localAvailable !== true;

  const lowRiskConversation =
    (task.type === "conversation" || task.type === "notification") &&
    (task.risk === undefined || task.risk === "low" || task.risk === "medium");

  switch (privacy) {
    case "local-only":
      if (role === "guest" || trust === "guest") {
        return "local-only task cannot use a guest host.";
      }
      if (relayOnly) {
        return "local-only task cannot use a relay-only host.";
      }
      if (!isLocal && trustRank(manifest) < TRUST_RANK.trusted) {
        return "local-only task cannot use an untrusted remote host.";
      }
      return null;
    case "trusted-only":
      if (role === "guest" || trust === "guest") {
        return "trusted-only task cannot use a guest host.";
      }
      if (trust === "paired" && !lowRiskConversation) {
        return "trusted-only task cannot use a low-trust paired host.";
      }
      return null;
    case "relay-ok":
      return null;
    case "guest-ok":
      if (role === "guest" && !lowRiskConversation) {
        return "guest host may only handle low-risk conversation/display tasks.";
      }
      return null;
    default:
      return null;
  }
}

// ===========================================================================
// 5. Subscore helpers
// ===========================================================================

function scoreCapability(
  manifest: LucaHostManifest,
  task: LucaLinkRoutingTask,
): number {
  const required = getRequiredCapabilitiesForTask(task);
  const preferred = task.preferredCapabilities ?? {};

  const requiredKeys = Object.entries(required)
    .filter(([, v]) => v)
    .map(([k]) => k as LucaHostCapabilityKey);
  const preferredKeys = Object.entries(preferred)
    .filter(([, v]) => v)
    .map(([k]) => k as LucaHostCapabilityKey);

  // Eligible hosts already satisfy required caps; reward preferred coverage.
  const requiredMet =
    requiredKeys.length === 0
      ? 1
      : requiredKeys.filter((k) => hasCapability(manifest, k)).length /
        requiredKeys.length;

  const preferredMet =
    preferredKeys.length === 0
      ? 1
      : preferredKeys.filter((k) => hasCapability(manifest, k)).length /
        preferredKeys.length;

  if (requiredKeys.length === 0 && preferredKeys.length === 0) {
    return 0.7; // neutral: task imposes no explicit capability needs
  }
  return clamp01(0.75 * requiredMet + 0.25 * preferredMet);
}

function scorePermission(
  permissionEvaluations: LucaLinkPolicyEvaluation[],
): number {
  if (permissionEvaluations.length === 0) return 0.8; // permissionless → neutral-high
  const total = permissionEvaluations.reduce((sum, e) => {
    if (e.decision === "allow") return sum + 1;
    if (e.decision === "requires-primary-host-approval") return sum + 0.6;
    return sum; // deny would have blocked eligibility
  }, 0);
  return clamp01(total / permissionEvaluations.length);
}

function scoreTrust(manifest: LucaHostManifest): number {
  const maxRank = TRUST_RANK.owner; // 4
  return clamp01(trustRank(manifest) / maxRank);
}

function scorePrivacy(
  candidate: LucaLinkRoutingCandidate,
  task: LucaLinkRoutingTask,
): number {
  const privacy = task.privacy;
  const manifest = candidate.manifest;
  const transport = candidate.transport;
  const isLocal =
    candidate.context?.isCurrentHost === true ||
    candidate.context?.isPrimaryHost === true ||
    transport?.localAvailable === true ||
    transport?.delivery === "local";
  const isRelay = transport?.delivery === "relay";

  switch (privacy) {
    case "local-only":
      if (isLocal) return 1;
      return trustRank(manifest) >= TRUST_RANK.trusted ? 0.55 : 0.25;
    case "trusted-only":
      return clamp01(0.3 + 0.175 * trustRank(manifest));
    case "relay-ok":
      return isLocal ? 1 : isRelay ? 0.8 : 0.85;
    case "guest-ok":
      return 0.75;
    default:
      return isLocal ? 0.9 : 0.8; // no explicit privacy → mild local preference
  }
}

const LATENCY_SENSITIVITY_WEIGHT: Readonly<
  Record<LucaLinkRoutingLatencySensitivity, number>
> = Object.freeze({ low: 0.3, medium: 0.6, high: 0.85, realtime: 1 });

function scoreLatency(
  candidate: LucaLinkRoutingCandidate,
  task: LucaLinkRoutingTask,
): number {
  const latency = candidate.transport?.latencyMs;
  if (typeof latency !== "number") return 0.7; // unknown → neutral
  let base: number;
  if (latency <= 50) base = 1;
  else if (latency <= 150) base = 0.85;
  else if (latency <= 300) base = 0.7;
  else if (latency <= 600) base = 0.5;
  else if (latency <= 1000) base = 0.3;
  else base = 0.15;

  const weight = LATENCY_SENSITIVITY_WEIGHT[task.latencySensitivity ?? "low"];
  return clamp01(1 - weight * (1 - base));
}

function scoreBattery(
  manifest: LucaHostManifest,
  task: LucaLinkRoutingTask,
): number {
  const battery = manifest.hardware.batteryLevel;
  if (typeof battery !== "number") return 0.7; // no data → neutral
  let base: number;
  if (battery >= 60) base = 1;
  else if (battery >= 30) base = 0.8;
  else if (battery >= 15) base = 0.6;
  else if (battery >= 5) base = 0.35;
  else base = 0.15;

  // Safety/critical work should not be penalized off a low-battery host.
  if (isCriticalTask(task)) return Math.max(base, 0.6);
  return base;
}

function scoreThermal(manifest: LucaHostManifest): number {
  switch (manifest.hardware.thermalState) {
    case "normal":
      return 1;
    case "warm":
      return 0.85;
    case "hot":
      return 0.45;
    case "critical":
      return 0.15;
    case "unknown":
    default:
      return 0.8; // no data → neutral, not failing
  }
}

const ROLE_COMPUTE_FITNESS: Readonly<Record<LucaHostRole, number>> =
  Object.freeze({
    execution: 1,
    primary: 0.9,
    embodied: 0.6,
    companion: 0.6,
    display: 0.4,
    sensor: 0.4,
    guest: 0.4,
  });

function scoreCompute(
  manifest: LucaHostManifest,
  task: LucaLinkRoutingTask,
): number {
  const role = manifest.hostRole;
  let score = ROLE_COMPUTE_FITNESS[role];

  const heavy =
    task.estimatedCompute === "high" || task.estimatedCompute === "very-high";
  const computeRole = role === "execution" || role === "primary";

  if ((task.type === "tool" || task.type === "model") && computeRole) {
    score = Math.max(score, 0.9);
  }
  if (heavy && !computeRole) {
    score *= 0.6; // weak hosts are poor fits for heavy compute
  }

  if (task.type === "model") {
    score = manifest.capabilities.localModels ? Math.min(1, score + 0.15) : 0.5;
  }

  // Hardware signals help heavy compute tasks.
  const hw = manifest.hardware;
  if (heavy) {
    if (hw.gpu || hw.npu) score = Math.min(1, score + 0.1);
    if (typeof hw.memoryGb === "number" && hw.memoryGb >= 16) {
      score = Math.min(1, score + 0.05);
    }
  }

  return clamp01(score);
}

function scoreUserContext(
  candidate: LucaLinkRoutingCandidate,
  task: LucaLinkRoutingTask,
  now: number,
): number {
  const ctx = candidate.context;
  let score = 0.5;
  const isActiveUserDevice =
    ctx?.isActiveUserDevice === true ||
    (task.activeUserDeviceId !== undefined &&
      task.activeUserDeviceId === candidate.manifest.deviceId);

  if (isActiveUserDevice) score += 0.4;
  if (ctx?.isCurrentHost) score += 0.2;
  if (ctx?.isPrimaryHost) score += 0.1;

  if (typeof ctx?.lastInteractionAt === "number") {
    const ageMs = now - ctx.lastInteractionAt;
    if (ageMs >= 0 && ageMs <= 5 * 60_000) score += 0.05; // interacted in last 5m
  }

  score = clamp01(score);

  if (task.requiresUserPresence && !isActiveUserDevice) {
    score *= 0.3; // strongly disfavor hosts away from the active user
  }
  return clamp01(score);
}

function scoreTransport(
  candidate: LucaLinkRoutingCandidate,
  task: LucaLinkRoutingTask,
): number {
  const transport = candidate.transport;
  if (!transport) return 0.6; // unknown transport → neutral
  let score: number;
  switch (transport.delivery) {
    case "local":
      score = 1;
      break;
    case "direct":
      score = 0.9;
      break;
    case "relay":
      score = 0.5;
      break;
    case "store-and-forward":
      score = 0.4;
      break;
    default:
      score = 0.5;
  }

  const sensitivity = task.latencySensitivity ?? "low";
  const wantsImmediate = sensitivity === "high" || sensitivity === "realtime";
  if (wantsImmediate && transport.delivery === "relay") score *= 0.6;
  if (wantsImmediate && transport.delivery === "store-and-forward") score *= 0.4;

  if (task.avoidRelay && transport.delivery === "relay") score *= 0.5;
  if (
    task.preferredDelivery &&
    transport.delivery === task.preferredDelivery
  ) {
    score = Math.min(1, score + 0.05);
  }
  return clamp01(score);
}

const RISK_REQUIRED_RANK: Readonly<Record<LucaLinkRoutingRisk, number>> =
  Object.freeze({ low: 0, medium: 1, high: 2, critical: 3 });

function scoreRisk(
  manifest: LucaHostManifest,
  task: LucaLinkRoutingTask,
): number {
  const needed = RISK_REQUIRED_RANK[task.risk ?? "low"];
  const have = trustRank(manifest);
  if (have >= needed) return 1;
  const deficit = needed - have;
  return clamp01(1 - 0.25 * deficit);
}

// ===========================================================================
// scoreHostForTask
// ===========================================================================

/**
 * Compute the full subscore breakdown for a candidate against a task. Pure.
 * Does not consider hard eligibility — callers should filter with
 * {@link isHostEligibleForTask} first (the engine does this in
 * {@link routeLucaLinkTask}).
 */
export function scoreHostForTask(
  candidate: LucaLinkRoutingCandidate,
  task: LucaLinkRoutingTask,
  options: LucaLinkRoutingOptions = {},
): LucaLinkRoutingScoreBreakdown {
  const now = options.now ?? Date.now();
  const manifest = candidate.manifest;
  const policyOpts = policyOptionsFor(candidate, options);

  const permissionEvaluations = getRequiredPermissionsForTask(task).map((perm) =>
    evaluateHostPermission(manifest, perm, policyOpts),
  );

  const weights: LucaLinkRoutingWeights = {
    ...DEFAULT_ROUTING_WEIGHTS,
    ...(options.weights ?? {}),
  };

  const capability = scoreCapability(manifest, task);
  const permission = scorePermission(permissionEvaluations);
  const trust = scoreTrust(manifest);
  const privacy = scorePrivacy(candidate, task);
  const latency = scoreLatency(candidate, task);
  const battery = scoreBattery(manifest, task);
  const thermal = scoreThermal(manifest);
  const compute = scoreCompute(manifest, task);
  const userContext = scoreUserContext(candidate, task, now);
  const transport = scoreTransport(candidate, task);
  const risk = scoreRisk(manifest, task);

  const base =
    weights.capability * capability +
    weights.permission * permission +
    weights.trust * trust +
    weights.privacy * privacy +
    weights.latency * latency +
    weights.compute * compute +
    weights.battery * battery +
    weights.thermal * thermal +
    weights.userContext * userContext +
    weights.transport * transport;

  const total = clamp01(base) * 100 * risk;

  return {
    capability,
    permission,
    trust,
    privacy,
    latency,
    battery,
    thermal,
    compute,
    userContext,
    transport,
    risk,
    total: Math.round(total * 100) / 100,
  };
}

// ===========================================================================
// Reasons / warnings for a ranked host
// ===========================================================================

function buildHostReasons(
  candidate: LucaLinkRoutingCandidate,
  task: LucaLinkRoutingTask,
  eligibility: LucaLinkEligibilityResult,
): { reasons: string[]; warnings: string[] } {
  const reasons: string[] = [];
  const warnings: string[] = [];
  const manifest = candidate.manifest;
  const roleLabel = ROLE_LABEL[manifest.hostRole];

  const presentCaps = Object.entries(getRequiredCapabilitiesForTask(task))
    .filter(([k, v]) => v && hasCapability(manifest, k as LucaHostCapabilityKey))
    .map(([k]) => k);
  if (presentCaps.length) {
    reasons.push(`${roleLabel} provides required capabilities: ${presentCaps.join(", ")}.`);
  } else {
    reasons.push(`${roleLabel} is role-appropriate for ${task.type} tasks.`);
  }

  if (candidate.context?.isActiveUserDevice) {
    reasons.push("Host is the active user device.");
  }
  if (candidate.context?.isPrimaryHost) {
    reasons.push("Host is the Primary Host.");
  }
  if (candidate.transport?.delivery === "local") {
    reasons.push("Reachable over local transport.");
  }

  if (eligibility.approvalReasons.length) {
    warnings.push(...eligibility.approvalReasons);
  }

  const battery = manifest.hardware.batteryLevel;
  if (typeof battery === "number" && battery < 15) {
    warnings.push(`Battery is low (${battery}%).`);
  }
  if (manifest.hardware.thermalState === "hot") {
    warnings.push("Host is running hot.");
  }
  if (candidate.transport?.delivery === "relay") {
    warnings.push("Reachable only over relay transport.");
  }

  return { reasons, warnings };
}

// ===========================================================================
// rankLucaLinkHosts
// ===========================================================================

/**
 * Rank every ELIGIBLE candidate for a task by total score (descending). Blocked
 * hosts are excluded. Pure; no side effects.
 */
export function rankLucaLinkHosts(
  task: LucaLinkRoutingTask,
  candidates: readonly LucaLinkRoutingCandidate[],
  options: LucaLinkRoutingOptions = {},
): LucaLinkRankedHost[] {
  const ranked: LucaLinkRankedHost[] = [];

  for (const candidate of candidates) {
    const eligibility = isHostEligibleForTask(candidate, task, options);
    if (!eligibility.eligible) continue;
    const score = scoreHostForTask(candidate, task, options);
    const { reasons, warnings } = buildHostReasons(candidate, task, eligibility);
    ranked.push({ candidate, score, reasons, warnings });
  }

  ranked.sort((a, b) => b.score.total - a.score.total);
  return ranked;
}

// ===========================================================================
// routeLucaLinkTask
// ===========================================================================

function buildApprovalState(
  selected: LucaLinkRankedHost | undefined,
  task: LucaLinkRoutingTask,
  options: LucaLinkRoutingOptions,
): { requiresApproval: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (task.requiresPrimaryHostApproval) {
    reasons.push("Task explicitly requires Primary Host approval.");
  }
  if (!selected) {
    return { requiresApproval: reasons.length > 0, reasons };
  }

  const eligibility = isHostEligibleForTask(selected.candidate, task, options);
  for (const reason of eligibility.approvalReasons) {
    if (!reasons.includes(reason)) reasons.push(reason);
  }

  // Execution hosts running tool/code/file work always surface as approval.
  const role = selected.candidate.manifest.hostRole;
  const requiredPerms = getRequiredPermissionsForTask(task);
  if (
    role === "execution" &&
    requiredPerms.some((p) => TOOL_EXEC_PERMISSIONS.has(p))
  ) {
    const reason = "Execution host tool/code/file action requires Primary Host approval.";
    if (!reasons.includes(reason)) reasons.push(reason);
  }

  return { requiresApproval: reasons.length > 0, reasons };
}

function buildDecisionExplanation(
  task: LucaLinkRoutingTask,
  selected: LucaLinkRankedHost | undefined,
  requiresApproval: boolean,
  approvalReasons: string[],
  blocked: LucaLinkBlockedHost[],
): string {
  if (!selected) {
    const blockedSummary = blocked.length
      ? ` ${blocked.length} candidate(s) were blocked.`
      : "";
    return `No eligible host found for ${task.type} task ${task.id}.${blockedSummary}`;
  }
  const manifest = selected.candidate.manifest;
  const roleLabel = ROLE_LABEL[manifest.hostRole];
  const lead = `Selected ${roleLabel} "${manifest.deviceName}" for ${task.type} task ${task.id}`;
  const reasonText = selected.reasons.length
    ? ` because ${lowerFirst(selected.reasons.join(" "))}`
    : ".";
  const approvalText = requiresApproval
    ? ` Requires Primary Host approval: ${approvalReasons.join(" ")}`
    : "";
  return `${lead}${reasonText}${approvalText}`.trim();
}

function lowerFirst(text: string): string {
  return text.length ? text[0].toLowerCase() + text.slice(1) : text;
}

/**
 * Route a LucaLink task to the best candidate host. Returns ranked candidates,
 * the selected host, fallbacks, blocked hosts, approval requirements, and a
 * human-readable explanation. Pure; scores and explains only — it never sends,
 * enforces, or mutates anything.
 */
export function routeLucaLinkTask(
  task: LucaLinkRoutingTask,
  candidates: readonly LucaLinkRoutingCandidate[],
  options: LucaLinkRoutingOptions = {},
): LucaLinkHostRouteDecision {
  const blockedHosts: LucaLinkBlockedHost[] = [];
  const eligibleCandidates: LucaLinkRoutingCandidate[] = [];

  for (const candidate of candidates) {
    const eligibility = isHostEligibleForTask(candidate, task, options);
    if (eligibility.eligible) {
      eligibleCandidates.push(candidate);
    } else {
      blockedHosts.push({
        candidate,
        reasons: eligibility.reasons,
        policyDecision: eligibility.policyDecision,
      });
    }
  }

  const rankedCandidates = rankLucaLinkHosts(task, eligibleCandidates, options);
  const selected = rankedCandidates[0];

  const { requiresApproval, reasons: approvalReasons } = buildApprovalState(
    selected,
    task,
    options,
  );

  const fallbackHosts = rankedCandidates
    .slice(1)
    .map((ranked) => ranked.candidate);

  let envelopePolicy: LucaLinkEnvelopePolicyEvaluation | undefined;
  if (selected && options.buildProbeEnvelope) {
    const envelope = options.buildProbeEnvelope(task, selected.candidate);
    envelopePolicy = evaluateEnvelopePolicy(
      selected.candidate.manifest,
      envelope,
      policyOptionsFor(selected.candidate, options),
    );
  }

  const explain = buildDecisionExplanation(
    task,
    selected,
    requiresApproval,
    approvalReasons,
    blockedHosts,
  );

  return {
    taskId: task.id,
    selectedHost: selected?.candidate.manifest,
    selectedCandidate: selected?.candidate,
    fallbackHosts,
    blockedHosts,
    rankedCandidates,
    requiresPrimaryHostApproval: requiresApproval,
    approvalReasons,
    envelopePolicy,
    explain,
  };
}

/** Return the human-readable explanation for a route decision. */
export function explainRouteDecision(
  decision: LucaLinkHostRouteDecision,
): string {
  return decision.explain;
}

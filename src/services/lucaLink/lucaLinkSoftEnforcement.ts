/**
 * LucaLink Soft Enforcement (PR #191)
 *
 * Pure, default-off high-risk gate classifier for LucaLink runtime envelopes and
 * legacy events. This module does not send, store, prompt, open sockets, touch
 * browser APIs, or execute tools. Runtime callers may opt in to high-risk-only
 * blocking, but disabled/observe-only modes never block.
 */

import { createDefaultHostManifest } from "./capabilityRegistry";
import type { LucaLinkPermissionCategory } from "./lucaLinkArchitectureMap";
import type { LucaHostManifest } from "./lucaHostManifest";
import {
  legacyEventToEnvelope,
  type LucaLinkLegacyEventInput,
} from "./lucaLinkLegacyAdapter";
import {
  canHostParticipateInLane,
  evaluateHostPermission,
  getPermissionRisk,
  isKnownPermission,
  type LucaLinkRiskLevel,
} from "./lucaLinkTrustPolicy";
import {
  evaluateEnvelopePolicy,
  isKnownLane,
  type LucaLinkEnvelope,
  validateLucaLinkEnvelope,
} from "./lucaLinkSyncProtocol";

export type LucaLinkSoftEnforcementMode =
  | "disabled"
  | "observe-only"
  | "high-risk-only";

export type LucaLinkSoftEnforcementDecision =
  | "allow"
  | "deny"
  | "requires-primary-host-approval"
  | "observe-only";

export type LucaLinkSoftEnforcementReason =
  | "mode-disabled"
  | "low-risk-allowed"
  | "shadow-only"
  | "guest-restricted-lane"
  | "guest-restricted-permission"
  | "high-risk-permission"
  | "critical-risk-permission"
  | "physical-world-action"
  | "primary-host-approval-required"
  | "policy-denied"
  | "policy-requires-approval"
  | "validation-failed"
  | "unknown-event"
  | "unsupported-lane"
  | "safe-runtime-flow";

export interface LucaLinkSoftEnforcementResult {
  decision: LucaLinkSoftEnforcementDecision;
  reason: LucaLinkSoftEnforcementReason;
  enforceable: boolean;
  blocked: boolean;
  requiresPrimaryHostApproval: boolean;
  eventName?: string;
  lane?: string;
  permission?: string;
  risk?: "low" | "medium" | "high" | "critical";
  explain: string;
  warnings: string[];
  errors: string[];
}

export interface LucaLinkSoftEnforcementOptions {
  mode?: LucaLinkSoftEnforcementMode;
  now?: number;
  sourceManifest?: LucaHostManifest;
  candidates?: readonly LucaHostManifest[];
  allowPrimaryHostCritical?: boolean;
  allowGuestConversation?: boolean;
}

type UnknownRecord = Record<string, unknown>;

/** Product default: observe high-risk signals without blocking transport. */
const DEFAULT_MODE: LucaLinkSoftEnforcementMode = "observe-only";

const RESTRICTED_GUEST_LANES: ReadonlySet<string> = new Set([
  "memory",
  "tool",
  "safety",
]);

const APPROVAL_PERMISSIONS: ReadonlySet<string> = new Set([
  "shell.execute",
  "files.write",
  "code.modify",
  "git.create_pr",
  "browser.control",
  "robotics.motion",
  "smart_home.control",
]);

const PHYSICAL_WORLD_PERMISSIONS: ReadonlySet<string> = new Set([
  "robotics.motion",
  "smart_home.control",
  "payment.spend",
]);

const SAFE_LEGACY_EVENTS: ReadonlySet<string> = new Set([
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
]);

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function stringField(
  record: UnknownRecord,
  keys: readonly string[],
): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return undefined;
}

function payloadPermission(payload: unknown): string | undefined {
  if (!isRecord(payload)) return undefined;
  const direct = stringField(payload, ["permission"]);
  if (direct) return direct;
  const nested = payload.payload;
  return isRecord(nested) ? payloadPermission(nested) : undefined;
}

function includesRestrictedIntent(value: unknown): boolean {
  if (typeof value === "string") {
    return /shell\.execute|files\.write|code\.modify|git\.create_pr|browser\.control|robotics\.motion|smart_home\.control|payment\.spend|actuator|actuate|unlock door|open door|motion command|execute shell|write file|delete file|approval-result|trust-grant|revoke-device/i.test(
      value,
    );
  }
  if (Array.isArray(value)) return value.some(includesRestrictedIntent);
  if (isRecord(value))
    return Object.values(value).some(includesRestrictedIntent);
  return false;
}

function permissionFromEnvelope(
  envelope: LucaLinkEnvelope,
): string | undefined {
  const explicit = payloadPermission(envelope.payload);
  if (explicit) return explicit;

  if (!isRecord(envelope.payload)) return undefined;
  const kind = stringField(envelope.payload, ["kind", "type", "action"]);
  const toolId = stringField(envelope.payload, ["toolId", "toolName"]);
  const lowered =
    `${envelope.type} ${kind ?? ""} ${toolId ?? ""}`.toLowerCase();

  if (/shell|command|terminal/.test(lowered)) return "shell.execute";
  if (
    /file.*write|write.*file|artifact-updated|artifact-delete/.test(lowered)
  ) {
    return "files.write";
  }
  if (/code|source/.test(lowered)) return "code.modify";
  if (/pull-request|create-pr|git/.test(lowered)) return "git.create_pr";
  if (/browser/.test(lowered)) return "browser.control";
  if (/robot|motion|drone/.test(lowered)) return "robotics.motion";
  if (/smart-home|smart_home|iot-control/.test(lowered))
    return "smart_home.control";
  if (/payment|spend|purchase/.test(lowered)) return "payment.spend";

  return undefined;
}

function hasPrimaryHostCandidate(
  options: LucaLinkSoftEnforcementOptions,
): boolean {
  return (
    options.candidates?.some(
      (candidate) =>
        candidate.hostRole === "primary" ||
        candidate.trust.trustLevel === "owner" ||
        candidate.trust.trustLevel === "admin",
    ) ?? false
  );
}

function sourceManifestForEnvelope(
  envelope: LucaLinkEnvelope,
  options: LucaLinkSoftEnforcementOptions,
): LucaHostManifest | undefined {
  if (options.sourceManifest) return options.sourceManifest;
  return options.candidates?.find(
    (candidate) => candidate.deviceId === envelope.sourceDeviceId,
  );
}

function fallbackSourceManifest(
  envelope: LucaLinkEnvelope,
  options: LucaLinkSoftEnforcementOptions,
): LucaHostManifest {
  return (
    sourceManifestForEnvelope(envelope, options) ??
    createDefaultHostManifest({
      deviceId: envelope.sourceDeviceId || "legacy-runtime",
      deviceName: envelope.sourceDeviceId || "Legacy Runtime",
      hostRole: "guest",
      now: options.now,
    })
  );
}

function result(input: {
  decision: LucaLinkSoftEnforcementDecision;
  reason: LucaLinkSoftEnforcementReason;
  enforceable: boolean;
  eventName?: string;
  lane?: string;
  permission?: string;
  risk?: LucaLinkRiskLevel;
  explain: string;
  warnings?: string[];
  errors?: string[];
}): LucaLinkSoftEnforcementResult {
  const requiresPrimaryHostApproval =
    input.decision === "requires-primary-host-approval";
  return {
    decision: input.decision,
    reason: input.reason,
    enforceable: input.enforceable,
    blocked: input.enforceable && input.decision !== "allow",
    requiresPrimaryHostApproval,
    eventName: input.eventName,
    lane: input.lane,
    permission: input.permission,
    risk: input.risk,
    explain: input.explain,
    warnings: input.warnings ?? [],
    errors: input.errors ?? [],
  };
}

function withMode(
  candidate: LucaLinkSoftEnforcementResult,
  mode: LucaLinkSoftEnforcementMode,
): LucaLinkSoftEnforcementResult {
  if (mode === "high-risk-only") return candidate;
  if (mode === "observe-only") {
    return {
      ...candidate,
      decision: "observe-only",
      reason: "shadow-only",
      enforceable: false,
      blocked: false,
      explain: `Observe-only soft enforcement would classify this as ${candidate.decision}; no runtime block is applied.`,
    };
  }
  return result({
    decision: "allow",
    reason: "mode-disabled",
    enforceable: false,
    eventName: candidate.eventName,
    lane: candidate.lane,
    permission: candidate.permission,
    risk: candidate.risk,
    explain:
      "Soft enforcement is disabled; LucaLink runtime behavior is unchanged.",
    warnings: candidate.warnings,
    errors: candidate.errors,
  });
}

function allow(input: {
  reason?: LucaLinkSoftEnforcementReason;
  eventName?: string;
  lane?: string;
  permission?: string;
  risk?: LucaLinkRiskLevel;
  warnings?: string[];
  errors?: string[];
  explain?: string;
}): LucaLinkSoftEnforcementResult {
  return result({
    decision: "allow",
    reason: input.reason ?? "low-risk-allowed",
    enforceable: false,
    eventName: input.eventName,
    lane: input.lane,
    permission: input.permission,
    risk: input.risk,
    explain:
      input.explain ?? "Low-risk LucaLink flow is allowed by soft enforcement.",
    warnings: input.warnings,
    errors: input.errors,
  });
}

function deny(input: {
  reason: LucaLinkSoftEnforcementReason;
  eventName?: string;
  lane?: string;
  permission?: string;
  risk?: LucaLinkRiskLevel;
  warnings?: string[];
  errors?: string[];
  explain: string;
}): LucaLinkSoftEnforcementResult {
  return result({ decision: "deny", enforceable: true, ...input });
}

function approval(input: {
  reason?: LucaLinkSoftEnforcementReason;
  eventName?: string;
  lane?: string;
  permission?: string;
  risk?: LucaLinkRiskLevel;
  warnings?: string[];
  errors?: string[];
  explain?: string;
}): LucaLinkSoftEnforcementResult {
  return result({
    decision: "requires-primary-host-approval",
    reason: input.reason ?? "primary-host-approval-required",
    enforceable: true,
    eventName: input.eventName,
    lane: input.lane,
    permission: input.permission,
    risk: input.risk,
    explain:
      input.explain ??
      "This high-risk LucaLink action requires Primary Host approval before runtime execution.",
    warnings: input.warnings,
    errors: input.errors,
  });
}

export function isSoftEnforcementHighRiskPermission(
  permission: string,
): boolean {
  if (APPROVAL_PERMISSIONS.has(permission) || permission === "payment.spend") {
    return true;
  }
  return (
    isKnownPermission(permission) &&
    getPermissionRisk(permission) === "critical"
  );
}

export function isSoftEnforcementRestrictedLaneForGuest(lane: string): boolean {
  return RESTRICTED_GUEST_LANES.has(lane);
}

export function isSafeRuntimeFlow(
  eventName: string | undefined,
  envelope?: LucaLinkEnvelope,
): boolean {
  if (eventName && SAFE_LEGACY_EVENTS.has(eventName)) {
    if (eventName === "message" && envelope?.lane === "tool") return false;
    return true;
  }
  if (!envelope) return false;
  if (envelope.lane === "presence") return true;
  if (envelope.lane === "conversation")
    return !includesRestrictedIntent(envelope.payload);
  if (envelope.lane === "mission")
    return !includesRestrictedIntent(envelope.payload);
  if (envelope.lane === "sensor")
    return !includesRestrictedIntent(envelope.payload);
  if (envelope.lane === "notification")
    return !includesRestrictedIntent(envelope.payload);
  return false;
}

function evaluateHighRiskEnvelope(
  envelope: LucaLinkEnvelope,
  options: LucaLinkSoftEnforcementOptions,
  eventName?: string,
  adapterWarnings: string[] = [],
  adapterErrors: string[] = [],
): LucaLinkSoftEnforcementResult {
  const validation = validateLucaLinkEnvelope(envelope, { now: options.now });
  const warnings = [...adapterWarnings, ...validation.warnings];
  const errors = [...adapterErrors, ...validation.errors];
  const lane = envelope.lane;
  const permission = permissionFromEnvelope(envelope);
  const risk = isKnownPermission(permission ?? "")
    ? getPermissionRisk(permission as LucaLinkPermissionCategory)
    : undefined;

  if (!validation.valid) {
    return deny({
      reason: isKnownLane(lane) ? "validation-failed" : "unsupported-lane",
      eventName,
      lane,
      permission,
      risk,
      warnings,
      errors,
      explain:
        "LucaLink envelope validation failed; soft enforcement returns a structured diagnostic.",
    });
  }

  const manifest = fallbackSourceManifest(envelope, options);
  const primaryAvailable =
    hasPrimaryHostCandidate(options) || manifest.hostRole === "primary";

  if (
    manifest.hostRole === "guest" &&
    isSoftEnforcementRestrictedLaneForGuest(lane)
  ) {
    return deny({
      reason: "guest-restricted-lane",
      eventName,
      lane,
      permission,
      risk,
      warnings,
      errors,
      explain: `Guest hosts cannot use the ${lane} lane under high-risk-only soft enforcement.`,
    });
  }

  if (manifest.hostRole === "guest" && lane === "identity") {
    if (!primaryAvailable) {
      return deny({
        reason: "guest-restricted-lane",
        eventName,
        lane,
        permission,
        risk,
        warnings,
        errors,
        explain:
          "Guest identity lane activity is denied because no Primary Host approval candidate is available.",
      });
    }
    return approval({
      reason: "guest-restricted-lane",
      eventName,
      lane,
      permission,
      risk,
      warnings,
      errors,
      explain: "Guest identity lane activity requires Primary Host approval.",
    });
  }

  if (permission) {
    if (permission === "payment.spend") {
      return deny({
        reason: "critical-risk-permission",
        eventName,
        lane,
        permission,
        risk: risk ?? "critical",
        warnings,
        errors,
        explain:
          "Payment or spending actions are denied by default by high-risk-only soft enforcement.",
      });
    }

    if (PHYSICAL_WORLD_PERMISSIONS.has(permission) && !primaryAvailable) {
      return deny({
        reason: "physical-world-action",
        eventName,
        lane,
        permission,
        risk,
        warnings,
        errors,
        explain:
          "Physical-world LucaLink actions are denied when no Primary Host approval candidate is available.",
      });
    }

    if (APPROVAL_PERMISSIONS.has(permission)) {
      return approval({
        reason: PHYSICAL_WORLD_PERMISSIONS.has(permission)
          ? "physical-world-action"
          : risk === "critical"
            ? "critical-risk-permission"
            : "high-risk-permission",
        eventName,
        lane,
        permission,
        risk,
        warnings,
        errors,
      });
    }

    const permissionPolicy = evaluateHostPermission(manifest, permission, {
      now: options.now,
      isPrimaryHost: manifest.hostRole === "primary",
      allowCriticalForPrimaryHost: options.allowPrimaryHostCritical,
    });
    if (permissionPolicy.decision === "deny") {
      return deny({
        reason:
          manifest.hostRole === "guest"
            ? "guest-restricted-permission"
            : "policy-denied",
        eventName,
        lane,
        permission,
        risk: permissionPolicy.risk,
        warnings,
        errors,
        explain: permissionPolicy.explain,
      });
    }
    if (permissionPolicy.decision === "requires-primary-host-approval") {
      return approval({
        reason: "policy-requires-approval",
        eventName,
        lane,
        permission,
        risk: permissionPolicy.risk,
        warnings,
        errors,
        explain: permissionPolicy.explain,
      });
    }
  }

  if (
    lane === "artifact" &&
    isRecord(envelope.payload) &&
    ["artifact-updated", "artifact-delete-request"].includes(
      String(envelope.payload.kind),
    )
  ) {
    return approval({
      eventName,
      lane,
      permission: "files.write",
      risk: "high",
      warnings,
      errors,
    });
  }

  if (lane === "settings" && includesRestrictedIntent(envelope.payload)) {
    return approval({
      eventName,
      lane,
      permission: "settings.sync",
      risk: "medium",
      warnings,
      errors,
    });
  }

  if (
    (lane === "sensor" || lane === "mission" || lane === "model") &&
    includesRestrictedIntent(envelope.payload)
  ) {
    return approval({
      reason:
        lane === "sensor"
          ? "physical-world-action"
          : "primary-host-approval-required",
      eventName,
      lane,
      permission,
      risk: risk ?? "high",
      warnings,
      errors,
    });
  }

  if (isSafeRuntimeFlow(eventName, envelope)) {
    return allow({
      reason: "safe-runtime-flow",
      eventName,
      lane,
      permission,
      risk,
      warnings,
      errors,
      explain:
        "Safe LucaLink runtime flow is observed/allowed and is not blocked by high-risk-only soft enforcement.",
    });
  }

  const lanePolicy = canHostParticipateInLane(manifest, lane, {
    now: options.now,
  });
  const envelopePolicy = evaluateEnvelopePolicy(manifest, envelope, {
    now: options.now,
    isPrimaryHost: manifest.hostRole === "primary",
    allowCriticalForPrimaryHost: options.allowPrimaryHostCritical,
  });

  if (
    envelopePolicy.requiresApproval ||
    lanePolicy.decision === "requires-primary-host-approval"
  ) {
    return approval({
      reason: "policy-requires-approval",
      eventName,
      lane,
      permission,
      risk,
      warnings,
      errors,
      explain: lanePolicy.explain,
    });
  }

  if (!envelopePolicy.allowed || lanePolicy.decision === "deny") {
    return deny({
      reason: "policy-denied",
      eventName,
      lane,
      permission,
      risk,
      warnings,
      errors,
      explain: lanePolicy.explain,
    });
  }

  return allow({ eventName, lane, permission, risk, warnings, errors });
}

export function evaluateSoftEnforcementForEnvelope(
  envelope: LucaLinkEnvelope,
  options: LucaLinkSoftEnforcementOptions = {},
): LucaLinkSoftEnforcementResult {
  const mode = options.mode ?? DEFAULT_MODE;
  const candidate = evaluateHighRiskEnvelope(envelope, options);
  return withMode(candidate, mode);
}

export function evaluateSoftEnforcementForLegacyEvent(
  input: LucaLinkLegacyEventInput,
  options: LucaLinkSoftEnforcementOptions = {},
): LucaLinkSoftEnforcementResult {
  const mode = options.mode ?? DEFAULT_MODE;
  if (!input.eventName) {
    return withMode(
      allow({
        reason: "unknown-event",
        warnings: ["unknown LucaLink event; no envelope produced"],
        explain:
          "Unknown LucaLink event is not blocked by soft enforcement unless high-risk intent is identified.",
      }),
      mode,
    );
  }

  const adapted = legacyEventToEnvelope(input.eventName, input.payload, {
    now: options.now,
  });
  if (!adapted.envelope) {
    return withMode(
      allow({
        reason: "unknown-event",
        eventName: input.eventName,
        warnings: adapted.warnings,
        errors: adapted.errors,
        explain:
          "Unknown LucaLink legacy event produced no envelope and is not blocked by soft enforcement.",
      }),
      mode,
    );
  }

  const candidate = evaluateHighRiskEnvelope(
    adapted.envelope,
    options,
    input.eventName,
    adapted.warnings,
    adapted.errors,
  );
  return withMode(candidate, mode);
}

export function shouldBlockLucaLinkEvent(
  input: LucaLinkLegacyEventInput | LucaLinkEnvelope,
  options: LucaLinkSoftEnforcementOptions = {},
): boolean {
  const result =
    "version" in input
      ? evaluateSoftEnforcementForEnvelope(input, options)
      : evaluateSoftEnforcementForLegacyEvent(input, options);
  return result.blocked;
}

export function requiresLucaLinkPrimaryHostApproval(
  input: LucaLinkLegacyEventInput | LucaLinkEnvelope,
  options: LucaLinkSoftEnforcementOptions = {},
): boolean {
  const result =
    "version" in input
      ? evaluateSoftEnforcementForEnvelope(input, options)
      : evaluateSoftEnforcementForLegacyEvent(input, options);
  return result.requiresPrimaryHostApproval;
}

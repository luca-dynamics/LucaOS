/**
 * LucaLink Runtime Observer (PR #189)
 *
 * Pure shadow-mode evaluator for legacy LucaLink runtime shapes. It adapts
 * events into mesh envelopes, validates them, optionally evaluates policy and
 * routing, and reports what would happen. It never enforces, sends, stores, or
 * mutates live runtime behavior.
 */

import type { LucaLinkPermissionCategory, LucaLinkSyncLaneId } from "./lucaLinkArchitectureMap";
import type { LucaHostManifest, LucaHostRole } from "./lucaHostManifest";
import {
  legacyDevicesToManifests,
  legacyEventToEnvelope,
  type LucaLinkLegacyAdapterOptions,
  type LucaLinkLegacyDeviceLike,
  type LucaLinkLegacyEventName,
} from "./lucaLinkLegacyAdapter";
import {
  routeLucaLinkTask,
  type LucaLinkRoutingCandidate,
  type LucaLinkRoutingTask,
  type LucaLinkRoutingTaskType,
} from "./lucaLinkHostRouter";
import {
  evaluateEnvelopePolicy,
  type LucaLinkEnvelope,
  type LucaLinkSafetyPayload,
  validateLucaLinkEnvelope,
} from "./lucaLinkSyncProtocol";

export type LucaLinkRuntimeObservationDecision =
  | "would-allow"
  | "would-deny"
  | "would-require-primary-host-approval"
  | "would-route"
  | "adapter-warning"
  | "adapter-error";

export interface LucaLinkRuntimeObservation {
  id: string;
  timestamp: number;
  eventName: LucaLinkLegacyEventName;
  decision: LucaLinkRuntimeObservationDecision;
  envelope?: LucaLinkEnvelope;
  selectedHostId?: string;
  selectedHostRole?: LucaHostRole;
  requiresPrimaryHostApproval: boolean;
  reasons: string[];
  warnings: string[];
  errors: string[];
}

export interface ObserveLegacyLucaLinkEventInput {
  eventName: LucaLinkLegacyEventName | string;
  payload?: unknown;
}

export interface LucaLinkRuntimeObserverOptions extends LucaLinkLegacyAdapterOptions {
  sourceManifest?: LucaHostManifest;
  candidates?: readonly (LucaHostManifest | LucaLinkRoutingCandidate)[];
  activeUserDeviceId?: string;
}

export interface LucaLinkRuntimeObservationSummary {
  total: number;
  wouldAllow: number;
  wouldDeny: number;
  wouldRequirePrimaryHostApproval: number;
  wouldRoute: number;
  adapterWarnings: number;
  adapterErrors: number;
  warnings: string[];
  errors: string[];
}

function now(options: LucaLinkRuntimeObserverOptions): number {
  return options.now ?? Date.now();
}

function observationId(timestamp: number, eventName: string, envelope?: LucaLinkEnvelope): string {
  return `ll-observe-${eventName}-${envelope?.id ?? timestamp}`;
}

function normalizeEventName(eventName: string): LucaLinkLegacyEventName {
  const normalized = eventName === "sensor_pulse" ? "SENSOR_PULSE" : eventName;
  const known: readonly LucaLinkLegacyEventName[] = [
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
  ];
  return known.includes(normalized as LucaLinkLegacyEventName)
    ? (normalized as LucaLinkLegacyEventName)
    : "unknown";
}

function toCandidate(input: LucaHostManifest | LucaLinkRoutingCandidate): LucaLinkRoutingCandidate {
  if ("manifest" in input) return input;
  return {
    manifest: input,
    transport: { delivery: "direct", reachable: input.status.online },
    context: { isPrimaryHost: input.hostRole === "primary" },
  };
}

function candidatesFromOptions(options: LucaLinkRuntimeObserverOptions): LucaLinkRoutingCandidate[] {
  return (options.candidates ?? []).map(toCandidate);
}

function sourceManifestFor(envelope: LucaLinkEnvelope, candidates: readonly LucaLinkRoutingCandidate[], explicit?: LucaHostManifest): LucaHostManifest | undefined {
  if (explicit) return explicit;
  return candidates.find((candidate) => candidate.manifest.deviceId === envelope.sourceDeviceId)?.manifest;
}

function taskTypeForLane(lane: LucaLinkSyncLaneId): LucaLinkRoutingTaskType {
  if (lane === "conversation") return "conversation";
  if (lane === "presence" || lane === "identity") return "notification";
  return lane;
}

function riskForLane(lane: LucaLinkSyncLaneId): LucaLinkRoutingTask["risk"] {
  if (lane === "safety") return "critical";
  if (lane === "tool" || lane === "memory" || lane === "settings" || lane === "artifact") return "high";
  if (lane === "mission" || lane === "sensor") return "medium";
  return "low";
}

function requiredPermissionsForEnvelope(envelope: LucaLinkEnvelope): LucaLinkRoutingTask["requiredPermissions"] {
  if (envelope.lane === "tool") {
    const permission = (envelope.payload as { permission?: unknown }).permission;
    return typeof permission === "string" ? [permission as LucaLinkPermissionCategory] : ["shell.execute"];
  }
  if (envelope.lane === "safety") return ["memory.write"];
  if (envelope.lane === "memory") return ["memory.write"];
  return undefined;
}

function buildTask(envelope: LucaLinkEnvelope, options: LucaLinkRuntimeObserverOptions): LucaLinkRoutingTask {
  const type = taskTypeForLane(envelope.lane);
  const safetyPayload = envelope.payload as Partial<LucaLinkSafetyPayload>;
  return {
    id: `observe-${envelope.id}`,
    type,
    lane: envelope.lane,
    title: `Shadow observation for ${envelope.lane}`,
    description: envelope.type,
    requiredPermissions: requiredPermissionsForEnvelope(envelope),
    risk: riskForLane(envelope.lane),
    privacy: envelope.targetDeviceId === "all" ? "relay-ok" : envelope.lane === "conversation" ? "guest-ok" : "trusted-only",
    requiresPrimaryHostApproval: envelope.lane === "safety" || envelope.lane === "tool" || safetyPayload.kind === "security-alert",
    preferredDelivery: envelope.routing.delivery,
    sourceDeviceId: envelope.sourceDeviceId,
    activeUserDeviceId: options.activeUserDeviceId,
  };
}

function hasAdapterWarningOnly(warnings: readonly string[], errors: readonly string[], envelope?: LucaLinkEnvelope): boolean {
  return !envelope && warnings.length > 0 && errors.length === 0;
}

export function observeLegacyEnvelope(
  envelope: LucaLinkEnvelope,
  manifestsOrCandidates: readonly (LucaHostManifest | LucaLinkRoutingCandidate)[] = [],
  options: LucaLinkRuntimeObserverOptions = {},
): LucaLinkRuntimeObservation {
  const timestamp = now(options);
  const candidates = manifestsOrCandidates.map(toCandidate);
  const warnings: string[] = [];
  const errors: string[] = [];
  const reasons: string[] = [];

  const validation = validateLucaLinkEnvelope(envelope, { now: options.now });
  warnings.push(...validation.warnings);
  errors.push(...validation.errors);
  if (!validation.valid) reasons.push("Envelope failed validation in shadow observation.");

  const sourceManifest = sourceManifestFor(envelope, candidates, options.sourceManifest);
  let requiresPrimaryHostApproval = false;
  let decision: LucaLinkRuntimeObservationDecision = "would-allow";
  let selectedHostId: string | undefined;
  let selectedHostRole: LucaHostRole | undefined;

  if (sourceManifest) {
    const policy = evaluateEnvelopePolicy(sourceManifest, envelope, {
      now: options.now,
      isPrimaryHost: sourceManifest.hostRole === "primary",
    });
    reasons.push(policy.lanePolicy.explain);
    if (policy.permissionPolicy) reasons.push(policy.permissionPolicy.explain);
    requiresPrimaryHostApproval = requiresPrimaryHostApproval || policy.requiresApproval;
    if (!policy.valid || !policy.allowed) {
      decision = policy.requiresApproval ? "would-require-primary-host-approval" : "would-deny";
    }
  } else {
    warnings.push("No source manifest available; policy evaluation is diagnostic only.");
  }

  if (errors.length) {
    decision = "adapter-error";
  }

  if (decision !== "adapter-error" && candidates.length > 0) {
    const task = buildTask(envelope, options);
    const route = routeLucaLinkTask(task, candidates, {
      now: options.now,
      buildProbeEnvelope: () => envelope,
    });
    reasons.push(route.explain);
    warnings.push(...route.approvalReasons);
    requiresPrimaryHostApproval = requiresPrimaryHostApproval || route.requiresPrimaryHostApproval;
    selectedHostId = route.selectedHost?.deviceId;
    selectedHostRole = route.selectedHost?.hostRole;

    if (!route.selectedHost) {
      warnings.push("No candidate host was eligible for this shadow route.");
      if (decision === "would-allow") decision = "adapter-warning";
    } else if (route.requiresPrimaryHostApproval && decision !== "would-deny") {
      decision = "would-require-primary-host-approval";
    } else if (decision === "would-allow") {
      decision = "would-route";
    }
  } else if (decision === "would-allow" && candidates.length === 0) {
    warnings.push("No routing candidates supplied; route was not evaluated.");
  }

  return {
    id: observationId(timestamp, "envelope", envelope),
    timestamp,
    eventName: "unknown",
    decision,
    envelope,
    selectedHostId,
    selectedHostRole,
    requiresPrimaryHostApproval,
    reasons,
    warnings,
    errors,
  };
}

export function observeLegacyLucaLinkEvent(
  input: ObserveLegacyLucaLinkEventInput,
  options: LucaLinkRuntimeObserverOptions = {},
): LucaLinkRuntimeObservation {
  const timestamp = now(options);
  const eventName = normalizeEventName(input.eventName);
  const adapter = legacyEventToEnvelope(input.eventName, input.payload, options);
  const candidates = candidatesFromOptions(options);

  if (!adapter.envelope) {
    const decision: LucaLinkRuntimeObservationDecision = adapter.errors.length
      ? "adapter-error"
      : "adapter-warning";
    return {
      id: observationId(timestamp, eventName),
      timestamp,
      eventName,
      decision,
      requiresPrimaryHostApproval: false,
      reasons: hasAdapterWarningOnly(adapter.warnings, adapter.errors) ? ["Legacy event did not produce an envelope."] : [],
      warnings: adapter.warnings,
      errors: adapter.errors,
    };
  }

  const observed = observeLegacyEnvelope(adapter.envelope, candidates, options);
  const decision = adapter.errors.length
    ? "adapter-error"
    : observed.decision === "would-allow" && adapter.warnings.length
      ? "adapter-warning"
      : observed.decision;

  return {
    ...observed,
    id: observationId(timestamp, eventName, adapter.envelope),
    timestamp,
    eventName,
    decision,
    warnings: [...adapter.warnings, ...observed.warnings],
    errors: [...adapter.errors, ...observed.errors],
    reasons: [...observed.reasons],
  };
}

export function observeLegacyDeviceRegistry(
  devices: readonly LucaLinkLegacyDeviceLike[],
  options: LucaLinkRuntimeObserverOptions = {},
): LucaLinkRuntimeObservation[] {
  return legacyDevicesToManifests(devices, options).map((result, index) => {
    const timestamp = now(options);
    const manifest = result.manifest;
    return {
      id: `ll-observe-registry-${manifest?.deviceId ?? index}-${timestamp}`,
      timestamp,
      eventName: "registry",
      decision: result.errors.length ? "adapter-error" : result.warnings.length ? "adapter-warning" : "would-allow",
      selectedHostId: manifest?.deviceId,
      selectedHostRole: manifest?.hostRole,
      requiresPrimaryHostApproval: false,
      reasons: manifest ? [`Legacy registry device maps to ${manifest.hostRole} host manifest.`] : [],
      warnings: result.warnings,
      errors: result.errors,
    } satisfies LucaLinkRuntimeObservation;
  });
}

export function summarizeRuntimeObservations(
  observations: readonly LucaLinkRuntimeObservation[],
): LucaLinkRuntimeObservationSummary {
  const count = (decision: LucaLinkRuntimeObservationDecision) =>
    observations.filter((observation) => observation.decision === decision).length;
  return {
    total: observations.length,
    wouldAllow: count("would-allow"),
    wouldDeny: count("would-deny"),
    wouldRequirePrimaryHostApproval: count("would-require-primary-host-approval"),
    wouldRoute: count("would-route"),
    adapterWarnings: count("adapter-warning"),
    adapterErrors: count("adapter-error"),
    warnings: observations.flatMap((observation) => observation.warnings),
    errors: observations.flatMap((observation) => observation.errors),
  };
}

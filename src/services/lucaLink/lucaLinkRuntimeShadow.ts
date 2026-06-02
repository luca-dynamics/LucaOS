/**
 * LucaLink Runtime Shadow Wiring (PR #190)
 *
 * Diagnostics-only collector for live LucaLink runtime events. Shadow mode runs
 * beside the existing runtime: it observes, buffers, summarizes, and optionally
 * emits developer diagnostics. It never enforces policy, blocks delivery,
 * rewrites payloads, writes storage, opens sockets, or sends network traffic.
 */

import type { LucaLinkEnvelopeTarget } from "./lucaLinkSyncProtocol";
import {
  observeLegacyLucaLinkEvent,
  summarizeRuntimeObservations,
  type LucaLinkRuntimeObservation,
  type LucaLinkRuntimeObservationSummary,
  type LucaLinkRuntimeObserverOptions,
} from "./lucaLinkRuntimeObserver";
import type { LucaLinkLegacyEventName } from "./lucaLinkLegacyAdapter";

export interface LucaLinkRuntimeShadowOptions {
  enabled?: boolean;
  maxObservations?: number;
  now?: number;
  onObservation?: (observation: LucaLinkRuntimeObservation) => void;
  logToConsole?: boolean;
}

export interface LucaLinkRuntimeShadowState {
  enabled: boolean;
  observations: LucaLinkRuntimeObservation[];
  lastObservationAt?: number;
  maxObservations: number;
  now?: number;
  onObservation?: (observation: LucaLinkRuntimeObservation) => void;
  logToConsole: boolean;
}

export interface LucaLinkRuntimeShadowEventInput {
  eventName: string;
  payload?: unknown;
  sourceDeviceId?: string;
  targetDeviceId?: string | "primary" | "all" | "trusted" | "nearby";
}

const DEFAULT_MAX_OBSERVATIONS = 100;

function normalizeMaxObservations(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value))
    return DEFAULT_MAX_OBSERVATIONS;
  return Math.max(0, Math.floor(value));
}

function now(options: Pick<LucaLinkRuntimeShadowState, "now">): number {
  return options.now ?? Date.now();
}

function normalizeEventName(eventName: string): LucaLinkLegacyEventName {
  if (eventName === "sensor_pulse") return "SENSOR_PULSE";
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
  return known.includes(eventName as LucaLinkLegacyEventName)
    ? (eventName as LucaLinkLegacyEventName)
    : "unknown";
}

function makeObserverFailureObservation(
  input: LucaLinkRuntimeShadowEventInput,
  shadow: LucaLinkRuntimeShadowState,
  error: unknown,
): LucaLinkRuntimeObservation {
  const timestamp = now(shadow);
  const message = error instanceof Error ? error.message : String(error);
  return {
    id: `ll-shadow-observer-error-${normalizeEventName(input.eventName)}-${timestamp}`,
    timestamp,
    eventName: normalizeEventName(input.eventName),
    decision: "adapter-error",
    requiresPrimaryHostApproval: false,
    reasons: [
      "Runtime shadow observer failed; live LucaLink behavior was left unchanged.",
    ],
    warnings: [],
    errors: [`Runtime shadow observer error: ${message}`],
  };
}

function appendObservation(
  shadow: LucaLinkRuntimeShadowState,
  observation: LucaLinkRuntimeObservation,
): LucaLinkRuntimeObservation {
  if (shadow.maxObservations > 0) {
    shadow.observations.push(observation);
    if (shadow.observations.length > shadow.maxObservations) {
      shadow.observations.splice(
        0,
        shadow.observations.length - shadow.maxObservations,
      );
    }
  }
  shadow.lastObservationAt = observation.timestamp;

  try {
    shadow.onObservation?.(observation);
  } catch {
    // onObservation is diagnostic-only and must never affect live runtime flow.
  }

  if (shadow.logToConsole === true) {
    console.debug(
      `[LucaLinkShadow] ${observation.eventName}: ${observation.decision}`,
      {
        selectedHostId: observation.selectedHostId,
        warnings: observation.warnings,
        errors: observation.errors,
      },
    );
  }

  return observation;
}

export function createLucaLinkRuntimeShadow(
  options: LucaLinkRuntimeShadowOptions = {},
): LucaLinkRuntimeShadowState {
  return {
    enabled: options.enabled === true,
    observations: [],
    maxObservations: normalizeMaxObservations(options.maxObservations),
    now: options.now,
    onObservation: options.onObservation,
    logToConsole: options.logToConsole === true,
  };
}

export function recordLucaLinkShadowObservation(
  shadow: LucaLinkRuntimeShadowState | undefined | null,
  input: LucaLinkRuntimeShadowEventInput,
  observerOptions: LucaLinkRuntimeObserverOptions = {},
): LucaLinkRuntimeObservation | undefined {
  if (!shadow?.enabled) return undefined;

  try {
    const options: LucaLinkRuntimeObserverOptions = {
      ...observerOptions,
      now: observerOptions.now ?? shadow.now,
      sourceDeviceId: observerOptions.sourceDeviceId ?? input.sourceDeviceId,
      targetDeviceId: (observerOptions.targetDeviceId ??
        input.targetDeviceId) as LucaLinkEnvelopeTarget | undefined,
    };
    const observation = observeLegacyLucaLinkEvent(
      { eventName: input.eventName, payload: input.payload },
      options,
    );
    return appendObservation(shadow, observation);
  } catch (error) {
    return appendObservation(
      shadow,
      makeObserverFailureObservation(input, shadow, error),
    );
  }
}

export function getLucaLinkShadowObservations(
  shadow: LucaLinkRuntimeShadowState | undefined | null,
): LucaLinkRuntimeObservation[] {
  return shadow ? [...shadow.observations] : [];
}

export function clearLucaLinkShadowObservations(
  shadow: LucaLinkRuntimeShadowState | undefined | null,
): void {
  if (!shadow) return;
  shadow.observations = [];
  shadow.lastObservationAt = undefined;
}

export function summarizeLucaLinkShadowObservations(
  shadow: LucaLinkRuntimeShadowState | undefined | null,
): LucaLinkRuntimeObservationSummary {
  return summarizeRuntimeObservations(getLucaLinkShadowObservations(shadow));
}

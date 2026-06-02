/**
 * LucaLink Full Runtime Enforcement Gate (PR #197)
 *
 * Pure, default-disabled staged runtime gate for outbound LucaLink send-like
 * paths. This module adapts, observes, classifies, and returns decisions only:
 * it does not send, store, prompt, open sockets, touch browser APIs, or execute
 * shell/file/code/browser/payment/physical-world actions.
 */

import type { LucaHostManifest } from "./lucaHostManifest";
import {
  legacyEventToEnvelope,
  type LucaLinkLegacyEventInput,
} from "./lucaLinkLegacyAdapter";
import {
  observeLegacyLucaLinkEvent,
  type LucaLinkRuntimeObservation,
} from "./lucaLinkRuntimeObserver";
import {
  evaluateSoftEnforcementForLegacyEvent,
  type LucaLinkSoftEnforcementResult,
} from "./lucaLinkSoftEnforcement";
import type { LucaLinkContinuationBridgeResult } from "./lucaLinkContinuationBridge";

export type LucaLinkRuntimeEnforcementMode =
  | "disabled"
  | "observe-only"
  | "high-risk-only"
  | "full-outbound";

export type LucaLinkRuntimeEnforcementDecision =
  | "allow"
  | "deny"
  | "require-primary-host-approval"
  | "queue-approval"
  | "allow-with-valid-continuation"
  | "prepare-safe-continuation"
  | "manual-retry-required"
  | "fresh-confirmation-required"
  | "observe-only"
  | "shadow-only"
  | "invalid"
  | "error";

export type LucaLinkRuntimeEnforcementScope =
  | "outbound-send"
  | "outbound-beam"
  | "outbound-guest"
  | "outbound-sync"
  | "inbound-observe-only"
  | "manual-evaluation";

export interface LucaLinkRuntimeEnforcementInput {
  scope: LucaLinkRuntimeEnforcementScope;
  eventName?: string;
  payload?: unknown;
  sourceDeviceId?: string;
  targetDeviceId?: string | "primary" | "all" | "trusted" | "nearby";
  continuationTokenId?: string;
  now?: number;
}

export interface LucaLinkRuntimeEnforcementResult {
  id: string;
  timestamp: number;
  mode: LucaLinkRuntimeEnforcementMode;
  scope: LucaLinkRuntimeEnforcementScope;
  eventName?: string;
  decision: LucaLinkRuntimeEnforcementDecision;
  allowed: boolean;
  blocked: boolean;
  queuedApproval: boolean;
  requiresPrimaryHostApproval: boolean;
  requiresManualRetry: boolean;
  requiresFreshConfirmation: boolean;
  usedContinuationTokenId?: string;
  preparedContinuationTokenId?: string;
  softEnforcement?: LucaLinkSoftEnforcementResult;
  observation?: LucaLinkRuntimeObservation;
  approvalRequestId?: string;
  continuationResult?: LucaLinkContinuationBridgeResult;
  warnings: string[];
  errors: string[];
  explain: string;
}

export interface LucaLinkRuntimeEnforcementQueueContext {
  input: LucaLinkRuntimeEnforcementInput;
  event: LucaLinkLegacyEventInput;
  softEnforcement: LucaLinkSoftEnforcementResult;
  observation?: LucaLinkRuntimeObservation;
}

export interface LucaLinkRuntimeEnforcementContinuationContext {
  input: LucaLinkRuntimeEnforcementInput;
  event: LucaLinkLegacyEventInput;
  softEnforcement: LucaLinkSoftEnforcementResult;
  observation?: LucaLinkRuntimeObservation;
  permission?: string;
  lane?: string;
}

export interface LucaLinkRuntimeEnforcementGateOptions {
  mode?: LucaLinkRuntimeEnforcementMode;
  now?: number;
  sourceManifest?: LucaHostManifest;
  candidates?: readonly LucaHostManifest[];
  queueApproval?: (
    result: LucaLinkRuntimeEnforcementResult,
    context: LucaLinkRuntimeEnforcementQueueContext,
  ) => { request?: { id: string }; warnings?: string[]; errors?: string[] };
  evaluateContinuation?: (
    tokenId: string,
    context: LucaLinkRuntimeEnforcementContinuationContext,
  ) => LucaLinkContinuationBridgeResult;
  prepareContinuation?: (
    tokenId: string,
    context: LucaLinkRuntimeEnforcementContinuationContext,
  ) => LucaLinkContinuationBridgeResult;
  allowSafeContinuation?: boolean;
  allowInboundObserveOnly?: boolean;
}

export interface LucaLinkRuntimeEnforcementAuditRecord {
  id: string;
  timestamp: number;
  mode: LucaLinkRuntimeEnforcementMode;
  scope: LucaLinkRuntimeEnforcementScope;
  eventName?: string;
  decision: LucaLinkRuntimeEnforcementDecision;
  allowed: boolean;
  blocked: boolean;
  queuedApproval: boolean;
  requiresPrimaryHostApproval: boolean;
  requiresManualRetry: boolean;
  requiresFreshConfirmation: boolean;
  approvalRequestId?: string;
  usedContinuationTokenId?: string;
  preparedContinuationTokenId?: string;
  warnings: string[];
  errors: string[];
  explain: string;
}

export interface LucaLinkRuntimeEnforcementAuditSummary {
  total: number;
  allowed: number;
  blocked: number;
  queuedApproval: number;
  requiresPrimaryHostApproval: number;
  requiresManualRetry: number;
  requiresFreshConfirmation: number;
  decisions: Record<LucaLinkRuntimeEnforcementDecision, number>;
  recent: LucaLinkRuntimeEnforcementAuditRecord[];
  warnings: string[];
  errors: string[];
}

type UnknownRecord = Record<string, unknown>;

const DEFAULT_MODE: LucaLinkRuntimeEnforcementMode = "disabled";
const FRESH_CONFIRMATION_PERMISSIONS = new Set([
  "payment.spend",
  "robotics.motion",
  "smart_home.control",
]);
const FRESH_CONFIRMATION_HINTS: ReadonlyArray<RegExp> = [
  /payment\.spend|spend|purchase/i,
  /robotics\.motion|robot|motion|drone/i,
  /smart[_-]?home\.control|smart[_-]?home/i,
  /actuat|physical-world|physical world|door\.|lock\.|vehicle\./i,
  /critical safety|safety\.critical|emergency override/i,
];

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function eventFor(input: LucaLinkRuntimeEnforcementInput): LucaLinkLegacyEventInput {
  return { eventName: input.eventName ?? "unknown", payload: input.payload };
}

function timestampFor(input: LucaLinkRuntimeEnforcementInput, options: LucaLinkRuntimeEnforcementGateOptions): number {
  return input.now ?? options.now ?? Date.now();
}

function resultId(timestamp: number, input: LucaLinkRuntimeEnforcementInput): string {
  const event = (input.eventName ?? "unknown").replace(/[^a-z0-9-]/gi, "-").toLowerCase();
  return `ll-runtime-enforcement-${input.scope}-${event}-${timestamp}`;
}

function collectStrings(value: unknown, output: string[] = []): string[] {
  if (typeof value === "string") output.push(value);
  else if (Array.isArray(value)) value.forEach((entry) => collectStrings(entry, output));
  else if (isRecord(value)) Object.values(value).forEach((entry) => collectStrings(entry, output));
  return output;
}

function payloadPermission(payload: unknown): string | undefined {
  if (!isRecord(payload)) return undefined;
  const direct = payload.permission;
  if (typeof direct === "string" && direct.length > 0) return direct;
  return payloadPermission(payload.payload);
}

function hasFreshConfirmationSignal(input: LucaLinkRuntimeEnforcementInput, soft?: LucaLinkSoftEnforcementResult): boolean {
  const permission = soft?.permission ?? payloadPermission(input.payload);
  if (permission && FRESH_CONFIRMATION_PERMISSIONS.has(permission)) return true;
  if (soft?.risk === "critical" && (soft.lane === "safety" || soft.reason === "critical-risk-permission")) return true;
  const haystack = [input.eventName, permission, soft?.lane, soft?.reason, ...collectStrings(input.payload)]
    .filter((value): value is string => !!value);
  return haystack.some((value) => FRESH_CONFIRMATION_HINTS.some((hint) => hint.test(value)));
}

function isSafeContinuationResult(result: LucaLinkContinuationBridgeResult): boolean {
  return (
    result.valid &&
    result.canAutoContinue &&
    !result.canExecuteNow &&
    !result.requiresManualRetry &&
    !result.requiresFreshConfirmation &&
    result.decision === "can-prepare-safe-continuation"
  );
}

function buildResult(input: {
  input: LucaLinkRuntimeEnforcementInput;
  options: LucaLinkRuntimeEnforcementGateOptions;
  timestamp: number;
  decision: LucaLinkRuntimeEnforcementDecision;
  softEnforcement?: LucaLinkSoftEnforcementResult;
  observation?: LucaLinkRuntimeObservation;
  continuationResult?: LucaLinkContinuationBridgeResult;
  approvalRequestId?: string;
  warnings?: string[];
  errors?: string[];
  explain: string;
  usedContinuationTokenId?: string;
  preparedContinuationTokenId?: string;
}): LucaLinkRuntimeEnforcementResult {
  const blocked = ![
    "allow",
    "allow-with-valid-continuation",
    "prepare-safe-continuation",
    "observe-only",
    "shadow-only",
  ].includes(input.decision);
  return {
    id: resultId(input.timestamp, input.input),
    timestamp: input.timestamp,
    mode: input.options.mode ?? DEFAULT_MODE,
    scope: input.input.scope,
    eventName: input.input.eventName,
    decision: input.decision,
    allowed: !blocked,
    blocked,
    queuedApproval: input.decision === "queue-approval",
    requiresPrimaryHostApproval:
      input.decision === "queue-approval" || input.decision === "require-primary-host-approval",
    requiresManualRetry: input.decision === "manual-retry-required",
    requiresFreshConfirmation: input.decision === "fresh-confirmation-required",
    usedContinuationTokenId: input.usedContinuationTokenId,
    preparedContinuationTokenId: input.preparedContinuationTokenId,
    softEnforcement: input.softEnforcement,
    observation: input.observation,
    approvalRequestId: input.approvalRequestId,
    continuationResult: input.continuationResult,
    warnings: [
      ...(input.observation?.warnings ?? []),
      ...(input.softEnforcement?.warnings ?? []),
      ...(input.continuationResult?.warnings ?? []),
      ...(input.warnings ?? []),
    ],
    errors: [
      ...(input.observation?.errors ?? []),
      ...(input.softEnforcement?.errors ?? []),
      ...(input.continuationResult?.errors ?? []),
      ...(input.errors ?? []),
    ],
    explain: input.explain,
  };
}

function observeAndClassify(
  input: LucaLinkRuntimeEnforcementInput,
  options: LucaLinkRuntimeEnforcementGateOptions,
) {
  const event = eventFor(input);
  const adapterOptions = {
    now: input.now ?? options.now,
    sourceDeviceId: input.sourceDeviceId,
    targetDeviceId: input.targetDeviceId,
  };
  const adapted = input.eventName
    ? legacyEventToEnvelope(input.eventName, input.payload, adapterOptions)
    : undefined;
  const observation = input.eventName
    ? observeLegacyLucaLinkEvent({ eventName: event.eventName ?? "unknown", payload: event.payload }, {
        ...adapterOptions,
        sourceManifest: options.sourceManifest,
        candidates: options.candidates,
      })
    : undefined;
  const softEnforcement = evaluateSoftEnforcementForLegacyEvent(event, {
    mode: "high-risk-only",
    now: input.now ?? options.now,
    sourceManifest: options.sourceManifest,
    candidates: options.candidates,
  });
  return { event, adapted, observation, softEnforcement };
}

export function evaluateLucaLinkRuntimeEnforcement(
  input: LucaLinkRuntimeEnforcementInput,
  options: LucaLinkRuntimeEnforcementGateOptions = {},
): LucaLinkRuntimeEnforcementResult {
  const mode = options.mode ?? DEFAULT_MODE;
  const timestamp = timestampFor(input, options);

  if (input.scope === "inbound-observe-only" && !options.allowInboundObserveOnly) {
    return buildResult({
      input,
      options: { ...options, mode },
      timestamp,
      decision: "observe-only",
      explain: "Inbound LucaLink paths are observe-only in this staged runtime enforcement PR; no inbound block is applied.",
    });
  }

  const { event, observation, softEnforcement } = observeAndClassify(input, { ...options, mode });

  if (mode === "disabled") {
    return buildResult({
      input,
      options: { ...options, mode },
      timestamp,
      decision: "shadow-only",
      softEnforcement,
      observation,
      explain: "Runtime enforcement is disabled; LucaLink outbound behavior is unchanged.",
    });
  }

  if (mode === "observe-only") {
    return buildResult({
      input,
      options: { ...options, mode },
      timestamp,
      decision: "observe-only",
      softEnforcement,
      observation,
      explain: `Observe-only runtime enforcement classified this path as ${softEnforcement.decision}; no runtime block is applied.`,
    });
  }

  if (hasFreshConfirmationSignal(input, softEnforcement)) {
    return buildResult({
      input,
      options: { ...options, mode },
      timestamp,
      decision: "fresh-confirmation-required",
      softEnforcement,
      observation,
      explain: "This payment, physical-world, or critical safety LucaLink action requires fresh Primary Host confirmation; no action was continued.",
    });
  }

  if (mode === "high-risk-only") {
    const decision = softEnforcement.blocked
      ? softEnforcement.requiresPrimaryHostApproval
        ? "require-primary-host-approval"
        : "deny"
      : "allow";
    const preQueue = buildResult({
      input,
      options: { ...options, mode },
      timestamp,
      decision,
      softEnforcement,
      observation,
      explain: softEnforcement.explain,
    });
    if (decision === "require-primary-host-approval") {
      const queued = options.queueApproval?.(preQueue, {
        input,
        event,
        softEnforcement,
        observation,
      });
      if (queued?.request?.id) {
        return buildResult({
          input,
          options: { ...options, mode },
          timestamp,
          decision: "queue-approval",
          softEnforcement,
          observation,
          approvalRequestId: queued.request.id,
          warnings: queued.warnings,
          errors: queued.errors,
          explain: "This high-risk LucaLink action was queued for Primary Host approval; no runtime action was executed.",
        });
      }
    }
    return preQueue;
  }

  if (softEnforcement.errors.length > 0 && observation?.decision === "adapter-error") {
    return buildResult({
      input,
      options: { ...options, mode },
      timestamp,
      decision: "invalid",
      softEnforcement,
      observation,
      explain: "Runtime enforcement could not validate this outbound LucaLink event.",
    });
  }

  if (!softEnforcement.blocked) {
    return buildResult({
      input,
      options: { ...options, mode },
      timestamp,
      decision: "allow",
      softEnforcement,
      observation,
      explain: "Full outbound runtime enforcement allowed this low-risk LucaLink flow.",
    });
  }

  if (!softEnforcement.requiresPrimaryHostApproval) {
    return buildResult({
      input,
      options: { ...options, mode },
      timestamp,
      decision: "deny",
      softEnforcement,
      observation,
      explain: softEnforcement.explain,
    });
  }

  const continuationContext: LucaLinkRuntimeEnforcementContinuationContext = {
    input,
    event,
    softEnforcement,
    observation,
    permission: softEnforcement.permission,
    lane: softEnforcement.lane,
  };

  if (input.continuationTokenId) {
    const continuationResult = options.evaluateContinuation?.(input.continuationTokenId, continuationContext);
    if (continuationResult?.requiresFreshConfirmation) {
      return buildResult({
        input,
        options: { ...options, mode },
        timestamp,
        decision: "fresh-confirmation-required",
        softEnforcement,
        observation,
        continuationResult,
        explain: continuationResult.explain,
      });
    }
    if (continuationResult?.requiresManualRetry) {
      return buildResult({
        input,
        options: { ...options, mode },
        timestamp,
        decision: "manual-retry-required",
        softEnforcement,
        observation,
        continuationResult,
        explain: continuationResult.explain,
      });
    }
    if (continuationResult && isSafeContinuationResult(continuationResult) && options.allowSafeContinuation) {
      const prepared = options.prepareContinuation?.(input.continuationTokenId, continuationContext) ?? continuationResult;
      const preparedSafe = isSafeContinuationResult(prepared);
      return buildResult({
        input,
        options: { ...options, mode },
        timestamp,
        decision: prepared.preparedAction && preparedSafe ? "prepare-safe-continuation" : "allow-with-valid-continuation",
        softEnforcement,
        observation,
        continuationResult: prepared,
        usedContinuationTokenId: input.continuationTokenId,
        preparedContinuationTokenId: prepared.preparedAction?.tokenId,
        explain: prepared.explain,
      });
    }
    if (continuationResult && !continuationResult.valid) {
      return buildResult({
        input,
        options: { ...options, mode },
        timestamp,
        decision: "require-primary-host-approval",
        softEnforcement,
        observation,
        continuationResult,
        warnings: ["Continuation token was not valid for this outbound context; Primary Host approval is still required."],
        explain: continuationResult.explain,
      });
    }
  }

  const preQueue = buildResult({
    input,
    options: { ...options, mode },
    timestamp,
    decision: "require-primary-host-approval",
    softEnforcement,
    observation,
    explain: "This LucaLink outbound action requires Primary Host approval before runtime execution.",
  });
  const queued = options.queueApproval?.(preQueue, {
    input,
    event,
    softEnforcement,
    observation,
  });
  if (queued?.request?.id) {
    return buildResult({
      input,
      options: { ...options, mode },
      timestamp,
      decision: "queue-approval",
      softEnforcement,
      observation,
      approvalRequestId: queued.request.id,
      warnings: queued.warnings,
      errors: queued.errors,
      explain: "This LucaLink outbound action was queued for Primary Host approval; no runtime action was executed.",
    });
  }

  return buildResult({
    input,
    options: { ...options, mode },
    timestamp,
    decision: "require-primary-host-approval",
    softEnforcement,
    observation,
    warnings: queued?.warnings,
    errors: queued?.errors,
    explain: "This LucaLink outbound action requires Primary Host approval before runtime execution.",
  });
}

export function shouldAllowLucaLinkRuntimeEvent(
  input: LucaLinkRuntimeEnforcementInput,
  options: LucaLinkRuntimeEnforcementGateOptions = {},
): boolean {
  return evaluateLucaLinkRuntimeEnforcement(input, options).allowed;
}

export function shouldBlockLucaLinkRuntimeEvent(
  input: LucaLinkRuntimeEnforcementInput,
  options: LucaLinkRuntimeEnforcementGateOptions = {},
): boolean {
  return evaluateLucaLinkRuntimeEnforcement(input, options).blocked;
}

export function createLucaLinkRuntimeEnforcementAuditRecord(
  result: LucaLinkRuntimeEnforcementResult,
): LucaLinkRuntimeEnforcementAuditRecord {
  return {
    id: result.id,
    timestamp: result.timestamp,
    mode: result.mode,
    scope: result.scope,
    eventName: result.eventName,
    decision: result.decision,
    allowed: result.allowed,
    blocked: result.blocked,
    queuedApproval: result.queuedApproval,
    requiresPrimaryHostApproval: result.requiresPrimaryHostApproval,
    requiresManualRetry: result.requiresManualRetry,
    requiresFreshConfirmation: result.requiresFreshConfirmation,
    approvalRequestId: result.approvalRequestId,
    usedContinuationTokenId: result.usedContinuationTokenId,
    preparedContinuationTokenId: result.preparedContinuationTokenId,
    warnings: [...result.warnings],
    errors: [...result.errors],
    explain: result.explain,
  };
}

export function summarizeLucaLinkRuntimeEnforcementAudit(
  records: readonly LucaLinkRuntimeEnforcementAuditRecord[],
): LucaLinkRuntimeEnforcementAuditSummary {
  const decisions = {} as Record<LucaLinkRuntimeEnforcementDecision, number>;
  for (const record of records) {
    decisions[record.decision] = (decisions[record.decision] ?? 0) + 1;
  }
  return {
    total: records.length,
    allowed: records.filter((record) => record.allowed).length,
    blocked: records.filter((record) => record.blocked).length,
    queuedApproval: records.filter((record) => record.queuedApproval).length,
    requiresPrimaryHostApproval: records.filter((record) => record.requiresPrimaryHostApproval).length,
    requiresManualRetry: records.filter((record) => record.requiresManualRetry).length,
    requiresFreshConfirmation: records.filter((record) => record.requiresFreshConfirmation).length,
    decisions,
    recent: records.slice(-10),
    warnings: records.flatMap((record) => record.warnings),
    errors: records.flatMap((record) => record.errors),
  };
}

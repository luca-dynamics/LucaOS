/**
 * LucaLink Controlled Runtime Continuation Bridge (PR #196)
 *
 * Pure, side-effect-free bridge for evaluating and preparing safe continuation
 * model objects from approved + valid LucaLink continuation tokens. This module
 * does not send, emit, retry, replay, execute, persist, open sockets, touch
 * browser APIs, or perform any physical-world action.
 */

import {
  consumeLucaLinkContinuationToken,
  getLucaLinkContinuationToken,
  validateLucaLinkContinuationToken,
  type LucaLinkContinuationRegistryState,
  type LucaLinkContinuationRisk,
  type LucaLinkContinuationToken,
  type LucaLinkContinuationValidationContext,
} from "./lucaLinkContinuation";

export type LucaLinkContinuationBridgeDecision =
  | "can-prepare-safe-continuation"
  | "cannot-continue"
  | "requires-manual-retry"
  | "requires-fresh-confirmation"
  | "invalid-token"
  | "blocked-risk";

export type LucaLinkContinuationBridgeActionKind =
  | "notification"
  | "conversation"
  | "message"
  | "manual-retry-only"
  | "fresh-confirmation"
  | "blocked"
  | "unknown";

export interface LucaLinkContinuationBridgeInput {
  tokenId: string;
  requestedByDeviceId?: string;
  requestedTargetDeviceId?: string;
  permission?: string;
  lane?: string;
  eventName?: string;
  now?: number;
}

export interface LucaLinkContinuationPreparedAction {
  tokenId: string;
  actionKind: LucaLinkContinuationBridgeActionKind;
  permission?: string;
  lane?: string;
  eventName?: string;
  requestedByDeviceId?: string;
  requestedTargetDeviceId?: string;
  payloadPreview?: unknown;
  title: string;
  summary: string;
  safeToAutoContinue: boolean;
  requiresManualUserAction: boolean;
  requiresFreshConfirmation: boolean;
}

export interface LucaLinkContinuationBridgeResult {
  decision: LucaLinkContinuationBridgeDecision;
  token?: LucaLinkContinuationToken;
  preparedAction?: LucaLinkContinuationPreparedAction;
  valid: boolean;
  canExecuteNow: boolean;
  canAutoContinue: boolean;
  requiresManualRetry: boolean;
  requiresFreshConfirmation: boolean;
  consumed?: boolean;
  warnings: string[];
  errors: string[];
  explain: string;
}

const SAFE_PERMISSIONS: ReadonlySet<string> = new Set([
  "notification.send",
  "conversation.continue",
  "message.send",
]);

const MANUAL_RETRY_PERMISSIONS: ReadonlySet<string> = new Set([
  "shell.execute",
  "files.write",
  "code.modify",
  "git.create_pr",
  "browser.control",
]);

const FRESH_CONFIRMATION_PERMISSIONS: ReadonlySet<string> = new Set([
  "payment.spend",
  "robotics.motion",
  "smart_home.control",
]);

const PHYSICAL_WORLD_HINTS: ReadonlyArray<RegExp> = [
  /actuat/i,
  /physical/i,
  /robot/i,
  /motion/i,
  /smart[_-]?home/i,
  /device\.control/i,
  /door\./i,
  /lock\./i,
  /vehicle\./i,
  /drone\./i,
];

function hasLowOrMediumRisk(token: LucaLinkContinuationToken): boolean {
  return token.risk === "low" || token.risk === "medium" || !token.risk;
}

function hasHighOrCriticalRisk(token: LucaLinkContinuationToken): boolean {
  return token.risk === "high" || token.risk === "critical";
}

function hasPhysicalWorldSignal(token: LucaLinkContinuationToken): boolean {
  const values = [token.permission, token.lane, token.eventName].filter(
    (value): value is string => !!value,
  );
  return values.some((value) =>
    PHYSICAL_WORLD_HINTS.some((hint) => hint.test(value)),
  );
}

function actionKindForSafeToken(
  token: LucaLinkContinuationToken,
): LucaLinkContinuationBridgeActionKind {
  if (token.permission === "notification.send") return "notification";
  if (token.permission === "conversation.continue") return "conversation";
  if (token.permission === "message.send") return "message";
  if (token.lane === "notification") return "notification";
  if (token.lane === "conversation") return "conversation";
  return "unknown";
}

export function requiresManualRetryForContinuationBridge(
  token: LucaLinkContinuationToken,
): boolean {
  return (
    token.replayMode === "manual-retry-only" ||
    !!(token.permission && MANUAL_RETRY_PERMISSIONS.has(token.permission))
  );
}

export function requiresFreshConfirmationForContinuationBridge(
  token: LucaLinkContinuationToken,
): boolean {
  return (
    token.replayMode === "fresh-confirmation-required" ||
    !!(token.permission && FRESH_CONFIRMATION_PERMISSIONS.has(token.permission)) ||
    hasPhysicalWorldSignal(token) ||
    (token.lane === "safety" && token.risk === "critical")
  );
}

export function isContinuationBridgeSafeAction(
  token: LucaLinkContinuationToken,
): boolean {
  const safePermission = !!(
    token.permission && SAFE_PERMISSIONS.has(token.permission)
  );
  const safeLane = token.lane === "notification" || token.lane === "conversation";

  return (
    token.status === "validated" &&
    token.replayMode === "single-use-replayable" &&
    hasLowOrMediumRisk(token) &&
    !requiresManualRetryForContinuationBridge(token) &&
    !requiresFreshConfirmationForContinuationBridge(token) &&
    (safePermission || safeLane)
  );
}

export function isContinuationBridgeBlockedAction(
  token: LucaLinkContinuationToken,
): boolean {
  if (
    token.status === "blocked" ||
    token.status === "expired" ||
    token.status === "consumed" ||
    token.status === "cancelled"
  ) {
    return true;
  }

  if (token.replayMode === "non-replayable") return true;
  if (hasHighOrCriticalRisk(token) && !requiresFreshConfirmationForContinuationBridge(token)) {
    return true;
  }

  return !isContinuationBridgeSafeAction(token) &&
    !requiresManualRetryForContinuationBridge(token) &&
    !requiresFreshConfirmationForContinuationBridge(token);
}

export function classifyContinuationBridgeAction(
  token: LucaLinkContinuationToken,
): LucaLinkContinuationBridgeActionKind {
  if (requiresFreshConfirmationForContinuationBridge(token)) {
    return "fresh-confirmation";
  }
  if (requiresManualRetryForContinuationBridge(token)) return "manual-retry-only";
  if (isContinuationBridgeBlockedAction(token)) return "blocked";
  if (isContinuationBridgeSafeAction(token)) return actionKindForSafeToken(token);
  return "unknown";
}

function validationContext(
  input: LucaLinkContinuationBridgeInput,
): LucaLinkContinuationValidationContext {
  return {
    now: input.now,
    requestedByDeviceId: input.requestedByDeviceId,
    requestedTargetDeviceId: input.requestedTargetDeviceId,
    permission: input.permission,
    lane: input.lane,
    eventName: input.eventName,
  };
}

function bridgeResult(options: {
  decision: LucaLinkContinuationBridgeDecision;
  token?: LucaLinkContinuationToken;
  preparedAction?: LucaLinkContinuationPreparedAction;
  valid: boolean;
  consumed?: boolean;
  warnings?: string[];
  errors?: string[];
  explain: string;
}): LucaLinkContinuationBridgeResult {
  const requiresManualRetry = options.decision === "requires-manual-retry";
  const requiresFreshConfirmation =
    options.decision === "requires-fresh-confirmation";
  const canAutoContinue =
    options.decision === "can-prepare-safe-continuation" &&
    !!options.preparedAction?.safeToAutoContinue;

  return {
    decision: options.decision,
    token: options.token,
    preparedAction: options.preparedAction,
    valid: options.valid,
    canExecuteNow: false,
    canAutoContinue,
    requiresManualRetry,
    requiresFreshConfirmation,
    consumed: options.consumed,
    warnings: options.warnings ?? [],
    errors: options.errors ?? [],
    explain: options.explain,
  };
}

function preparedActionFromToken(
  token: LucaLinkContinuationToken,
): LucaLinkContinuationPreparedAction {
  const actionKind = actionKindForSafeToken(token);
  return {
    tokenId: token.id,
    actionKind,
    permission: token.permission,
    lane: token.lane,
    eventName: token.eventName,
    requestedByDeviceId: token.requestedByDeviceId,
    requestedTargetDeviceId: token.requestedTargetDeviceId,
    payloadPreview: token.payloadPreview,
    title: token.title,
    summary:
      `${token.summary} Prepared as a model-only safe continuation; no send, ` +
      "emit, retry, replay, beam, or execution occurs in this bridge.",
    safeToAutoContinue: true,
    requiresManualUserAction: false,
    requiresFreshConfirmation: false,
  };
}

function decisionForInvalidToken(
  token: LucaLinkContinuationToken | undefined,
): LucaLinkContinuationBridgeDecision {
  if (!token) return "invalid-token";
  if (requiresFreshConfirmationForContinuationBridge(token)) {
    return "requires-fresh-confirmation";
  }
  if (requiresManualRetryForContinuationBridge(token)) {
    return "requires-manual-retry";
  }
  if (
    token.status === "blocked" ||
    token.status === "expired" ||
    token.status === "consumed" ||
    token.status === "cancelled" ||
    token.replayMode === "non-replayable"
  ) {
    return "blocked-risk";
  }
  return "invalid-token";
}

export function evaluateLucaLinkContinuationBridge(
  registry: LucaLinkContinuationRegistryState,
  input: LucaLinkContinuationBridgeInput,
): LucaLinkContinuationBridgeResult {
  const token = getLucaLinkContinuationToken(registry, input.tokenId);
  const validation = validateLucaLinkContinuationToken(
    registry,
    input.tokenId,
    validationContext(input),
  );
  const evaluatedToken = validation.token ?? token;

  if (!validation.valid || !evaluatedToken) {
    const decision = decisionForInvalidToken(evaluatedToken);
    return bridgeResult({
      decision,
      token: evaluatedToken,
      valid: false,
      warnings: validation.warnings,
      errors: validation.errors,
      explain:
        decision === "requires-fresh-confirmation"
          ? "Continuation bridge refused this token because it requires fresh " +
            "Primary Host confirmation; no action was continued."
          : decision === "requires-manual-retry"
            ? "Continuation bridge refused automatic preparation because this action " +
              "is manual-retry-only; no action was continued."
            : "Continuation bridge could not validate this token for controlled continuation; no action was continued.",
    });
  }

  if (isContinuationBridgeSafeAction(evaluatedToken)) {
    return bridgeResult({
      decision: "can-prepare-safe-continuation",
      token: evaluatedToken,
      valid: true,
      warnings: validation.warnings,
      errors: [],
      explain:
        "Continuation bridge can prepare a safe notification/conversation/message " +
        "model only. This does not send, emit, retry, replay, beam, or execute " +
        "the action.",
    });
  }

  if (requiresManualRetryForContinuationBridge(evaluatedToken)) {
    return bridgeResult({
      decision: "requires-manual-retry",
      token: evaluatedToken,
      valid: true,
      warnings: validation.warnings,
      errors: [],
      explain:
        "Continuation bridge classifies this action as manual-retry-only; no action was continued.",
    });
  }

  if (requiresFreshConfirmationForContinuationBridge(evaluatedToken)) {
    return bridgeResult({
      decision: "requires-fresh-confirmation",
      token: evaluatedToken,
      valid: true,
      warnings: validation.warnings,
      errors: [],
      explain:
        "Continuation bridge classifies this action as requiring fresh " +
        "Primary Host confirmation; no action was continued.",
    });
  }

  return bridgeResult({
    decision: "blocked-risk",
    token: evaluatedToken,
    valid: true,
    warnings: validation.warnings,
    errors: [],
    explain:
      "Continuation bridge blocked this token because it is not an allowed " +
      "low/medium notification, conversation, or message continuation.",
  });
}

export function prepareLucaLinkSafeContinuation(
  registry: LucaLinkContinuationRegistryState,
  input: LucaLinkContinuationBridgeInput,
): LucaLinkContinuationBridgeResult {
  const evaluated = evaluateLucaLinkContinuationBridge(registry, input);
  if (
    evaluated.decision !== "can-prepare-safe-continuation" ||
    !evaluated.token ||
    !isContinuationBridgeSafeAction(evaluated.token)
  ) {
    return evaluated;
  }

  const preparedAction = preparedActionFromToken(evaluated.token);
  return bridgeResult({
    decision: "can-prepare-safe-continuation",
    token: evaluated.token,
    preparedAction,
    valid: true,
    warnings: evaluated.warnings,
    errors: [],
    explain:
      "Prepared a safe continuation model for a validated token. The " +
      "controlled bridge remains model-only and does not send, emit, retry, " +
      "replay, beam, or execute.",
  });
}

export function consumePreparedLucaLinkContinuation(
  registry: LucaLinkContinuationRegistryState,
  preparedAction: LucaLinkContinuationPreparedAction,
  context: LucaLinkContinuationValidationContext & {
    consumedByDeviceId?: string;
    reason?: string;
  } = {},
): LucaLinkContinuationBridgeResult {
  const evaluated = prepareLucaLinkSafeContinuation(registry, {
    tokenId: preparedAction.tokenId,
    requestedByDeviceId: preparedAction.requestedByDeviceId,
    requestedTargetDeviceId: preparedAction.requestedTargetDeviceId,
    permission: preparedAction.permission,
    lane: preparedAction.lane,
    eventName: preparedAction.eventName,
    now: context.now,
  });

  if (!evaluated.preparedAction || !evaluated.token) return evaluated;

  const consumed = consumeLucaLinkContinuationToken(
    registry,
    preparedAction.tokenId,
    {
      ...context,
      requestedByDeviceId: preparedAction.requestedByDeviceId,
      requestedTargetDeviceId: preparedAction.requestedTargetDeviceId,
      permission: preparedAction.permission,
      lane: preparedAction.lane,
      eventName: preparedAction.eventName,
      reason: context.reason ?? "Consumed prepared safe continuation model only.",
    },
  );

  return bridgeResult({
    decision: consumed.consumed ? "cannot-continue" : "invalid-token",
    token: consumed.token ?? evaluated.token,
    preparedAction: evaluated.preparedAction,
    valid: consumed.valid,
    consumed: consumed.consumed,
    warnings: consumed.warnings,
    errors: consumed.errors,
    explain: consumed.consumed
      ? "Prepared safe continuation token was marked consumed as state only. " +
        "No send, emit, retry, replay, beam, or execution occurred."
      : "Prepared safe continuation token could not be consumed; no action was continued.",
  });
}

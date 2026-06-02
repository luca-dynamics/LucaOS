/**
 * LucaLink Runtime Continuation Model (PR #194)
 *
 * Pure, in-memory continuation token model for approved LucaLink actions.
 * This module does not execute, retry, replay, send, emit, persist, open
 * sockets, access browser APIs, or continue blocked actions. Approval records
 * can become short-lived continuation tokens, but approval never equals
 * execution.
 */

import type { LucaLinkApprovalRequest } from "./lucaLinkApprovalQueue";

export type LucaLinkContinuationStatus =
  | "pending"
  | "validated"
  | "consumed"
  | "expired"
  | "cancelled"
  | "blocked";

export type LucaLinkContinuationReplayMode =
  | "non-replayable"
  | "manual-retry-only"
  | "single-use-replayable"
  | "fresh-confirmation-required";

export type LucaLinkContinuationRisk = "low" | "medium" | "high" | "critical";

export type LucaLinkContinuationSource =
  | "approval-queue"
  | "manual"
  | "future-runtime-enforcement";

export interface LucaLinkContinuationToken {
  id: string;
  requestId?: string;
  source: LucaLinkContinuationSource;

  status: LucaLinkContinuationStatus;
  replayMode: LucaLinkContinuationReplayMode;

  createdAt: number;
  updatedAt: number;
  expiresAt: number;
  consumedAt?: number;

  approvedAt?: number;
  approvedByDeviceId?: string;

  requestedByDeviceId?: string;
  requestedTargetDeviceId?: string;

  eventName?: string;
  lane?: string;
  permission?: string;
  risk?: LucaLinkContinuationRisk;

  title: string;
  summary: string;
  explain: string;

  payloadPreview?: unknown;
  envelopeId?: string;
  envelopeType?: string;

  validationWarnings: string[];
  validationErrors: string[];

  consumeRecord?: {
    consumedAt: number;
    consumedByDeviceId?: string;
    reason?: string;
  };
}

export interface LucaLinkContinuationRegistryOptions {
  now?: number;
  defaultTtlMs?: number;
  maxTokens?: number;
}

export interface LucaLinkContinuationRegistryState {
  tokens: LucaLinkContinuationToken[];
  defaultTtlMs: number;
  maxTokens: number;
  now?: number;
}

export interface LucaLinkContinuationTokenInput {
  id?: string;
  requestId?: string;
  source?: LucaLinkContinuationSource;
  status?: LucaLinkContinuationStatus;
  replayMode?: LucaLinkContinuationReplayMode;
  ttlMs?: number;
  approvedAt?: number;
  approvedByDeviceId?: string;
  requestedByDeviceId?: string;
  requestedTargetDeviceId?: string;
  eventName?: string;
  lane?: string;
  permission?: string;
  risk?: LucaLinkContinuationRisk;
  title?: string;
  summary?: string;
  explain?: string;
  payloadPreview?: unknown;
  envelopeId?: string;
  envelopeType?: string;
  validationWarnings?: string[];
  validationErrors?: string[];
}

export interface LucaLinkContinuationValidationContext {
  now?: number;
  requestedByDeviceId?: string;
  requestedTargetDeviceId?: string;
  permission?: string;
  lane?: string;
  eventName?: string;
}

export interface LucaLinkContinuationValidationResult {
  token?: LucaLinkContinuationToken;
  valid: boolean;
  warnings: string[];
  errors: string[];
}

export interface LucaLinkContinuationMutationResult extends LucaLinkContinuationValidationResult {
  created?: boolean;
  consumed?: boolean;
  cancelled?: boolean;
  expired?: LucaLinkContinuationToken[];
}

export interface LucaLinkContinuationRegistrySummary {
  total: number;
  pending: number;
  validated: number;
  consumed: number;
  expired: number;
  cancelled: number;
  blocked: number;
  valid: number;
  byReplayMode: Record<LucaLinkContinuationReplayMode, number>;
  byRisk: Record<LucaLinkContinuationRisk, number>;
  warnings: string[];
}

const DEFAULT_TTL_MS = 2 * 60 * 1000;
const DEFAULT_MAX_TOKENS = 100;

const FRESH_CONFIRMATION_PERMISSIONS: ReadonlySet<string> = new Set([
  "payment.spend",
  "robotics.motion",
  "smart_home.control",
]);

const PHYSICAL_PERMISSION_HINTS: ReadonlyArray<RegExp> = [
  /robot/i,
  /motion/i,
  /actuat/i,
  /smart[_-]?home/i,
  /device\.control/i,
  /door\./i,
  /lock\./i,
  /vehicle\./i,
  /drone\./i,
];

const MANUAL_RETRY_PERMISSIONS: ReadonlySet<string> = new Set([
  "shell.execute",
  "browser.control",
  "git.create_pr",
  "code.modify",
  "files.write",
]);

const SINGLE_USE_PERMISSIONS: ReadonlySet<string> = new Set([
  "notification.send",
  "conversation.continue",
  "message.send",
]);

function currentTime(options?: { now?: number }): number {
  return typeof options?.now === "number" ? options.now : Date.now();
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function hashString(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function createContinuationId(
  input: LucaLinkContinuationTokenInput,
  now: number,
): string {
  const fingerprint = stableStringify({
    source: input.source ?? "manual",
    requestId: input.requestId,
    eventName: input.eventName,
    lane: input.lane,
    permission: input.permission,
    requestedByDeviceId: input.requestedByDeviceId,
    requestedTargetDeviceId: input.requestedTargetDeviceId,
  });
  return `luca-continuation-${now}-${hashString(fingerprint)}`;
}

function isExpired(token: LucaLinkContinuationToken, now: number): boolean {
  return token.expiresAt <= now;
}

function hasPhysicalWorldSignal(input: {
  permission?: string;
  lane?: string;
  eventName?: string;
}): boolean {
  const values = [input.permission, input.lane, input.eventName].filter(
    (value): value is string => !!value,
  );
  return values.some((value) =>
    PHYSICAL_PERMISSION_HINTS.some((hint) => hint.test(value)),
  );
}

export function classifyLucaLinkContinuationReplayMode(input: {
  permission?: string;
  lane?: string;
  eventName?: string;
  risk?: LucaLinkContinuationRisk;
  replayMode?: LucaLinkContinuationReplayMode;
}): LucaLinkContinuationReplayMode {
  if (input.replayMode) return input.replayMode;

  if (
    input.permission &&
    FRESH_CONFIRMATION_PERMISSIONS.has(input.permission)
  ) {
    return "fresh-confirmation-required";
  }

  if (hasPhysicalWorldSignal(input)) {
    return "fresh-confirmation-required";
  }

  if (input.lane === "safety" && input.risk === "critical") {
    return "fresh-confirmation-required";
  }

  if (input.permission && MANUAL_RETRY_PERMISSIONS.has(input.permission)) {
    return "manual-retry-only";
  }

  if (
    input.permission &&
    SINGLE_USE_PERMISSIONS.has(input.permission) &&
    (input.risk === "low" || input.risk === "medium" || !input.risk) &&
    !hasPhysicalWorldSignal(input)
  ) {
    return "single-use-replayable";
  }

  return "manual-retry-only";
}

export function requiresFreshConfirmationForContinuation(input: {
  replayMode?: LucaLinkContinuationReplayMode;
  permission?: string;
  lane?: string;
  eventName?: string;
  risk?: LucaLinkContinuationRisk;
}): boolean {
  return (
    classifyLucaLinkContinuationReplayMode(input) ===
    "fresh-confirmation-required"
  );
}

export function isLucaLinkContinuationReplayable(input: {
  replayMode?: LucaLinkContinuationReplayMode;
  permission?: string;
  lane?: string;
  eventName?: string;
  risk?: LucaLinkContinuationRisk;
  status?: LucaLinkContinuationStatus;
}): boolean {
  const mode = classifyLucaLinkContinuationReplayMode(input);
  return (
    mode === "single-use-replayable" &&
    (!input.status || input.status === "validated")
  );
}

export function createLucaLinkContinuationRegistry(
  options: LucaLinkContinuationRegistryOptions = {},
): LucaLinkContinuationRegistryState {
  return {
    tokens: [],
    defaultTtlMs: options.defaultTtlMs ?? DEFAULT_TTL_MS,
    maxTokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
    now: options.now,
  };
}

export function createLucaLinkContinuationToken(
  input: LucaLinkContinuationTokenInput,
  options: LucaLinkContinuationRegistryOptions = {},
): LucaLinkContinuationToken {
  const now = currentTime(options);
  const ttlMs = input.ttlMs ?? options.defaultTtlMs ?? DEFAULT_TTL_MS;
  const replayMode = classifyLucaLinkContinuationReplayMode(input);
  const validationWarnings = [...(input.validationWarnings ?? [])];
  const validationErrors = [...(input.validationErrors ?? [])];
  const freshConfirmation = replayMode === "fresh-confirmation-required";

  if (freshConfirmation) {
    validationWarnings.push(
      "Continuation requires fresh Primary Host confirmation and cannot be replayed from this token.",
    );
  }

  if (replayMode === "non-replayable") {
    validationWarnings.push(
      "Continuation is non-replayable and can only be recorded for audit.",
    );
  }

  return {
    id: input.id ?? createContinuationId(input, now),
    requestId: input.requestId,
    source: input.source ?? "manual",
    status:
      input.status ??
      (freshConfirmation || replayMode === "non-replayable"
        ? "blocked"
        : "validated"),
    replayMode,
    createdAt: now,
    updatedAt: now,
    expiresAt: now + ttlMs,
    approvedAt: input.approvedAt,
    approvedByDeviceId: input.approvedByDeviceId,
    requestedByDeviceId: input.requestedByDeviceId,
    requestedTargetDeviceId: input.requestedTargetDeviceId,
    eventName: input.eventName,
    lane: input.lane,
    permission: input.permission,
    risk: input.risk,
    title: input.title ?? "LucaLink continuation token",
    summary: input.summary ?? "Short-lived LucaLink continuation model record.",
    explain:
      input.explain ??
      "Primary Host approval created a continuation record; this model does not execute or replay the action.",
    payloadPreview: input.payloadPreview,
    envelopeId: input.envelopeId,
    envelopeType: input.envelopeType,
    validationWarnings,
    validationErrors,
  };
}

function enforceMaxTokens(registry: LucaLinkContinuationRegistryState): void {
  while (registry.tokens.length > registry.maxTokens) {
    const finalizedIndex = registry.tokens.findIndex(
      (token) => token.status !== "validated" && token.status !== "pending",
    );
    if (finalizedIndex >= 0) {
      registry.tokens.splice(finalizedIndex, 1);
      continue;
    }
    registry.tokens.shift();
  }
}

export function registerLucaLinkContinuation(
  registry: LucaLinkContinuationRegistryState,
  tokenOrInput: LucaLinkContinuationToken | LucaLinkContinuationTokenInput,
): LucaLinkContinuationMutationResult {
  const token =
    "createdAt" in tokenOrInput && "expiresAt" in tokenOrInput
      ? {
          ...tokenOrInput,
          validationWarnings: [...tokenOrInput.validationWarnings],
          validationErrors: [...tokenOrInput.validationErrors],
        }
      : createLucaLinkContinuationToken(tokenOrInput, {
          now: registry.now,
          defaultTtlMs: registry.defaultTtlMs,
        });

  registry.tokens.push(token);
  enforceMaxTokens(registry);
  return {
    token,
    valid: token.status === "validated",
    created: true,
    warnings: token.validationWarnings,
    errors: token.validationErrors,
  };
}

export function getLucaLinkContinuationToken(
  registry: LucaLinkContinuationRegistryState,
  tokenId: string,
): LucaLinkContinuationToken | undefined {
  return registry.tokens.find((token) => token.id === tokenId);
}

export function listLucaLinkContinuationTokens(
  registry: LucaLinkContinuationRegistryState,
): LucaLinkContinuationToken[] {
  return [...registry.tokens];
}

export function expireLucaLinkContinuationTokens(
  registry: LucaLinkContinuationRegistryState,
  now: number = currentTime({ now: registry.now }),
): LucaLinkContinuationMutationResult {
  const expired: LucaLinkContinuationToken[] = [];
  for (const token of registry.tokens) {
    if (
      (token.status === "pending" || token.status === "validated") &&
      isExpired(token, now)
    ) {
      token.status = "expired";
      token.updatedAt = now;
      token.validationWarnings = [
        ...token.validationWarnings,
        "Continuation token expired.",
      ];
      expired.push(token);
    }
  }
  return { valid: false, expired, warnings: [], errors: [] };
}

export function validateLucaLinkContinuationToken(
  registry: LucaLinkContinuationRegistryState,
  tokenId: string,
  context: LucaLinkContinuationValidationContext = {},
): LucaLinkContinuationValidationResult {
  const now = currentTime({ now: context.now ?? registry.now });
  const token = getLucaLinkContinuationToken(registry, tokenId);
  const warnings: string[] = [];
  const errors: string[] = [];

  if (!token) {
    return {
      valid: false,
      warnings: [`Unknown LucaLink continuation token id: ${tokenId}`],
      errors: [],
    };
  }

  if (isExpired(token, now) && token.status !== "expired") {
    token.status = "expired";
    token.updatedAt = now;
    token.validationWarnings = [
      ...token.validationWarnings,
      "Continuation token expired.",
    ];
  }

  if (token.status === "expired") errors.push("Continuation token is expired.");
  if (token.status === "consumed")
    errors.push("Continuation token is already consumed.");
  if (token.status === "cancelled")
    errors.push("Continuation token is cancelled.");
  if (token.status === "blocked") errors.push("Continuation token is blocked.");
  if (token.status !== "validated")
    errors.push(`Continuation token status is ${token.status}, not validated.`);
  if (token.replayMode === "fresh-confirmation-required") {
    errors.push("Continuation token requires fresh Primary Host confirmation.");
  }
  if (token.replayMode === "non-replayable") {
    errors.push("Continuation token is non-replayable.");
  }

  const matchChecks: Array<
    [keyof LucaLinkContinuationValidationContext, string | undefined, string]
  > = [
    ["requestedByDeviceId", token.requestedByDeviceId, "requesting device"],
    ["requestedTargetDeviceId", token.requestedTargetDeviceId, "target device"],
    ["permission", token.permission, "permission"],
    ["lane", token.lane, "lane"],
    ["eventName", token.eventName, "event name"],
  ];

  for (const [key, tokenValue, label] of matchChecks) {
    const contextValue = context[key];
    if (contextValue && tokenValue && contextValue !== tokenValue) {
      errors.push(`Continuation ${label} mismatch.`);
    }
  }

  return { token, valid: errors.length === 0, warnings, errors };
}

export function getValidLucaLinkContinuationTokens(
  registry: LucaLinkContinuationRegistryState,
  now: number = currentTime({ now: registry.now }),
): LucaLinkContinuationToken[] {
  expireLucaLinkContinuationTokens(registry, now);
  return registry.tokens.filter(
    (token) =>
      validateLucaLinkContinuationToken(registry, token.id, { now }).valid,
  );
}

export function consumeLucaLinkContinuationToken(
  registry: LucaLinkContinuationRegistryState,
  tokenId: string,
  context: LucaLinkContinuationValidationContext & {
    consumedByDeviceId?: string;
    reason?: string;
  } = {},
): LucaLinkContinuationMutationResult {
  const validation = validateLucaLinkContinuationToken(
    registry,
    tokenId,
    context,
  );
  if (!validation.valid || !validation.token) {
    return { ...validation, consumed: false };
  }

  const consumedAt = currentTime({ now: context.now ?? registry.now });
  validation.token.status = "consumed";
  validation.token.consumedAt = consumedAt;
  validation.token.updatedAt = consumedAt;
  validation.token.consumeRecord = {
    consumedAt,
    consumedByDeviceId: context.consumedByDeviceId,
    reason: context.reason,
  };

  return {
    token: validation.token,
    valid: true,
    consumed: true,
    warnings: validation.warnings,
    errors: [],
  };
}

export function cancelLucaLinkContinuationToken(
  registry: LucaLinkContinuationRegistryState,
  tokenId: string,
  options: { now?: number; reason?: string } = {},
): LucaLinkContinuationMutationResult {
  const token = getLucaLinkContinuationToken(registry, tokenId);
  if (!token) {
    return {
      valid: false,
      cancelled: false,
      warnings: [`Unknown LucaLink continuation token id: ${tokenId}`],
      errors: [],
    };
  }

  const now = currentTime({ now: options.now ?? registry.now });
  token.status = "cancelled";
  token.updatedAt = now;
  if (options.reason)
    token.validationWarnings = [...token.validationWarnings, options.reason];
  return {
    token,
    valid: false,
    cancelled: true,
    warnings: token.validationWarnings,
    errors: [],
  };
}

export function summarizeLucaLinkContinuationRegistry(
  registry: LucaLinkContinuationRegistryState,
  now: number = currentTime({ now: registry.now }),
): LucaLinkContinuationRegistrySummary {
  expireLucaLinkContinuationTokens(registry, now);
  const summary: LucaLinkContinuationRegistrySummary = {
    total: registry.tokens.length,
    pending: 0,
    validated: 0,
    consumed: 0,
    expired: 0,
    cancelled: 0,
    blocked: 0,
    valid: 0,
    byReplayMode: {
      "non-replayable": 0,
      "manual-retry-only": 0,
      "single-use-replayable": 0,
      "fresh-confirmation-required": 0,
    },
    byRisk: { low: 0, medium: 0, high: 0, critical: 0 },
    warnings: [],
  };

  for (const token of registry.tokens) {
    summary[token.status] += 1;
    summary.byReplayMode[token.replayMode] += 1;
    if (token.risk) summary.byRisk[token.risk] += 1;
    if (validateLucaLinkContinuationToken(registry, token.id, { now }).valid) {
      summary.valid += 1;
    }
  }

  if (registry.tokens.length >= registry.maxTokens) {
    summary.warnings.push("continuation registry is at max token capacity");
  }
  return summary;
}

export function clearLucaLinkContinuationRegistry(
  registry: LucaLinkContinuationRegistryState,
): LucaLinkContinuationMutationResult {
  registry.tokens.length = 0;
  return { valid: false, warnings: [], errors: [] };
}

export function shouldCreateContinuationFromApproval(
  approvalRequest: LucaLinkApprovalRequest,
  options: { now?: number } = {},
): boolean {
  const now = currentTime(options);
  return (
    approvalRequest.status === "approved" &&
    approvalRequest.decision?.decision === "approve" &&
    approvalRequest.expiresAt > now
  );
}

export function continuationTokenFromApprovalRequest(
  approvalRequest: LucaLinkApprovalRequest,
  options: LucaLinkContinuationRegistryOptions = {},
): LucaLinkContinuationToken | undefined {
  if (!shouldCreateContinuationFromApproval(approvalRequest, options))
    return undefined;

  return createLucaLinkContinuationToken(
    {
      source: "approval-queue",
      requestId: approvalRequest.id,
      approvedAt: approvalRequest.decision?.decidedAt,
      approvedByDeviceId: approvalRequest.decision?.decidedByDeviceId,
      requestedByDeviceId: approvalRequest.requestedByDeviceId,
      requestedTargetDeviceId: approvalRequest.requestedTargetDeviceId,
      eventName: approvalRequest.eventName,
      lane: approvalRequest.lane,
      permission: approvalRequest.permission,
      risk: approvalRequest.risk,
      title: approvalRequest.title,
      summary: approvalRequest.summary,
      explain: `${approvalRequest.explain} Approved by Primary Host; this continuation record does not execute, retry, replay, send, or emit the action.`,
      payloadPreview: approvalRequest.payloadPreview,
      envelopeId: approvalRequest.envelopeId,
      envelopeType: approvalRequest.envelopeType,
    },
    options,
  );
}

export function registerContinuationFromApprovalRequest(
  registry: LucaLinkContinuationRegistryState,
  approvalRequest: LucaLinkApprovalRequest,
  options: LucaLinkContinuationRegistryOptions = {},
): LucaLinkContinuationMutationResult {
  const token = continuationTokenFromApprovalRequest(approvalRequest, {
    now: options.now ?? registry.now,
    defaultTtlMs: options.defaultTtlMs ?? registry.defaultTtlMs,
    maxTokens: options.maxTokens ?? registry.maxTokens,
  });

  if (!token) {
    return {
      valid: false,
      warnings: [
        `Approval request ${approvalRequest.id} is not eligible for a continuation token.`,
      ],
      errors: [],
    };
  }

  return registerLucaLinkContinuation(registry, token);
}

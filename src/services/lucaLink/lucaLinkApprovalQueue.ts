/**
 * LucaLink Approval Request Queue (PR #192)
 *
 * Pure, in-memory Primary Host approval request model and pending queue for
 * soft-enforcement decisions. This module does not show UI, send network
 * messages, persist data, open sockets, prompt users, or execute actions.
 */

export type LucaLinkApprovalStatus =
  | "pending"
  | "approved"
  | "denied"
  | "expired"
  | "cancelled";

export type LucaLinkApprovalDecision = "approve" | "deny" | "expire" | "cancel";

export type LucaLinkApprovalRisk = "low" | "medium" | "high" | "critical";

export type LucaLinkApprovalSource =
  | "soft-enforcement"
  | "runtime-shadow"
  | "manual"
  | "future-runtime-enforcement";

export interface LucaLinkApprovalEnvelopeContext {
  id: string;
  lane: string;
  type: string;
  sourceDeviceId: string;
  targetDeviceId: string;
  payload: unknown;
}

export interface LucaLinkApprovalSoftEnforcementResult {
  decision: string;
  reason: string;
  blocked: boolean;
  requiresPrimaryHostApproval: boolean;
  eventName?: string;
  lane?: string;
  permission?: string;
  risk?: LucaLinkApprovalRisk;
  explain: string;
  warnings: string[];
  errors: string[];
}

export interface LucaLinkApprovalRequestDecisionRecord {
  decidedAt: number;
  decidedByDeviceId?: string;
  decision: LucaLinkApprovalDecision;
  reason?: string;
}

export interface LucaLinkApprovalRequest {
  id: string;
  status: LucaLinkApprovalStatus;
  source: LucaLinkApprovalSource;

  createdAt: number;
  updatedAt: number;
  expiresAt: number;

  requestedByDeviceId?: string;
  requestedByRole?: string;
  requestedTargetDeviceId?: string;

  approvalHostId?: string;
  approvalHostRole?: "primary" | "admin" | "owner" | string;

  eventName?: string;
  lane?: string;
  permission?: string;
  risk?: LucaLinkApprovalRisk;

  title: string;
  summary: string;
  reason: string;
  explain: string;

  payloadPreview?: unknown;
  envelopeId?: string;
  envelopeType?: string;

  softEnforcementDecision?: string;
  warnings: string[];
  errors: string[];

  decision?: LucaLinkApprovalRequestDecisionRecord;
}

export interface LucaLinkApprovalQueueOptions {
  now?: number;
  defaultTtlMs?: number;
  maxRequests?: number;
  dedupeWindowMs?: number;
}

export interface LucaLinkApprovalQueueState {
  requests: LucaLinkApprovalRequest[];
  defaultTtlMs: number;
  maxRequests: number;
  dedupeWindowMs: number;
  now?: number;
}

export interface LucaLinkApprovalRequestInput {
  source?: LucaLinkApprovalSource;
  ttlMs?: number;
  requestedByDeviceId?: string;
  requestedByRole?: string;
  requestedTargetDeviceId?: string;
  approvalHostId?: string;
  approvalHostRole?: "primary" | "admin" | "owner" | string;
  eventName?: string;
  lane?: string;
  permission?: string;
  risk?: LucaLinkApprovalRisk;
  title?: string;
  summary?: string;
  reason?: string;
  explain?: string;
  payloadPreview?: unknown;
  payload?: unknown;
  envelopeId?: string;
  envelopeType?: string;
  softEnforcementDecision?: string;
  warnings?: string[];
  errors?: string[];
}

export interface LucaLinkApprovalDecisionInput {
  now?: number;
  decidedByDeviceId?: string;
  reason?: string;
}

export interface LucaLinkApprovalMutationResult {
  request?: LucaLinkApprovalRequest;
  created?: boolean;
  deduped?: boolean;
  expired?: LucaLinkApprovalRequest[];
  warnings: string[];
  errors: string[];
}

export interface LucaLinkApprovalQueueSummary {
  total: number;
  pending: number;
  approved: number;
  denied: number;
  expired: number;
  cancelled: number;
  byRisk: Record<LucaLinkApprovalRisk, number>;
  warnings: string[];
}

export interface LucaLinkApprovalContext {
  eventName?: string;
  requestedByDeviceId?: string;
  requestedByRole?: string;
  requestedTargetDeviceId?: string;
  approvalHostId?: string;
  approvalHostRole?: string;
  payload?: unknown;
  envelope?: LucaLinkApprovalEnvelopeContext;
}

export interface LucaLinkApprovalPayloadPreviewOptions {
  maxDepth?: number;
  maxArrayItems?: number;
  maxStringLength?: number;
}

const DEFAULT_TTL_MS = 5 * 60 * 1000;
const DEFAULT_MAX_REQUESTS = 100;
const DEFAULT_DEDUPE_WINDOW_MS = 10 * 1000;
const REDACTED = "[redacted]";
const TRUNCATED = "[truncated]";
const TRUNCATED_DEPTH = "[truncated-depth]";
const SECRET_KEY_PATTERN =
  /password|token|secret|privatekey|api\s*key|apikey|bearer|authorization|credential|seed|mnemonic/i;

function currentTime(options?: { now?: number }): number {
  return typeof options?.now === "number" ? options.now : Date.now();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
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

function createApprovalId(
  input: LucaLinkApprovalRequestInput,
  now: number,
): string {
  const fingerprint = stableStringify({
    source: input.source,
    eventName: input.eventName,
    lane: input.lane,
    permission: input.permission,
    requestedByDeviceId: input.requestedByDeviceId,
    requestedTargetDeviceId: input.requestedTargetDeviceId,
    title: input.title,
  });
  return `luca-approval-${now}-${hashString(fingerprint)}`;
}

function titleForPermission(permission?: string, lane?: string): string {
  if (permission === "shell.execute") return "Approve shell execution?";
  if (permission === "files.write") return "Approve file write?";
  if (permission === "code.modify") return "Approve code modification?";
  if (permission === "robotics.motion") return "Approve robotics motion?";
  if (lane === "identity" || permission?.includes("identity")) {
    return "Approve guest identity access?";
  }
  return "Primary Host approval required";
}

function summaryForInput(input: LucaLinkApprovalRequestInput): string {
  const parts = [
    input.lane ? `lane ${input.lane}` : undefined,
    input.permission ? `permission ${input.permission}` : undefined,
    input.risk ? `risk ${input.risk}` : undefined,
    input.requestedByDeviceId ? `from ${input.requestedByDeviceId}` : undefined,
    input.requestedTargetDeviceId
      ? `to ${input.requestedTargetDeviceId}`
      : undefined,
  ].filter((part): part is string => !!part);

  return parts.length > 0
    ? `Primary Host approval requested for ${parts.join(", ")}.`
    : "Primary Host approval requested for a LucaLink action.";
}

function isPendingHighRisk(request: LucaLinkApprovalRequest): boolean {
  return (
    request.status === "pending" &&
    (request.risk === "high" || request.risk === "critical")
  );
}

function dedupeKey(input: {
  source?: string;
  eventName?: string;
  lane?: string;
  permission?: string;
  requestedByDeviceId?: string;
  requestedTargetDeviceId?: string;
}): string {
  return [
    input.source ?? "soft-enforcement",
    input.eventName ?? "",
    input.lane ?? "",
    input.permission ?? "",
    input.requestedByDeviceId ?? "",
    input.requestedTargetDeviceId ?? "",
  ].join("|");
}

function enforceMaxRequests(queue: LucaLinkApprovalQueueState): void {
  while (queue.requests.length > queue.maxRequests) {
    const finalizedIndex = queue.requests.findIndex(
      (request) => request.status !== "pending",
    );
    if (finalizedIndex >= 0) {
      queue.requests.splice(finalizedIndex, 1);
      continue;
    }

    const nonHighPendingIndex = queue.requests.findIndex(
      (request) => !isPendingHighRisk(request),
    );
    if (nonHighPendingIndex >= 0) {
      queue.requests.splice(nonHighPendingIndex, 1);
      continue;
    }

    queue.requests.shift();
  }
}

export function createLucaLinkApprovalQueue(
  options: LucaLinkApprovalQueueOptions = {},
): LucaLinkApprovalQueueState {
  return {
    requests: [],
    defaultTtlMs: options.defaultTtlMs ?? DEFAULT_TTL_MS,
    maxRequests: options.maxRequests ?? DEFAULT_MAX_REQUESTS,
    dedupeWindowMs: options.dedupeWindowMs ?? DEFAULT_DEDUPE_WINDOW_MS,
    now: options.now,
  };
}

export function createLucaLinkApprovalPayloadPreview(
  payload: unknown,
  options: LucaLinkApprovalPayloadPreviewOptions = {},
): unknown {
  const maxDepth = options.maxDepth ?? 3;
  const maxArrayItems = options.maxArrayItems ?? 10;
  const maxStringLength = options.maxStringLength ?? 500;
  const seen = new WeakSet<object>();

  function visit(value: unknown, depth: number, key?: string): unknown {
    if (key && SECRET_KEY_PATTERN.test(key)) return REDACTED;

    if (typeof value === "string") {
      return value.length > maxStringLength
        ? `${value.slice(0, maxStringLength)}${TRUNCATED}`
        : value;
    }

    if (
      value === null ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      return value;
    }

    if (typeof value === "bigint") return value.toString();
    if (typeof value === "undefined") return undefined;
    if (typeof value === "function" || typeof value === "symbol") {
      return `[${typeof value}]`;
    }

    if (typeof value !== "object") return String(value);
    if (seen.has(value)) return "[circular]";

    if (depth >= maxDepth) return TRUNCATED_DEPTH;

    seen.add(value);
    if (Array.isArray(value)) {
      const preview = value
        .slice(0, maxArrayItems)
        .map((item) => visit(item, depth + 1));
      if (value.length > maxArrayItems) preview.push(TRUNCATED);
      return preview;
    }

    const output: Record<string, unknown> = {};
    for (const [entryKey, entryValue] of Object.entries(value)) {
      output[entryKey] = visit(entryValue, depth + 1, entryKey);
    }
    return output;
  }

  return visit(payload, 0);
}

export function createLucaLinkApprovalRequest(
  input: LucaLinkApprovalRequestInput,
  options: LucaLinkApprovalQueueOptions = {},
): LucaLinkApprovalRequest {
  const createdAt = currentTime(options);
  const ttlMs = input.ttlMs ?? options.defaultTtlMs ?? DEFAULT_TTL_MS;
  const normalized: LucaLinkApprovalRequestInput = {
    ...input,
    source: input.source ?? "soft-enforcement",
  };

  return {
    id: createApprovalId(normalized, createdAt),
    status: "pending",
    source: normalized.source ?? "soft-enforcement",
    createdAt,
    updatedAt: createdAt,
    expiresAt: createdAt + ttlMs,
    requestedByDeviceId: input.requestedByDeviceId,
    requestedByRole: input.requestedByRole,
    requestedTargetDeviceId: input.requestedTargetDeviceId,
    approvalHostId: input.approvalHostId,
    approvalHostRole: input.approvalHostRole,
    eventName: input.eventName,
    lane: input.lane,
    permission: input.permission,
    risk: input.risk,
    title: input.title ?? titleForPermission(input.permission, input.lane),
    summary: input.summary ?? summaryForInput(input),
    reason: input.reason ?? "Primary Host approval is required.",
    explain:
      input.explain ??
      "This LucaLink action is pending Primary Host approval and will not execute automatically.",
    payloadPreview:
      input.payloadPreview ??
      ("payload" in input
        ? createLucaLinkApprovalPayloadPreview(input.payload)
        : undefined),
    envelopeId: input.envelopeId,
    envelopeType: input.envelopeType,
    softEnforcementDecision: input.softEnforcementDecision,
    warnings: [...(input.warnings ?? [])],
    errors: [...(input.errors ?? [])],
  };
}

export function dedupeLucaLinkApprovalRequest(
  queue: LucaLinkApprovalQueueState,
  input: LucaLinkApprovalRequestInput,
  now: number = currentTime({ now: queue.now }),
): LucaLinkApprovalRequest | undefined {
  const source = input.source ?? "soft-enforcement";
  const key = dedupeKey({ ...input, source });

  return queue.requests.find((request) => {
    if (request.status !== "pending") return false;
    if (request.expiresAt <= now) return false;
    if (now - request.updatedAt > queue.dedupeWindowMs) return false;
    return dedupeKey(request) === key;
  });
}

export function enqueueLucaLinkApprovalRequest(
  queue: LucaLinkApprovalQueueState,
  requestOrInput: LucaLinkApprovalRequest | LucaLinkApprovalRequestInput,
): LucaLinkApprovalMutationResult {
  const now =
    "status" in requestOrInput && "updatedAt" in requestOrInput
      ? requestOrInput.updatedAt
      : currentTime({ now: queue.now });
  const input = requestOrInput as LucaLinkApprovalRequestInput;
  const existing = dedupeLucaLinkApprovalRequest(queue, input, now);

  if (existing) {
    existing.updatedAt = now;
    existing.warnings = [
      ...existing.warnings,
      "deduped existing pending approval request.",
    ];
    return {
      request: existing,
      deduped: true,
      warnings: existing.warnings,
      errors: [],
    };
  }

  const request =
    "status" in requestOrInput && "createdAt" in requestOrInput
      ? {
          ...requestOrInput,
          warnings: [...requestOrInput.warnings],
          errors: [...requestOrInput.errors],
        }
      : createLucaLinkApprovalRequest(input, {
          now,
          defaultTtlMs: queue.defaultTtlMs,
        });

  queue.requests.push(request);
  enforceMaxRequests(queue);
  return { request, created: true, warnings: [], errors: [] };
}

function decideLucaLinkApprovalRequest(
  queue: LucaLinkApprovalQueueState,
  requestId: string,
  decision: LucaLinkApprovalDecision,
  status: LucaLinkApprovalStatus,
  input: LucaLinkApprovalDecisionInput = {},
): LucaLinkApprovalMutationResult {
  const request = getLucaLinkApprovalRequest(queue, requestId);
  if (!request) {
    return {
      warnings: [`Unknown LucaLink approval request id: ${requestId}`],
      errors: [],
    };
  }

  const decidedAt = currentTime({ now: input.now ?? queue.now });
  request.status = status;
  request.updatedAt = decidedAt;
  request.decision = {
    decidedAt,
    decidedByDeviceId: input.decidedByDeviceId,
    decision,
    reason: input.reason,
  };
  return { request, warnings: [], errors: [] };
}

export function approveLucaLinkApprovalRequest(
  queue: LucaLinkApprovalQueueState,
  requestId: string,
  decision: LucaLinkApprovalDecisionInput = {},
): LucaLinkApprovalMutationResult {
  return decideLucaLinkApprovalRequest(
    queue,
    requestId,
    "approve",
    "approved",
    decision,
  );
}

export function denyLucaLinkApprovalRequest(
  queue: LucaLinkApprovalQueueState,
  requestId: string,
  decision: LucaLinkApprovalDecisionInput = {},
): LucaLinkApprovalMutationResult {
  return decideLucaLinkApprovalRequest(
    queue,
    requestId,
    "deny",
    "denied",
    decision,
  );
}

export function cancelLucaLinkApprovalRequest(
  queue: LucaLinkApprovalQueueState,
  requestId: string,
  decision: LucaLinkApprovalDecisionInput = {},
): LucaLinkApprovalMutationResult {
  return decideLucaLinkApprovalRequest(
    queue,
    requestId,
    "cancel",
    "cancelled",
    decision,
  );
}

export function expireLucaLinkApprovalRequests(
  queue: LucaLinkApprovalQueueState,
  now: number = currentTime({ now: queue.now }),
): LucaLinkApprovalMutationResult {
  const expired: LucaLinkApprovalRequest[] = [];
  for (const request of queue.requests) {
    if (request.status === "pending" && request.expiresAt <= now) {
      request.status = "expired";
      request.updatedAt = now;
      request.decision = {
        decidedAt: now,
        decision: "expire",
        reason: "Approval request expired before a Primary Host decision.",
      };
      expired.push(request);
    }
  }
  return { expired, warnings: [], errors: [] };
}

export function getPendingLucaLinkApprovalRequests(
  queue: LucaLinkApprovalQueueState,
  now: number = currentTime({ now: queue.now }),
): LucaLinkApprovalRequest[] {
  expireLucaLinkApprovalRequests(queue, now);
  return queue.requests.filter((request) => request.status === "pending");
}

export function getLucaLinkApprovalRequest(
  queue: LucaLinkApprovalQueueState,
  requestId: string,
): LucaLinkApprovalRequest | undefined {
  return queue.requests.find((request) => request.id === requestId);
}

export function listLucaLinkApprovalRequests(
  queue: LucaLinkApprovalQueueState,
): LucaLinkApprovalRequest[] {
  return [...queue.requests];
}

export function clearLucaLinkApprovalQueue(
  queue: LucaLinkApprovalQueueState,
): LucaLinkApprovalMutationResult {
  queue.requests.length = 0;
  return { warnings: [], errors: [] };
}

export function summarizeLucaLinkApprovalQueue(
  queue: LucaLinkApprovalQueueState,
  now: number = currentTime({ now: queue.now }),
): LucaLinkApprovalQueueSummary {
  expireLucaLinkApprovalRequests(queue, now);
  const summary: LucaLinkApprovalQueueSummary = {
    total: queue.requests.length,
    pending: 0,
    approved: 0,
    denied: 0,
    expired: 0,
    cancelled: 0,
    byRisk: { low: 0, medium: 0, high: 0, critical: 0 },
    warnings: [],
  };

  for (const request of queue.requests) {
    summary[request.status] += 1;
    if (request.risk) summary.byRisk[request.risk] += 1;
  }

  if (queue.requests.length >= queue.maxRequests) {
    summary.warnings.push("approval queue is at max request capacity");
  }
  return summary;
}

export function shouldCreateApprovalRequest(
  result: LucaLinkApprovalSoftEnforcementResult,
): boolean {
  return (
    result.decision === "requires-primary-host-approval" &&
    result.requiresPrimaryHostApproval === true
  );
}

export function approvalRequestFromSoftEnforcementResult(
  result: LucaLinkApprovalSoftEnforcementResult,
  context: LucaLinkApprovalContext = {},
  options: LucaLinkApprovalQueueOptions = {},
): LucaLinkApprovalRequest | undefined {
  if (!shouldCreateApprovalRequest(result)) return undefined;

  const envelope = context.envelope;
  const payload = context.payload ?? envelope?.payload;
  const lane = result.lane ?? envelope?.lane;
  const permission = result.permission;
  const eventName = context.eventName ?? result.eventName;
  const requestedByDeviceId =
    context.requestedByDeviceId ?? envelope?.sourceDeviceId;
  const requestedTargetDeviceId =
    context.requestedTargetDeviceId ??
    (typeof envelope?.targetDeviceId === "string"
      ? envelope.targetDeviceId
      : undefined);

  return createLucaLinkApprovalRequest(
    {
      source: "soft-enforcement",
      eventName,
      lane,
      permission,
      risk: result.risk,
      requestedByDeviceId,
      requestedByRole: context.requestedByRole,
      requestedTargetDeviceId,
      approvalHostId: context.approvalHostId,
      approvalHostRole: context.approvalHostRole,
      title: titleForPermission(permission, lane),
      summary: summaryForInput({
        eventName,
        lane,
        permission,
        risk: result.risk,
        requestedByDeviceId,
        requestedTargetDeviceId,
      }),
      reason: result.reason,
      explain: result.explain,
      payload,
      envelopeId: envelope?.id,
      envelopeType: envelope?.type,
      softEnforcementDecision: result.decision,
      warnings: result.warnings,
      errors: result.errors,
    },
    options,
  );
}

export function enqueueApprovalForSoftEnforcementResult(
  queue: LucaLinkApprovalQueueState,
  result: LucaLinkApprovalSoftEnforcementResult,
  context: LucaLinkApprovalContext = {},
  options: LucaLinkApprovalQueueOptions = {},
): LucaLinkApprovalMutationResult {
  const request = approvalRequestFromSoftEnforcementResult(result, context, {
    now: options.now ?? queue.now,
    defaultTtlMs: options.defaultTtlMs ?? queue.defaultTtlMs,
  });
  if (!request) return { warnings: [], errors: [] };
  return enqueueLucaLinkApprovalRequest(queue, request);
}

/**
 * LucaLink Memory / Conversation Handoff (PR #200)
 *
 * Pure, side-effect-free handoff model for in-memory conversation, memory-intent,
 * mission, artifact, settings-context, and model-context transfers. This module
 * performs no socket, network, storage, permission, browser, tool, shell, file,
 * payment, physical-world, or import-time runtime actions.
 */

import type { LucaLinkTrustedDeviceRecord } from "./lucaLinkDeviceTrustRegistry";

export type LucaLinkHandoffKind =
  | "conversation"
  | "memory-intent"
  | "mission"
  | "artifact"
  | "settings-context"
  | "model-context";

export type LucaLinkHandoffStatus =
  | "draft"
  | "pending"
  | "approved"
  | "sent"
  | "received"
  | "accepted"
  | "declined"
  | "expired"
  | "cancelled"
  | "blocked";

export type LucaLinkHandoffRisk = "low" | "medium" | "high" | "critical";

export type LucaLinkHandoffDecision =
  | "allow"
  | "require-primary-host-approval"
  | "deny"
  | "sanitize"
  | "redact"
  | "blocked"
  | "invalid";

export interface LucaLinkHandoffPayloadPreview {
  kind: LucaLinkHandoffKind;
  summary: string;
  redacted: boolean;
  truncated: boolean;
  fields: Record<string, unknown>;
  warnings: string[];
}

export interface LucaLinkHandoffRequest {
  id: string;
  kind: LucaLinkHandoffKind;
  status: LucaLinkHandoffStatus;
  risk: LucaLinkHandoffRisk;

  createdAt: number;
  updatedAt: number;
  expiresAt: number;

  sourceDeviceId?: string;
  targetDeviceId?: string;
  requestedByDeviceId?: string;
  approvedByDeviceId?: string;

  title: string;
  summary: string;
  reason: string;

  payloadPreview: LucaLinkHandoffPayloadPreview;
  payload?: unknown;

  requiresPrimaryHostApproval: boolean;
  approvalRequestId?: string;
  continuationTokenId?: string;

  warnings: string[];
  errors: string[];
}

export interface LucaLinkHandoffRegistryState {
  requests: LucaLinkHandoffRequest[];
  maxRequests: number;
  defaultTtlMs: number;
}

export interface LucaLinkHandoffRegistryOptions {
  now?: number;
  maxRequests?: number;
  defaultTtlMs?: number;
}

export interface LucaLinkHandoffRequestInput {
  id?: string;
  kind: LucaLinkHandoffKind;
  status?: LucaLinkHandoffStatus;
  risk?: LucaLinkHandoffRisk;
  ttlMs?: number;
  sourceDeviceId?: string;
  targetDeviceId?: string;
  requestedByDeviceId?: string;
  approvedByDeviceId?: string;
  title?: string;
  summary?: string;
  reason?: string;
  payloadPreview?: LucaLinkHandoffPayloadPreview;
  payload?: unknown;
  requiresPrimaryHostApproval?: boolean;
  approvalRequestId?: string;
  continuationTokenId?: string;
  warnings?: string[];
  errors?: string[];
}

export interface LucaLinkHandoffMutationResult {
  valid: boolean;
  request?: LucaLinkHandoffRequest;
  expired?: LucaLinkHandoffRequest[];
  warnings: string[];
  errors: string[];
}

export interface LucaLinkHandoffRegistrySummary {
  total: number;
  pending: number;
  approved: number;
  sent: number;
  received: number;
  accepted: number;
  declined: number;
  expired: number;
  cancelled: number;
  blocked: number;
  byKind: Record<LucaLinkHandoffKind, number>;
  byRisk: Record<LucaLinkHandoffRisk, number>;
  redacted: number;
  truncated: number;
  requiresPrimaryHostApproval: number;
  warnings: string[];
}

export interface LucaLinkHandoffPayloadOptions {
  now?: number;
  maxMessages?: number;
  maxDepth?: number;
  maxArrayItems?: number;
  maxStringLength?: number;
}

export interface LucaLinkHandoffPolicyInput {
  kind: LucaLinkHandoffKind;
  sourceDeviceId?: string;
  targetDeviceId?: string;
  sourceDevice?: LucaLinkTrustedDeviceRecord;
  targetDevice?: LucaLinkTrustedDeviceRecord;
  risk?: LucaLinkHandoffRisk;
  payloadPreview?: LucaLinkHandoffPayloadPreview;
  requestedByDeviceId?: string;
  allowGuestConversationPreview?: boolean;
  explicitGuestPreview?: boolean;
  containsPhysicalPaymentOrSafetyAction?: boolean;
}

export interface LucaLinkHandoffPolicyResult {
  decision: LucaLinkHandoffDecision;
  allowed: boolean;
  blocked: boolean;
  requiresPrimaryHostApproval: boolean;
  risk: LucaLinkHandoffRisk;
  warnings: string[];
  errors: string[];
  explain: string;
}

type UnknownRecord = Record<string, unknown>;

const DEFAULT_TTL_MS = 10 * 60 * 1000;
const DEFAULT_MAX_REQUESTS = 100;
const REDACTED = "[redacted-secret]";
const TRUNCATED = "[truncated]";
const TRUNCATED_DEPTH = "[truncated-depth]";
const SECRET_KEY_PATTERN =
  /password|token|secret|privatekey|private-key|api\s*key|apikey|bearer|authorization|credential|seed|mnemonic|\bkey\b|cookie|session/i;
const HIDDEN_CONTEXT_PATTERN = /system prompt|hidden prompt|private reasoning|chain[- ]of[- ]thought|developer message/i;
const DANGEROUS_ACTION_PATTERN = /payment|purchase|spend|credential|secret|shell|execute|filesystem|private key|seed phrase|robot|drone|smart home|door lock|actuat|physical|safety/i;

function nowFrom(options?: { now?: number }): number {
  return typeof options?.now === "number" ? options.now : Date.now();
}

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function clonePreview(preview: LucaLinkHandoffPayloadPreview): LucaLinkHandoffPayloadPreview {
  return {
    ...preview,
    fields: { ...preview.fields },
    warnings: [...preview.warnings],
  };
}

function cloneRequest(request: LucaLinkHandoffRequest): LucaLinkHandoffRequest {
  return {
    ...request,
    payloadPreview: clonePreview(request.payloadPreview),
    warnings: [...request.warnings],
    errors: [...request.errors],
  };
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
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

function createId(input: LucaLinkHandoffRequestInput, createdAt: number): string {
  return `luca-handoff-${input.kind}-${createdAt}-${hashString(stableStringify({
    title: input.title,
    sourceDeviceId: input.sourceDeviceId,
    targetDeviceId: input.targetDeviceId,
    summary: input.summary,
  }))}`;
}

function textFrom(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(textFrom).join(" ");
  if (isRecord(value)) return Object.values(value).map(textFrom).join(" ");
  return "";
}

function removeSensitiveRecordKeys(record: UnknownRecord, allowKeys: string[]): UnknownRecord {
  const allowed = new Set(allowKeys);
  return Object.fromEntries(
    Object.entries(record).filter(([key]) => allowed.has(key) && !SECRET_KEY_PATTERN.test(key)),
  );
}

function redactionVisit(
  value: unknown,
  options: Required<Pick<LucaLinkHandoffPayloadOptions, "maxDepth" | "maxArrayItems" | "maxStringLength">>,
  state: { redacted: boolean; truncated: boolean; warnings: string[]; seen: WeakSet<object> },
  depth: number,
  key?: string,
): unknown {
  if (key && SECRET_KEY_PATTERN.test(key)) {
    state.redacted = true;
    state.warnings.push(`Redacted sensitive handoff field: ${key}.`);
    return REDACTED;
  }
  if (typeof value === "string") {
    const dangerousSecretValue = /(bearer\s+[a-z0-9._-]+|sk-[a-z0-9_-]+|api[_-]?key|seed phrase|mnemonic)/i.test(value);
    if (dangerousSecretValue) {
      state.redacted = true;
      state.warnings.push("Redacted secret-like string from handoff payload.");
      return REDACTED;
    }
    if (value.length > options.maxStringLength) {
      state.truncated = true;
      state.warnings.push("Truncated long string in handoff payload.");
      return `${value.slice(0, options.maxStringLength)}${TRUNCATED}`;
    }
    return value;
  }
  if (value === null || typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "undefined") return undefined;
  if (typeof value === "function" || typeof value === "symbol") {
    state.truncated = true;
    return `[${typeof value}]`;
  }
  if (typeof value !== "object") return String(value);
  if (state.seen.has(value)) {
    state.truncated = true;
    return "[circular]";
  }
  if (depth >= options.maxDepth) {
    state.truncated = true;
    state.warnings.push("Truncated handoff payload depth.");
    return TRUNCATED_DEPTH;
  }
  state.seen.add(value);
  if (Array.isArray(value)) {
    const output = value.slice(0, options.maxArrayItems).map((entry) => redactionVisit(entry, options, state, depth + 1));
    if (value.length > options.maxArrayItems) {
      state.truncated = true;
      state.warnings.push("Truncated handoff payload array.");
      output.push(TRUNCATED);
    }
    return output;
  }
  const output: UnknownRecord = {};
  for (const [entryKey, entryValue] of Object.entries(value)) {
    output[entryKey] = redactionVisit(entryValue, options, state, depth + 1, entryKey);
  }
  return output;
}

export function redactLucaLinkHandoffSecrets(
  payload: unknown,
  options: LucaLinkHandoffPayloadOptions = {},
): { payload: unknown; redacted: boolean; truncated: boolean; warnings: string[] } {
  const state = { redacted: false, truncated: false, warnings: [] as string[], seen: new WeakSet<object>() };
  const sanitized = redactionVisit(
    payload,
    {
      maxDepth: options.maxDepth ?? 4,
      maxArrayItems: options.maxArrayItems ?? 20,
      maxStringLength: options.maxStringLength ?? 1000,
    },
    state,
    0,
  );
  return { payload: sanitized, redacted: state.redacted, truncated: state.truncated, warnings: [...new Set(state.warnings)] };
}

export function sanitizeLucaLinkHandoffPayload(
  payload: unknown,
  options: LucaLinkHandoffPayloadOptions = {},
): { payload: unknown; redacted: boolean; truncated: boolean; warnings: string[] } {
  return redactLucaLinkHandoffSecrets(payload, options);
}

export function createLucaLinkHandoffPayloadPreview(
  payload: unknown,
  options: LucaLinkHandoffPayloadOptions & { kind?: LucaLinkHandoffKind; summary?: string } = {},
): LucaLinkHandoffPayloadPreview {
  const sanitized = sanitizeLucaLinkHandoffPayload(payload, options);
  const fields = isRecord(sanitized.payload) ? sanitized.payload : { value: sanitized.payload };
  const summary = options.summary ?? (isRecord(fields) && typeof fields.summary === "string" ? fields.summary : "Safe LucaLink handoff payload preview.");
  return {
    kind: options.kind ?? (isRecord(payload) && typeof payload.kind === "string" ? payload.kind as LucaLinkHandoffKind : "model-context"),
    summary,
    redacted: sanitized.redacted,
    truncated: sanitized.truncated,
    fields: fields as UnknownRecord,
    warnings: sanitized.warnings,
  };
}

export function classifyLucaLinkHandoffRisk(input: {
  kind?: LucaLinkHandoffKind;
  payload?: unknown;
  payloadPreview?: LucaLinkHandoffPayloadPreview;
  sensitive?: boolean;
  includesSecrets?: boolean;
  sizeEstimate?: number;
}): LucaLinkHandoffRisk {
  const text = `${input.kind ?? ""} ${textFrom(input.payload)} ${textFrom(input.payloadPreview?.fields)} ${input.payloadPreview?.warnings.join(" ") ?? ""}`;
  if (/payment|physical|robot|safety|shell|browser control|execute/i.test(text)) return "critical";
  if (input.includesSecrets || input.payloadPreview?.redacted || input.sensitive) return "high";
  if (input.kind === "memory-intent" || input.kind === "artifact" || input.kind === "mission" || input.kind === "model-context") return "medium";
  if ((input.sizeEstimate ?? text.length) > 4000) return "medium";
  return "low";
}

export function createConversationHandoffPayload(input: {
  conversationTitle?: string;
  title?: string;
  messages?: Array<{ role?: string; content?: string; visible?: boolean; hidden?: boolean }>;
  messageSummary?: string[] | string;
  currentTask?: string;
  activeIntent?: string;
  userVisibleContext?: unknown;
  timestamp?: number;
}, options: LucaLinkHandoffPayloadOptions = {}) {
  const maxMessages = options.maxMessages ?? 8;
  const visibleMessages = (input.messages ?? [])
    .filter((message) => message.visible !== false && !message.hidden && !/system|developer|tool-internal/i.test(message.role ?? ""))
    .slice(-maxMessages)
    .map((message) => ({ role: message.role ?? "user-visible", summary: message.content ?? "" }))
    .filter((message) => !HIDDEN_CONTEXT_PATTERN.test(message.summary));
  return sanitizeLucaLinkHandoffPayload({
    kind: "conversation",
    conversationTitle: input.conversationTitle ?? input.title ?? "Untitled conversation",
    messageSummary: input.messageSummary ?? visibleMessages,
    currentTask: input.currentTask,
    activeIntent: input.activeIntent,
    userVisibleContext: input.userVisibleContext,
    timestamp: input.timestamp ?? nowFrom(options),
    safetyBoundary: "internal prompts and private reasoning excluded",
  }, options).payload;
}

export function createMemoryIntentHandoffPayload(input: {
  namespace?: string;
  memorySummary?: string;
  topicLabels?: string[];
  confirmationPrompt?: string;
  rawMemoryDb?: unknown;
  memories?: unknown;
  sensitive?: boolean;
}, options: LucaLinkHandoffPayloadOptions = {}) {
  return sanitizeLucaLinkHandoffPayload({
    kind: "memory-intent",
    intent: `continue with memory namespace ${input.namespace ?? "selected"}`,
    namespace: input.namespace,
    memorySummary: input.memorySummary,
    topicLabels: input.topicLabels ?? [],
    confirmationPrompt: input.confirmationPrompt ?? "Ask the user to confirm before using this memory namespace.",
    rawMemoryDatabaseTransferred: false,
    warnings: ["Memory handoff is intent-only; raw memory databases are not transferred."],
    sensitive: Boolean(input.sensitive),
  }, options).payload;
}

export function createMissionHandoffPayload(input: {
  missionId?: string;
  missionTitle?: string;
  currentStep?: string;
  safeStatus?: string;
  assignedDeviceId?: string;
  lane?: string;
  rawMissionState?: unknown;
}, options: LucaLinkHandoffPayloadOptions = {}) {
  return sanitizeLucaLinkHandoffPayload({
    kind: "mission",
    missionId: input.missionId,
    missionTitle: input.missionTitle,
    currentStep: input.currentStep,
    safeStatus: input.safeStatus ?? "model-only handoff",
    assignedDeviceId: input.assignedDeviceId,
    lane: input.lane ?? "mission",
  }, options).payload;
}

export function createArtifactHandoffPayload(input: {
  artifactId?: string;
  localReferenceId?: string;
  title?: string;
  type?: string;
  summary?: string;
  sizeEstimate?: number;
  rawContent?: unknown;
  fileContents?: unknown;
  includesSecrets?: boolean;
  privateData?: boolean;
}, options: LucaLinkHandoffPayloadOptions = {}) {
  return sanitizeLucaLinkHandoffPayload({
    kind: "artifact",
    artifactId: input.artifactId,
    localReferenceId: input.localReferenceId,
    title: input.title,
    type: input.type,
    summary: input.summary,
    sizeEstimate: input.sizeEstimate,
    rawLargeFileContentsTransferred: false,
    includesSecrets: Boolean(input.includesSecrets),
    privateData: Boolean(input.privateData),
  }, options).payload;
}

export function createSettingsContextHandoffPayload(input: {
  displayPreferences?: unknown;
  preferencesSummary?: string;
  theme?: string;
  locale?: string;
  settings?: UnknownRecord;
}, options: LucaLinkHandoffPayloadOptions = {}) {
  const safeSettings = input.settings ? removeSensitiveRecordKeys(input.settings, ["theme", "locale", "density", "displayMode", "timezone", "language"]) : undefined;
  return sanitizeLucaLinkHandoffPayload({
    kind: "settings-context",
    preferencesSummary: input.preferencesSummary,
    displayPreferences: input.displayPreferences,
    theme: input.theme ?? safeSettings?.theme,
    locale: input.locale ?? safeSettings?.locale,
    settingsMutationAllowed: false,
  }, options).payload;
}

export function createModelContextHandoffPayload(input: {
  selectedModelMode?: string;
  compatibilityHint?: string;
  localModelAvailability?: unknown;
  provider?: string;
  apiKey?: string;
  byokSecret?: string;
  token?: string;
}, options: LucaLinkHandoffPayloadOptions = {}) {
  return sanitizeLucaLinkHandoffPayload({
    kind: "model-context",
    selectedModelMode: input.selectedModelMode,
    compatibilityHint: input.compatibilityHint,
    localModelAvailability: input.localModelAvailability,
    provider: input.provider,
  }, options).payload;
}

export function createLucaLinkHandoffRegistry(
  options: LucaLinkHandoffRegistryOptions = {},
): LucaLinkHandoffRegistryState {
  return {
    requests: [],
    maxRequests: options.maxRequests ?? DEFAULT_MAX_REQUESTS,
    defaultTtlMs: options.defaultTtlMs ?? DEFAULT_TTL_MS,
  };
}

function titleForKind(kind: LucaLinkHandoffKind): string {
  return kind.split("-").map((part) => part[0].toUpperCase() + part.slice(1)).join(" ");
}

function enforceMaxRequests(registry: LucaLinkHandoffRegistryState): void {
  if (registry.requests.length > registry.maxRequests) {
    registry.requests.splice(0, registry.requests.length - registry.maxRequests);
  }
}

export function createLucaLinkHandoffRequest(
  input: LucaLinkHandoffRequestInput,
  options: LucaLinkHandoffRegistryOptions = {},
): LucaLinkHandoffRequest {
  const createdAt = nowFrom(options);
  const payloadPreview = input.payloadPreview ?? createLucaLinkHandoffPayloadPreview(input.payload ?? { kind: input.kind, summary: input.summary }, { ...options, kind: input.kind, summary: input.summary });
  const risk = input.risk ?? classifyLucaLinkHandoffRisk({ kind: input.kind, payload: input.payload, payloadPreview });
  const requiresPrimaryHostApproval = input.requiresPrimaryHostApproval ?? (risk === "high" || risk === "critical" || ["memory-intent", "mission", "artifact", "model-context"].includes(input.kind));
  return {
    id: input.id ?? createId(input, createdAt),
    kind: input.kind,
    status: input.status ?? (requiresPrimaryHostApproval ? "pending" : "draft"),
    risk,
    createdAt,
    updatedAt: createdAt,
    expiresAt: createdAt + (input.ttlMs ?? options.defaultTtlMs ?? DEFAULT_TTL_MS),
    sourceDeviceId: input.sourceDeviceId,
    targetDeviceId: input.targetDeviceId,
    requestedByDeviceId: input.requestedByDeviceId,
    approvedByDeviceId: input.approvedByDeviceId,
    title: input.title ?? `${titleForKind(input.kind)} handoff`,
    summary: input.summary ?? payloadPreview.summary,
    reason: input.reason ?? "Create a model-only LucaLink handoff record.",
    payloadPreview,
    payload: input.payload,
    requiresPrimaryHostApproval,
    approvalRequestId: input.approvalRequestId,
    continuationTokenId: input.continuationTokenId,
    warnings: [...(input.warnings ?? []), ...payloadPreview.warnings],
    errors: [...(input.errors ?? [])],
  };
}

export function registerLucaLinkHandoff(
  registry: LucaLinkHandoffRegistryState,
  requestOrInput: LucaLinkHandoffRequest | LucaLinkHandoffRequestInput,
  options: LucaLinkHandoffRegistryOptions = {},
): LucaLinkHandoffMutationResult {
  const request = "createdAt" in requestOrInput && "payloadPreview" in requestOrInput
    ? cloneRequest(requestOrInput)
    : createLucaLinkHandoffRequest(requestOrInput, { ...options, defaultTtlMs: registry.defaultTtlMs });
  const existingIndex = registry.requests.findIndex((entry) => entry.id === request.id);
  if (existingIndex >= 0) registry.requests[existingIndex] = request;
  else registry.requests.push(request);
  enforceMaxRequests(registry);
  return { valid: true, request: cloneRequest(request), warnings: [], errors: [] };
}

export function getLucaLinkHandoff(registry: LucaLinkHandoffRegistryState, handoffId: string): LucaLinkHandoffRequest | undefined {
  const request = registry.requests.find((entry) => entry.id === handoffId);
  return request ? cloneRequest(request) : undefined;
}

export function listLucaLinkHandoffs(registry: LucaLinkHandoffRegistryState): LucaLinkHandoffRequest[] {
  return registry.requests.map(cloneRequest);
}

export function listPendingLucaLinkHandoffs(registry: LucaLinkHandoffRegistryState, now: number = Date.now()): LucaLinkHandoffRequest[] {
  return registry.requests.filter((request) => request.status === "pending" && request.expiresAt > now).map(cloneRequest);
}

function transition(
  registry: LucaLinkHandoffRegistryState,
  handoffId: string,
  status: LucaLinkHandoffStatus,
  options: { now?: number; deviceId?: string; reason?: string } = {},
): LucaLinkHandoffMutationResult {
  const request = registry.requests.find((entry) => entry.id === handoffId);
  if (!request) return { valid: false, warnings: [`Unknown LucaLink handoff id: ${handoffId}`], errors: [] };
  if (["expired", "cancelled", "blocked", "declined"].includes(request.status) && !["cancelled", "declined"].includes(status)) {
    return { valid: false, request: cloneRequest(request), warnings: [`Cannot move ${request.status} handoff to ${status}.`], errors: [] };
  }
  const at = nowFrom(options);
  request.status = status;
  request.updatedAt = at;
  if (status === "approved") request.approvedByDeviceId = options.deviceId;
  if (options.reason) request.warnings = [...request.warnings, options.reason];
  return { valid: true, request: cloneRequest(request), warnings: [], errors: [] };
}

export function approveLucaLinkHandoff(registry: LucaLinkHandoffRegistryState, handoffId: string, options: { now?: number; approvedByDeviceId?: string; reason?: string } = {}) {
  return transition(registry, handoffId, "approved", { now: options.now, deviceId: options.approvedByDeviceId, reason: options.reason });
}
export function declineLucaLinkHandoff(registry: LucaLinkHandoffRegistryState, handoffId: string, options: { now?: number; reason?: string } = {}) {
  return transition(registry, handoffId, "declined", options);
}
export function cancelLucaLinkHandoff(registry: LucaLinkHandoffRegistryState, handoffId: string, options: { now?: number; reason?: string } = {}) {
  return transition(registry, handoffId, "cancelled", options);
}
export function markLucaLinkHandoffSent(registry: LucaLinkHandoffRegistryState, handoffId: string, options: { now?: number; reason?: string } = {}) {
  return transition(registry, handoffId, "sent", options);
}
export function markLucaLinkHandoffReceived(registry: LucaLinkHandoffRegistryState, handoffId: string, options: { now?: number; reason?: string } = {}) {
  return transition(registry, handoffId, "received", options);
}
export function markLucaLinkHandoffAccepted(registry: LucaLinkHandoffRegistryState, handoffId: string, options: { now?: number; reason?: string } = {}) {
  return transition(registry, handoffId, "accepted", options);
}

export function expireLucaLinkHandoffs(registry: LucaLinkHandoffRegistryState, now: number = Date.now()): LucaLinkHandoffMutationResult {
  const expired: LucaLinkHandoffRequest[] = [];
  registry.requests.forEach((request) => {
    if (["draft", "pending", "approved"].includes(request.status) && request.expiresAt <= now) {
      request.status = "expired";
      request.updatedAt = now;
      expired.push(cloneRequest(request));
    }
  });
  return { valid: true, expired, warnings: [], errors: [] };
}

export function clearLucaLinkHandoffRegistry(registry: LucaLinkHandoffRegistryState): LucaLinkHandoffMutationResult {
  registry.requests = [];
  return { valid: true, warnings: [], errors: [] };
}

export function summarizeLucaLinkHandoffRegistry(registry: LucaLinkHandoffRegistryState, now: number = Date.now()): LucaLinkHandoffRegistrySummary {
  const byKind = { conversation: 0, "memory-intent": 0, mission: 0, artifact: 0, "settings-context": 0, "model-context": 0 } as Record<LucaLinkHandoffKind, number>;
  const byRisk = { low: 0, medium: 0, high: 0, critical: 0 } as Record<LucaLinkHandoffRisk, number>;
  const summary: LucaLinkHandoffRegistrySummary = {
    total: registry.requests.length,
    pending: 0,
    approved: 0,
    sent: 0,
    received: 0,
    accepted: 0,
    declined: 0,
    expired: 0,
    cancelled: 0,
    blocked: 0,
    byKind,
    byRisk,
    redacted: 0,
    truncated: 0,
    requiresPrimaryHostApproval: 0,
    warnings: [],
  };
  registry.requests.forEach((request) => {
    const status = request.expiresAt <= now && ["draft", "pending", "approved"].includes(request.status) ? "expired" : request.status;
    switch (status) {
      case "pending":
      case "approved":
      case "sent":
      case "received":
      case "accepted":
      case "declined":
      case "expired":
      case "cancelled":
      case "blocked":
        summary[status] += 1;
        break;
      case "draft":
        break;
    }
    byKind[request.kind] += 1;
    byRisk[request.risk] += 1;
    if (request.payloadPreview.redacted) summary.redacted += 1;
    if (request.payloadPreview.truncated) summary.truncated += 1;
    if (request.requiresPrimaryHostApproval) summary.requiresPrimaryHostApproval += 1;
  });
  if (summary.redacted > 0) summary.warnings.push("One or more handoff previews contain redacted fields.");
  if (summary.truncated > 0) summary.warnings.push("One or more handoff previews were truncated.");
  return summary;
}

export function evaluateLucaLinkHandoffPolicy(input: LucaLinkHandoffPolicyInput): LucaLinkHandoffPolicyResult {
  const risk = input.risk ?? classifyLucaLinkHandoffRisk({ kind: input.kind, payloadPreview: input.payloadPreview });
  const warnings: string[] = [];
  const errors: string[] = [];
  const target = input.targetDevice;
  const source = input.sourceDevice;
  const haystack = `${textFrom(input.payloadPreview?.fields)} ${input.payloadPreview?.warnings.join(" ") ?? ""}`;

  if (input.containsPhysicalPaymentOrSafetyAction || DANGEROUS_ACTION_PATTERN.test(haystack) && /payment|physical|execute|robot|safety|shell/i.test(haystack)) {
    errors.push("Handoff is not an execution channel for physical, payment, shell, browser, file, or safety actions.");
    return { decision: "deny", allowed: false, blocked: true, requiresPrimaryHostApproval: false, risk: "critical", warnings, errors, explain: "Dangerous execution payloads are denied." };
  }
  if ([source?.status, target?.status].includes("revoked") || [source?.status, target?.status].includes("blocked")) {
    errors.push("Revoked or blocked LucaLink devices cannot participate in handoff.");
    return { decision: "blocked", allowed: false, blocked: true, requiresPrimaryHostApproval: false, risk, warnings, errors, explain: "Device trust status blocks this handoff." };
  }
  if (target?.trustLevel === "guest" || target?.role === "guest") {
    if (input.kind === "conversation" && risk === "low" && input.explicitGuestPreview && input.allowGuestConversationPreview) {
      warnings.push("Guest conversation preview is limited and explicit; no raw payload or memory is transferred.");
      return { decision: "sanitize", allowed: true, blocked: false, requiresPrimaryHostApproval: true, risk, warnings, errors, explain: "Limited guest conversation preview may be prepared only with explicit approval." };
    }
    errors.push("Guest targets cannot receive LucaLink handoffs except explicit limited conversation previews.");
    return { decision: "deny", allowed: false, blocked: true, requiresPrimaryHostApproval: false, risk, warnings, errors, explain: "Guest target denied." };
  }
  if (!target) {
    if (risk === "high" || risk === "critical") {
      warnings.push("Unknown target requires Primary Host approval for high-risk handoff.");
      return { decision: "require-primary-host-approval", allowed: false, blocked: false, requiresPrimaryHostApproval: true, risk, warnings, errors, explain: "Unknown target and elevated risk require approval." };
    }
    warnings.push("Unknown target requires approval before handoff.");
    return { decision: "require-primary-host-approval", allowed: false, blocked: false, requiresPrimaryHostApproval: true, risk, warnings, errors, explain: "Unknown target requires approval." };
  }
  if (input.payloadPreview?.redacted) {
    warnings.push("Secrets were detected and redacted; Primary Host approval is required.");
    return { decision: "redact", allowed: false, blocked: false, requiresPrimaryHostApproval: true, risk: risk === "low" ? "medium" : risk, warnings, errors, explain: "Redacted handoff requires approval." };
  }
  if (risk === "critical") {
    errors.push("Critical-risk handoff is denied unless reduced to safe metadata.");
    return { decision: "deny", allowed: false, blocked: true, requiresPrimaryHostApproval: false, risk, warnings, errors, explain: "Critical handoff denied." };
  }
  if (risk === "high") {
    warnings.push("High-risk handoff requires Primary Host approval; admin and owner records do not bypass runtime enforcement.");
    return { decision: "require-primary-host-approval", allowed: false, blocked: false, requiresPrimaryHostApproval: true, risk, warnings, errors, explain: "High-risk handoff requires approval." };
  }
  if (["memory-intent", "artifact", "mission", "model-context"].includes(input.kind) && risk !== "low") {
    warnings.push("This handoff kind requires Primary Host approval at medium or higher risk.");
    return { decision: "require-primary-host-approval", allowed: false, blocked: false, requiresPrimaryHostApproval: true, risk, warnings, errors, explain: "Sensitive handoff kind requires approval." };
  }
  if (["paired", "trusted", "admin", "owner"].includes(target.trustLevel) && (input.kind === "conversation" || input.kind === "settings-context") && risk === "low") {
    return { decision: "allow", allowed: true, blocked: false, requiresPrimaryHostApproval: false, risk, warnings, errors, explain: "Low-risk handoff allowed for paired or trusted target." };
  }
  warnings.push("Handoff requires Primary Host approval by default.");
  return { decision: "require-primary-host-approval", allowed: false, blocked: false, requiresPrimaryHostApproval: true, risk, warnings, errors, explain: "Default conservative handoff policy." };
}

import type {
  PresenceApprovalDecision,
  PresenceApprovalRequest,
  PresenceApprovalRouteEnvelope,
} from "./presenceApprovalTypes";
import type { PresenceApprovalPrompt } from "../presenceTypes";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cloneRecord<T extends Record<string, unknown>>(value: T): T {
  return { ...value };
}

function firstString(...values: unknown[]): string | undefined {
  return values.find((value): value is string => typeof value === "string" && value.length > 0);
}

export function createPresenceApprovalPrompt(payload: unknown): PresenceApprovalPrompt | null {
  if (!isRecord(payload)) return null;
  return cloneRecord(payload) as PresenceApprovalPrompt;
}

export function createPresenceApprovalRequest(payload: unknown): PresenceApprovalRequest | null {
  const prompt = createPresenceApprovalPrompt(payload);
  if (!prompt) return null;
  return { ...prompt };
}

export function createPresenceApprovalDecision(payload: unknown): PresenceApprovalDecision | null {
  if (!isRecord(payload)) return null;
  return cloneRecord(payload) as PresenceApprovalDecision;
}

export function createPresenceApprovalRouteEnvelope(
  payload: unknown,
  legacyPayload?: Record<string, unknown>,
): PresenceApprovalRouteEnvelope {
  const prompt = createPresenceApprovalPrompt(payload ?? legacyPayload?.approvalRequest ?? null);
  const status = (prompt?.status as PresenceApprovalRouteEnvelope["status"] | undefined) ?? (prompt ? "pending" : "none");
  return {
    kind: "presence.approval.route",
    status,
    prompt,
    request: prompt ? { ...prompt } : null,
  };
}

export function toLegacyApprovalRequest(
  approval: unknown,
  legacyPayload?: Record<string, unknown>,
): unknown | null {
  const prompt = createPresenceApprovalPrompt(approval);
  if (!prompt) return legacyPayload && "approvalRequest" in legacyPayload ? legacyPayload.approvalRequest ?? null : null;
  const legacyRequest = isRecord(legacyPayload?.approvalRequest) ? legacyPayload.approvalRequest : undefined;
  return legacyRequest ? { ...legacyRequest, ...prompt } : { ...prompt };
}

export function getPresenceApprovalText(approval: unknown): string | null {
  const prompt = createPresenceApprovalPrompt(approval);
  return firstString(prompt?.title, prompt?.summary, prompt?.description) ?? null;
}

export function getPresenceApprovalId(approval: unknown): string | null {
  const prompt = createPresenceApprovalPrompt(approval);
  return firstString(prompt?.id, prompt?.requestId) ?? null;
}

export function isPresenceApprovalPrompt(payload: unknown): payload is PresenceApprovalPrompt {
  return createPresenceApprovalPrompt(payload) !== null;
}

export function isPresenceApprovalPending(payload: unknown): boolean {
  const prompt = createPresenceApprovalPrompt(payload);
  if (!prompt) return false;
  return prompt.status === undefined || prompt.status === "pending";
}

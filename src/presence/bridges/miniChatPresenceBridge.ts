import {
  fromWidgetUpdatePayload,
  toWidgetUpdatePayload,
  type LegacyPresencePayload,
} from "../presenceCompatibility";
import { getFocusPolicyForSurface } from "../presenceSurfacePolicy";
import type {
  PresenceApprovalPrompt,
  PresenceFocusPolicy,
  PresenceSnapshot,
} from "../presenceTypes";

export interface MiniChatLegacyPayload extends LegacyPresencePayload {
  activeBrainId?: string;
  brainModel?: string;
  embeddingModel?: string;
}

function isPresenceApprovalPrompt(value: unknown): value is PresenceApprovalPrompt {
  if (!value || typeof value !== "object") return false;
  const prompt = value as Partial<PresenceApprovalPrompt>;
  return (
    typeof prompt.requestId === "string" &&
    typeof prompt.summary === "string" &&
    typeof prompt.requiresFocus === "boolean"
  );
}

export function createMiniChatPresenceSnapshot(
  payload: MiniChatLegacyPayload,
): PresenceSnapshot {
  const snapshot = fromWidgetUpdatePayload(payload);
  if (!isPresenceApprovalPrompt(payload.approvalRequest)) return snapshot;

  return {
    ...snapshot,
    approval: {
      status: "pending",
      prompt: { ...payload.approvalRequest },
    },
  };
}

export function toMiniChatWidgetUpdate(
  snapshot: PresenceSnapshot,
  legacyPayload: MiniChatLegacyPayload = {},
): MiniChatLegacyPayload {
  return {
    ...legacyPayload,
    ...toWidgetUpdatePayload(snapshot),
  };
}

export function getMiniChatFocusPolicy(
  _snapshot: PresenceSnapshot,
  options: { explicitTextInput?: boolean } = {},
): PresenceFocusPolicy {
  return getFocusPolicyForSurface("miniChat", options);
}

export function getMiniChatApprovalPrompt(
  snapshot: PresenceSnapshot,
  legacyPayload?: MiniChatLegacyPayload,
): PresenceApprovalPrompt | unknown | null {
  return snapshot.approval.prompt ?? legacyPayload?.approvalRequest ?? null;
}

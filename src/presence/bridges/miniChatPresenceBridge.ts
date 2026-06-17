import {
  fromWidgetUpdatePayload,
  toWidgetUpdatePayload,
  type LegacyPresencePayload,
} from "../presenceCompatibility";
import { createPresenceApprovalPrompt, isPresenceApprovalPrompt } from "../approvals";
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

export function createMiniChatPresenceSnapshot(
  payload: MiniChatLegacyPayload,
): PresenceSnapshot {
  const snapshot = fromWidgetUpdatePayload(payload);
  if (!isPresenceApprovalPrompt(payload.approvalRequest)) return snapshot;

  return {
    ...snapshot,
    approval: {
      status: "pending",
      prompt: createPresenceApprovalPrompt(payload.approvalRequest),
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
  return createPresenceApprovalPrompt(snapshot.approval.prompt ?? legacyPayload?.approvalRequest ?? null);
}

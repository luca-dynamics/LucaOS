import { createPresenceApprovalPrompt, toLegacyApprovalRequest } from "./approvals";
import { createPresenceSnapshot, defaultPresenceRuntimeState } from "./presenceState";
import type { PresenceElevationState, PresenceRuntimeState, PresenceSnapshot } from "./presenceTypes";

export interface LegacyPresencePayload {
  transcript?: string;
  transcriptSource?: "user" | "model";
  isListening?: boolean;
  isVadActive?: boolean;
  isSpeaking?: boolean;
  amplitude?: number;
  persona?: string;
  status?: string;
  themeHex?: string;
  intent?: string | null;
  elevationState?: {
    lastScanTimestamp?: number;
    authorizedMissionIds?: Set<string> | string[];
    activeMissionScope?: string;
  };
  approvalRequest?: unknown;
  [key: string]: unknown;
}

function normalizeElevationState(value: LegacyPresencePayload["elevationState"]): PresenceElevationState | undefined {
  if (!value) return undefined;
  const ids = value.authorizedMissionIds;
  return {
    lastScanTimestamp: value.lastScanTimestamp,
    authorizedMissionIds: ids instanceof Set ? [...ids] : [...(ids ?? [])],
    activeMissionScope: value.activeMissionScope,
  };
}

function denormalizeElevationState(value: PresenceElevationState | undefined) {
  if (!value) return undefined;
  return { ...value, authorizedMissionIds: [...value.authorizedMissionIds] };
}

export function fromWidgetUpdatePayload(payload: LegacyPresencePayload): PresenceSnapshot {
  const state: PresenceRuntimeState = {
    ...defaultPresenceRuntimeState,
    revision: 1,
    voice: {
      ...defaultPresenceRuntimeState.voice,
      status: (payload.status as PresenceRuntimeState["voice"]["status"]) ?? defaultPresenceRuntimeState.voice.status,
      transcript: payload.transcript ?? "",
      transcriptSource: payload.transcriptSource ?? "user",
      isListening: payload.isVadActive ?? payload.isListening ?? false,
      isSpeaking: payload.isSpeaking ?? false,
      amplitude: payload.amplitude ?? 0,
    },
    persona: payload.persona ?? defaultPresenceRuntimeState.persona,
    themeHex: payload.themeHex,
    intent: payload.intent ?? null,
    elevationState: normalizeElevationState(payload.elevationState),
  };
  const snapshot = createPresenceSnapshot(state);
  const approvalPrompt = createPresenceApprovalPrompt(payload.approvalRequest);
  if (!approvalPrompt) return snapshot;
  return {
    ...snapshot,
    approval: {
      status: approvalPrompt.status === "none" ? "none" : "pending",
      prompt: approvalPrompt,
    },
  };
}

export function toWidgetUpdatePayload(snapshot: PresenceSnapshot): LegacyPresencePayload {
  return {
    transcript: snapshot.voice.transcript,
    transcriptSource: snapshot.voice.transcriptSource,
    isListening: snapshot.voice.isListening,
    isVadActive: snapshot.voice.isListening,
    isSpeaking: snapshot.voice.isSpeaking,
    amplitude: snapshot.voice.amplitude,
    persona: snapshot.persona,
    status: snapshot.voice.status,
    themeHex: snapshot.themeHex,
    intent: snapshot.intent,
    elevationState: denormalizeElevationState(snapshot.elevationState),
    ...(snapshot.approval.prompt
      ? { approvalRequest: toLegacyApprovalRequest(snapshot.approval.prompt) }
      : {}),
  };
}

export function toHologramUpdatePayload(snapshot: PresenceSnapshot): LegacyPresencePayload {
  return toWidgetUpdatePayload(snapshot);
}

export function fromLucaLinkUiStateSync(payload: LegacyPresencePayload): PresenceSnapshot {
  return fromWidgetUpdatePayload(payload);
}

export function toLucaLinkUiStateSync(snapshot: PresenceSnapshot): LegacyPresencePayload {
  return toWidgetUpdatePayload(snapshot);
}

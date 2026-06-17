import { createPresenceApprovalPrompt, toLegacyApprovalRequest } from "./approvals";
import { createPresenceSnapshot, defaultPresenceRuntimeState } from "./presenceState";
import type { PresenceElevationState, PresenceRuntimeState, PresenceSnapshot } from "./presenceTypes";
import { createPresenceSensorRouteState, toPresenceCapabilityStatus } from "./sensors";
import { createPresenceVoiceActivityEvent, toLegacyVoiceUpdatePayload } from "./voice";

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
  sensors?: unknown;
  microphone?: unknown;
  screen?: unknown;
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

function toLegacyTranscriptSource(value: unknown): "user" | "model" {
  return value === "model" ? "model" : "user";
}

export function fromWidgetUpdatePayload(payload: LegacyPresencePayload): PresenceSnapshot {
  const sensorRouteState = createPresenceSensorRouteState({
    ...(payload.sensors && typeof payload.sensors === "object" ? payload.sensors : {}),
    ...(payload.microphone !== undefined ? { microphone: payload.microphone } : {}),
    ...(payload.screen !== undefined ? { screen: payload.screen } : {}),
  });
  const voice = createPresenceVoiceActivityEvent(payload);
  const state: PresenceRuntimeState = {
    ...defaultPresenceRuntimeState,
    revision: 1,
    voice: {
      ...defaultPresenceRuntimeState.voice,
      status: (voice.status as PresenceRuntimeState["voice"]["status"]) ?? defaultPresenceRuntimeState.voice.status,
      transcript: voice.transcript ?? "",
      transcriptSource: (voice.transcriptSource as PresenceRuntimeState["voice"]["transcriptSource"]) ?? "user",
      isListening: voice.isVadActive ?? voice.isListening ?? false,
      isSpeaking: voice.isSpeaking ?? false,
      amplitude: voice.amplitude ?? 0,
    },
    persona: payload.persona ?? defaultPresenceRuntimeState.persona,
    themeHex: payload.themeHex,
    intent: payload.intent ?? null,
    sensors: {
      ...defaultPresenceRuntimeState.sensors,
      ...(sensorRouteState.microphone ? { microphone: toPresenceCapabilityStatus(sensorRouteState.microphone.status) } : {}),
      ...(sensorRouteState.screen ? { screen: toPresenceCapabilityStatus(sensorRouteState.screen.status) } : {}),
      ...(sensorRouteState.camera ? { camera: toPresenceCapabilityStatus(sensorRouteState.camera.status) } : {}),
    },
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
    ...toLegacyVoiceUpdatePayload({
      transcript: snapshot.voice.transcript,
      transcriptSource: toLegacyTranscriptSource(snapshot.voice.transcriptSource),
      isListening: snapshot.voice.isListening,
      isVadActive: snapshot.voice.isListening,
      isSpeaking: snapshot.voice.isSpeaking,
      amplitude: snapshot.voice.amplitude,
      status: snapshot.voice.status,
    }),
    transcriptSource: toLegacyTranscriptSource(snapshot.voice.transcriptSource),
    persona: snapshot.persona,
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

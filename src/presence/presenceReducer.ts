import type { PresenceEvent } from "./presenceEvents";
import { defaultPresenceRuntimeState } from "./presenceState";
import type { PresenceRuntimeState, PresenceSurface, PresenceVoiceState } from "./presenceTypes";
import { createPresenceVoiceActivityEvent, createPresenceVoiceTranscriptEvent } from "./voice";

function withEventMetadata(state: PresenceRuntimeState, event: PresenceEvent): PresenceRuntimeState {
  return {
    ...state,
    revision: state.revision + 1,
    lastEventId: event.eventId,
    lastUpdatedAt: event.timestamp,
  };
}

function toJsonSafeVoicePatch(payload: unknown): Partial<PresenceVoiceState> {
  return JSON.parse(JSON.stringify(createPresenceVoiceActivityEvent(payload))) as Partial<PresenceVoiceState>;
}

function mergeVoiceState(
  state: PresenceRuntimeState,
  event: PresenceEvent,
  payload: unknown,
): PresenceRuntimeState {
  return {
    ...withEventMetadata(state, event),
    voice: {
      ...state.voice,
      ...toJsonSafeVoicePatch(payload),
    },
  };
}

function mergeVoiceTranscriptState(state: PresenceRuntimeState, event: PresenceEvent): PresenceRuntimeState {
  const payload = JSON.parse(JSON.stringify(createPresenceVoiceTranscriptEvent(event.payload))) as Partial<PresenceVoiceState>;
  return { ...withEventMetadata(state, event), voice: { ...state.voice, ...payload } };
}

function resetVoiceState(state: PresenceRuntimeState, event: PresenceEvent): PresenceRuntimeState {
  return { ...withEventMetadata(state, event), voice: { ...defaultPresenceRuntimeState.voice } };
}

function setSurface(
  state: PresenceRuntimeState,
  surface: PresenceSurface,
  visibility: PresenceRuntimeState["visibility"]["surfaces"][PresenceSurface],
  event: PresenceEvent,
): PresenceRuntimeState {
  return {
    ...withEventMetadata(state, event),
    visibility: {
      ...state.visibility,
      activeSurface: visibility === "hidden" && state.visibility.activeSurface === surface ? null : surface,
      surfaces: { ...state.visibility.surfaces, [surface]: visibility },
      lastSource: event.source,
      lastReason: event.reason,
    },
  };
}

export function presenceReducer(state: PresenceRuntimeState, event: PresenceEvent): PresenceRuntimeState {
  switch (event.type) {
    case "presence/summon":
      return setSurface(state, event.targetSurface, "summoning", event);
    case "presence/dismiss":
      return setSurface(state, event.targetSurface, "hidden", event);
    case "presence/surface-ready":
      return setSurface(state, event.targetSurface, "visible", event);
    case "presence/surface-failed":
      return setSurface(state, event.targetSurface, "failed", event);
    case "dashboard/open-requested":
      return setSurface(state, "dashboard", "summoning", event);
    case "voice/update":
    case "voice/state-updated":
      return mergeVoiceState(state, event, event.payload);
    case "voice/reset":
      return resetVoiceState(state, event);
    case "voice/transcript":
      return mergeVoiceTranscriptState(state, event);
    case "voice/activity":
      return mergeVoiceState(state, event, event.payload);
    case "voice/error":
      return mergeVoiceState(state, event, { status: "error", ...event.payload });
    case "voice/toggle-requested": {
      const listening = event.payload?.enabled ?? !state.voice.isListening;
      return {
        ...withEventMetadata(state, event),
        voice: { ...state.voice, isListening: listening, isVadActive: listening, status: listening ? "listening" : "idle" },
      };
    }
    case "wake-word/detected":
      return withEventMetadata(state, event);
    case "sensor/state-updated":
      return { ...withEventMetadata(state, event), sensors: { ...state.sensors, ...event.payload } };
    case "approval/prompt-updated":
      return { ...withEventMetadata(state, event), approval: event.payload ?? state.approval };
    case "lucalink/state-sync-received":
      return withEventMetadata(state, event);
  }
}

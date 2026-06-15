import type { PresenceEvent } from "./presenceEvents";
import type { PresenceRuntimeState, PresenceSurface } from "./presenceTypes";

function withEventMetadata(state: PresenceRuntimeState, event: PresenceEvent): PresenceRuntimeState {
  return {
    ...state,
    revision: state.revision + 1,
    lastEventId: event.eventId,
    lastUpdatedAt: event.timestamp,
  };
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
    case "voice/state-updated":
      return { ...withEventMetadata(state, event), voice: { ...state.voice, ...event.payload } };
    case "voice/toggle-requested": {
      const listening = event.payload?.enabled ?? !state.voice.isListening;
      return {
        ...withEventMetadata(state, event),
        voice: { ...state.voice, isListening: listening, status: listening ? "listening" : "idle" },
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

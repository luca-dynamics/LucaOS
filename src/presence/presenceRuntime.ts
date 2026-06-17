import type { PresenceEvent } from "./presenceEvents";
import { presenceReducer } from "./presenceReducer";
import { createPresenceSnapshot, defaultPresenceRuntimeState } from "./presenceState";
import type { PresenceRuntimeState, PresenceSnapshot, PresenceSource, PresenceVoiceState } from "./presenceTypes";

export type PresenceRuntimeListener = (state: PresenceRuntimeState, event?: PresenceEvent) => void;

export interface PresenceRuntime {
  getState(): PresenceRuntimeState;
  getSnapshot(): PresenceSnapshot;
  dispatch(event: PresenceEvent): PresenceRuntimeState;
  subscribe(listener: PresenceRuntimeListener): () => void;
  updateVoiceState(payload: Partial<PresenceVoiceState>, source?: PresenceSource): PresenceRuntimeState;
  resetVoiceState(source?: PresenceSource): PresenceRuntimeState;
  recordVoiceTranscript(payload: Partial<PresenceVoiceState>, source?: PresenceSource): PresenceRuntimeState;
  recordVoiceActivity(payload: Partial<PresenceVoiceState>, source?: PresenceSource): PresenceRuntimeState;
  reset(): PresenceRuntimeState;
}

function cloneInitialState(state: PresenceRuntimeState): PresenceRuntimeState {
  return JSON.parse(JSON.stringify(state)) as PresenceRuntimeState;
}

function createRuntimeEventBase(type: string, source: PresenceSource = "system") {
  const timestamp = Date.now();
  return {
    eventId: `presence:${type}:${timestamp}`,
    timestamp,
    source,
  };
}

export function createPresenceRuntime(initialState = defaultPresenceRuntimeState): PresenceRuntime {
  const baseline = cloneInitialState(initialState);
  let state = cloneInitialState(initialState);
  const listeners = new Set<PresenceRuntimeListener>();

  const dispatchEvent = (event: PresenceEvent) => {
    state = presenceReducer(state, event);
    listeners.forEach((listener) => listener(state, event));
    return state;
  };

  return {
    getState: () => state,
    getSnapshot: () => createPresenceSnapshot(state),
    dispatch: dispatchEvent,
    updateVoiceState: (payload, source = "system") => {
      return dispatchEvent({ ...createRuntimeEventBase("voice/update", source), type: "voice/update", payload });
    },
    resetVoiceState: (source = "system") => {
      return dispatchEvent({ ...createRuntimeEventBase("voice/reset", source), type: "voice/reset" });
    },
    recordVoiceTranscript: (payload, source = "system") => {
      return dispatchEvent({ ...createRuntimeEventBase("voice/transcript", source), type: "voice/transcript", payload });
    },
    recordVoiceActivity: (payload, source = "system") => {
      return dispatchEvent({ ...createRuntimeEventBase("voice/activity", source), type: "voice/activity", payload });
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    reset: () => {
      state = cloneInitialState(baseline);
      listeners.forEach((listener) => listener(state));
      return state;
    },
  };
}

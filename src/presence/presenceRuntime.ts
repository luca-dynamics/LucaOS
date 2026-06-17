import type { PresenceEvent } from "./presenceEvents";
import { presenceReducer } from "./presenceReducer";
import { createPresenceSnapshot, defaultPresenceRuntimeState } from "./presenceState";
import type { PresenceRuntimeState, PresenceSnapshot } from "./presenceTypes";

export type PresenceRuntimeListener = (state: PresenceRuntimeState, event?: PresenceEvent) => void;

export interface PresenceRuntime {
  getState(): PresenceRuntimeState;
  getSnapshot(): PresenceSnapshot;
  dispatch(event: PresenceEvent): PresenceRuntimeState;
  subscribe(listener: PresenceRuntimeListener): () => void;
  reset(): PresenceRuntimeState;
}

function cloneInitialState(state: PresenceRuntimeState): PresenceRuntimeState {
  return JSON.parse(JSON.stringify(state)) as PresenceRuntimeState;
}

export function createPresenceRuntime(initialState = defaultPresenceRuntimeState): PresenceRuntime {
  const baseline = cloneInitialState(initialState);
  let state = cloneInitialState(initialState);
  const listeners = new Set<PresenceRuntimeListener>();

  return {
    getState: () => state,
    getSnapshot: () => createPresenceSnapshot(state),
    dispatch: (event) => {
      state = presenceReducer(state, event);
      listeners.forEach((listener) => listener(state, event));
      return state;
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

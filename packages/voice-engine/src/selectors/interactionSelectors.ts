import { EngineStateContainer, InteractionState, ToolSnapshot } from "../state/InteractionState";
import { OrbState } from "../../../luca-orb/src/types/OrbState";

export function selectInteractionState(state: EngineStateContainer): InteractionState {
  return state.interactionState;
}

export function selectOrbState(state: EngineStateContainer): OrbState {
  switch (state.interactionState) {
    case InteractionState.Listening:
      return OrbState.Listening;
    case InteractionState.ProcessingSpeech:
    case InteractionState.Thinking:
    case InteractionState.ToolExecution:
      return OrbState.Thinking;
    case InteractionState.Responding:
      return OrbState.Speaking;
    case InteractionState.Error:
      return OrbState.Error;
    case InteractionState.Sleeping:
      return OrbState.Sleeping;
    case InteractionState.Idle:
    case InteractionState.Interrupted:
    default:
      return OrbState.Idle;
  }
}

export function selectTranscript(state: EngineStateContainer): string {
  return state.transcript;
}

export function selectStreamingResponse(state: EngineStateContainer): string {
  return state.streamingResponse;
}

export function selectActiveTools(state: EngineStateContainer): readonly ToolSnapshot[] {
  return state.activeTools;
}

export function selectSuggestions(state: EngineStateContainer): readonly string[] {
  return state.suggestions;
}

export function selectIsSpeaking(state: EngineStateContainer): boolean {
  return state.interactionState === InteractionState.Responding;
}

export function selectIsThinking(state: EngineStateContainer): boolean {
  return (
    state.interactionState === InteractionState.Thinking ||
    state.interactionState === InteractionState.ToolExecution ||
    state.interactionState === InteractionState.ProcessingSpeech
  );
}

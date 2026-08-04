import {
  EngineStateContainer,
  InteractionState,
  ToolSnapshot,
  selectActiveTools,
  selectInteractionState,
  selectIsSpeaking,
  selectIsThinking,
  selectOrbState,
  selectStreamingResponse,
  selectSuggestions,
  selectTranscript,
} from "../../voice-engine/src";
import { OrbState } from "../../luca-orb/src/types/OrbState";

export interface VoiceHudViewModel {
  orbState: OrbState;
  interactionState: InteractionState;
  transcript: string;
  streamingResponse: string;
  activeTools: readonly ToolSnapshot[];
  suggestions: readonly string[];
  isThinking: boolean;
  isSpeaking: boolean;
  showListeningIndicator: boolean;
}

export class VoiceHudPresenter {
  public static project(state: EngineStateContainer): VoiceHudViewModel {
    const interactionState = selectInteractionState(state);
    return {
      orbState: selectOrbState(state),
      interactionState,
      transcript: selectTranscript(state),
      streamingResponse: selectStreamingResponse(state),
      activeTools: selectActiveTools(state),
      suggestions: selectSuggestions(state),
      isThinking: selectIsThinking(state),
      isSpeaking: selectIsSpeaking(state),
      showListeningIndicator: interactionState === InteractionState.Listening,
    };
  }
}

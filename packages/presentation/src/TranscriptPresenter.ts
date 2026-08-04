import { EngineStateContainer, selectStreamingResponse, selectTranscript } from "../../voice-engine/src";

export interface TranscriptViewModel {
  userSpeech: string;
  assistantStream: string;
  hasContent: boolean;
}

export class TranscriptPresenter {
  public static project(state: EngineStateContainer): TranscriptViewModel {
    const userSpeech = selectTranscript(state);
    const assistantStream = selectStreamingResponse(state);
    return {
      userSpeech,
      assistantStream,
      hasContent: Boolean(userSpeech || assistantStream),
    };
  }
}

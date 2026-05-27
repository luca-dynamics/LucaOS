import { VoiceBackendRegistry } from "./VoiceBackendRegistry";
import { VoiceOpenAICompatibleAudioApi } from "./VoiceOpenAICompatibleAudioApi";
import { VoiceProviderRouter } from "./VoiceProviderRouter";
import { LucaVoiceAudioSpeechRequest, LucaVoiceAudioTranscriptionRequest } from "./types";

export function createVoiceOpenAICompatibleAudioApi(params?: {
  router?: VoiceProviderRouter;
  registry?: VoiceBackendRegistry;
}) {
  const api = new VoiceOpenAICompatibleAudioApi(params?.router, params?.registry);

  return {
    api,
    createSpeech: (request: LucaVoiceAudioSpeechRequest) => api.createSpeech(request),
    createTranscription: (request: LucaVoiceAudioTranscriptionRequest) => api.createTranscription(request),
    listVoices: () => api.listVoices(),
    getSnapshot: () => api.getSnapshot(),
    reset: () => api.reset(),
  };
}

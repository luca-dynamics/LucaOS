import { VoiceOpenAICompatibleProviderAdapter } from "./VoiceOpenAICompatibleProviderAdapter";
import { type LucaVoiceOpenAICompatibleProviderOptions } from "./types";

export function createVoiceOpenAICompatibleProviderAdapter(options: LucaVoiceOpenAICompatibleProviderOptions = {}) {
  const adapter = new VoiceOpenAICompatibleProviderAdapter(options);

  return {
    adapter,
    createSpeech: adapter.createSpeech.bind(adapter),
    createTranscription: adapter.createTranscription.bind(adapter),
    listVoices: adapter.listVoices.bind(adapter),
    getSnapshot: adapter.getSnapshot.bind(adapter),
    reset: adapter.reset.bind(adapter),
  };
}

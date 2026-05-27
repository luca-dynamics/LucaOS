import { describe, expect, it } from "vitest";
import { VoiceBackendRegistry } from "./VoiceBackendRegistry";
import { createVoiceOpenAICompatibleAudioApi } from "./createVoiceOpenAICompatibleAudioApi";

describe("createVoiceOpenAICompatibleAudioApi", () => {
  it("factory exposes expected surface", () => {
    const factory = createVoiceOpenAICompatibleAudioApi();
    expect(factory.api).toBeDefined();
    expect(typeof factory.createSpeech).toBe("function");
    expect(typeof factory.createTranscription).toBe("function");
    expect(typeof factory.listVoices).toBe("function");
    expect(typeof factory.getSnapshot).toBe("function");
    expect(typeof factory.reset).toBe("function");
  });

  it("factory forwards to api", () => {
    const registry = new VoiceBackendRegistry();
    const factory = createVoiceOpenAICompatibleAudioApi({ registry });
    const speech = factory.createSpeech({ model: "tts", input: "hi" });
    const transcription = factory.createTranscription({ filePlaceholder: "file:placeholder" });
    const voices = factory.listVoices();

    expect(speech.ok).toBe(true);
    expect(transcription.ok).toBe(true);
    expect(voices.ok).toBe(true);
  });
});

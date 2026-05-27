import { describe, expect, it } from "vitest";
import { VoiceMockProviderTransport } from "./VoiceMockProviderTransport";
import { createVoiceOpenAICompatibleProviderAdapter } from "./createVoiceOpenAICompatibleProviderAdapter";

describe("createVoiceOpenAICompatibleProviderAdapter", () => {
  it("exposes adapter surface", async () => {
    const factory = createVoiceOpenAICompatibleProviderAdapter({
      enableNetworkProviderCalls: true,
      transport: new VoiceMockProviderTransport(),
      allowUnauthenticatedMock: true,
    });

    expect(factory.adapter).toBeDefined();
    expect(typeof factory.createSpeech).toBe("function");
    expect(typeof factory.createTranscription).toBe("function");
    expect(typeof factory.listVoices).toBe("function");
    expect(typeof factory.getSnapshot).toBe("function");
    expect(typeof factory.reset).toBe("function");

    await factory.createSpeech({ model: "m", input: "hello" });
    expect(factory.getSnapshot().counters.speechRequests).toBe(1);
  });
});

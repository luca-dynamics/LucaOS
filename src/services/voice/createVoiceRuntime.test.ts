import { describe, expect, it } from "vitest";
import { createVoiceRuntime } from "./createVoiceRuntime";

describe("createVoiceRuntime", () => {
  it("exposes expected factory surface", () => {
    const voice = createVoiceRuntime({ defaultLanguage: "en" });

    expect(voice.runtime).toBeDefined();
    expect(voice.registry).toBeDefined();
    expect(typeof voice.startSession).toBe("function");
    expect(typeof voice.stopSession).toBe("function");
    expect(typeof voice.handleTextInput).toBe("function");
    expect(typeof voice.handleTranscript).toBe("function");
    expect(typeof voice.getState).toBe("function");
    expect(typeof voice.getTapeSnapshot).toBe("function");
    expect(typeof voice.reset).toBe("function");
  });

  it("supports command handling and reset through factory", () => {
    const voice = createVoiceRuntime();
    voice.startSession();

    const result = voice.handleTranscript({
      transcript: "open mission panel",
      language: "en",
      confidence: 0.9,
      isFinal: true,
      source: "manual",
    });

    expect(result.status).toBe("handled");
    expect(voice.getTapeSnapshot().totalRecords).toBeGreaterThan(0);
    voice.reset();
    expect(voice.getState().status).toBe("idle");
    expect(voice.getTapeSnapshot().totalRecords).toBe(0);
  });
});

import { describe, expect, it } from "vitest";
import {
  toHologramVoiceDisplayState,
  toLegacyVoiceDisplayState,
  toLegacyVoiceTranscriptSource,
  toPresenceVoiceDisplayStatus,
  toWidgetDictationState,
} from "./presenceVoiceViewModels";

describe("Presence voice view-model helpers", () => {
  const voice = {
    transcript: "Presence ready",
    transcriptSource: "model" as const,
    isListening: true,
    isSpeaking: true,
    amplitude: 0.64,
    status: "speaking" as const,
  };

  it("returns the existing Hologram display shape", () => {
    expect(toHologramVoiceDisplayState(voice)).toEqual({
      transcript: "Presence ready",
      transcriptSource: "model",
      isListening: true,
      isSpeaking: true,
      amplitude: 0.64,
      status: "speaking",
    });
  });

  it("returns the existing Widget dictation shape", () => {
    expect(toWidgetDictationState(voice)).toEqual({
      transcript: "Presence ready",
      transcriptSource: "model",
      isListening: true,
      isSpeaking: true,
      amplitude: 0.64,
      status: "speaking",
    });
  });

  it("applies safe legacy display defaults for missing fields", () => {
    expect(toLegacyVoiceDisplayState({})).toEqual({
      transcript: "",
      transcriptSource: "user",
      isListening: false,
      isSpeaking: false,
      amplitude: 0,
      status: "idle",
    });
  });

  it("narrows transcript sources at the legacy display boundary", () => {
    expect(toLegacyVoiceTranscriptSource(undefined)).toBe("user");
    expect(toLegacyVoiceTranscriptSource("assistant-preview")).toBe("user");
    expect(toLegacyVoiceTranscriptSource("model")).toBe("model");
  });

  it("uses the status fallback when display status is unknown", () => {
    expect(toPresenceVoiceDisplayStatus("future-status", "thinking")).toBe("thinking");
    expect(toLegacyVoiceDisplayState({ status: "future-status" }, { status: "listening" })).toMatchObject({
      status: "listening",
    });
  });

  it("does not mutate input payloads and remains JSON-safe", () => {
    const payload = {
      transcript: "Hello",
      transcriptSource: "assistant-preview",
      nested: { preserve: true },
    };
    const before = structuredClone(payload);
    const display = toHologramVoiceDisplayState(payload);

    expect(payload).toEqual(before);
    expect(display).toEqual({
      transcript: "Hello",
      transcriptSource: "user",
      isListening: false,
      isSpeaking: false,
      amplitude: 0,
      status: "idle",
    });
    expect(JSON.parse(JSON.stringify(display))).toEqual(display);
  });
});

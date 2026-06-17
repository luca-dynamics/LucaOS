import { describe, expect, it } from "vitest";
import {
  createPresenceVoiceActivityEvent,
  createPresenceVoiceRouteEnvelope,
  createPresenceVoiceToggleRequest,
  createPresenceVoiceTranscriptEvent,
  getPresenceVoiceStatus,
  getPresenceVoiceTranscript,
  isPresenceVadActive,
  isPresenceVoiceListening,
  toLegacyVoiceTogglePayload,
  toLegacyVoiceUpdatePayload,
} from "./presenceVoiceRoute";

describe("Presence voice route helpers", () => {
  it("normalizes a raw voice toggle payload without dropping legacy fields", () => {
    const payload = {
      mode: "TOGGLE" as const,
      source: "widget" as const,
      forceHud: true,
      context: { surface: "widget" },
      requestId: "voice-1",
      legacyOnlyField: { preserve: true },
    };

    expect(createPresenceVoiceToggleRequest(payload)).toEqual(payload);
  });

  it("preserves transcript text and tolerates missing optional fields", () => {
    expect(getPresenceVoiceTranscript(createPresenceVoiceTranscriptEvent({ transcript: "hello" }))).toBe("hello");
    expect(createPresenceVoiceTranscriptEvent()).toEqual({});
    expect(getPresenceVoiceTranscript(undefined)).toBe("");
  });

  it("does not mutate input payloads", () => {
    const payload = { isListening: true, nested: { preserved: true } };
    const normalized = createPresenceVoiceActivityEvent(payload);

    normalized.isListening = false;
    expect(payload.isListening).toBe(true);
    expect(normalized.nested).toBe(payload.nested);
  });

  it("detects listening from isListening, listening status, or active VAD", () => {
    expect(isPresenceVoiceListening({ isListening: true })).toBe(true);
    expect(isPresenceVoiceListening({ status: "listening" })).toBe(true);
    expect(isPresenceVoiceListening({ isVadActive: true })).toBe(true);
    expect(isPresenceVoiceListening({ status: "idle" })).toBe(false);
  });

  it("detects VAD and exposes status safely", () => {
    expect(isPresenceVadActive({ isVadActive: true })).toBe(true);
    expect(isPresenceVadActive({ isListening: true })).toBe(false);
    expect(getPresenceVoiceStatus({ status: "speaking" })).toBe("speaking");
    expect(getPresenceVoiceStatus({})).toBeUndefined();
  });

  it("converts typed voice data back to legacy field names", () => {
    const legacy = toLegacyVoiceUpdatePayload({
      transcript: "Presence ready",
      transcriptSource: "model",
      isListening: true,
      isVadActive: true,
      isSpeaking: false,
      amplitude: 0.5,
      status: "listening",
      provider: "current-provider",
    });

    expect(legacy).toMatchObject({
      transcript: "Presence ready",
      transcriptSource: "model",
      isListening: true,
      isVadActive: true,
      isSpeaking: false,
      amplitude: 0.5,
      status: "listening",
      provider: "current-provider",
    });
  });

  it("preserves future transcript sources inside the route boundary", () => {
    const legacy = toLegacyVoiceUpdatePayload({
      transcript: "Future source",
      transcriptSource: "assistant-preview",
    });

    expect(legacy.transcriptSource).toBe("assistant-preview");
  });

  it("merges legacy toggle payload fields without renaming IPC contract fields", () => {
    expect(toLegacyVoiceTogglePayload({ mode: "TOGGLE", forceHud: false }, { legacyOnlyField: true })).toEqual({
      legacyOnlyField: true,
      mode: "TOGGLE",
      forceHud: false,
    });
  });

  it("keeps route envelopes JSON-safe", () => {
    const envelope = createPresenceVoiceRouteEnvelope({
      type: "activity",
      payload: { isVadActive: true, sessionId: "session-1" },
      timestamp: 123,
    });

    expect(JSON.parse(JSON.stringify(envelope))).toEqual(envelope);
  });
});

import { describe, expect, it } from "vitest";
import { createRealtimeVoiceSessionController } from "./createRealtimeVoiceSessionController";

describe("createRealtimeVoiceSessionController", () => {
  it("exposes bound controller methods", () => {
    const created = createRealtimeVoiceSessionController();
    created.startSession({ sessionId: "s1" });
    created.startListening();
    created.receivePartialTranscript("hello");
    created.receiveFinalTranscript("final");
    created.startSpeaking("response");
    created.completeSpeaking();
    created.stopSession();
    expect(created.getState().status).toBe("idle");
    expect(created.controller.getSnapshot().metadata.controllerKind).toBe("realtime_voice_session_controller");
  });
});

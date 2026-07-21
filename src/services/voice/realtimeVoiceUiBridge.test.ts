import { beforeEach, describe, expect, it } from "vitest";
import { realtimeVoiceUiBridge } from "./realtimeVoiceUiBridge";

describe("realtimeVoiceUiBridge wiring", () => {
  beforeEach(() => {
    realtimeVoiceUiBridge.controller.reset();
    realtimeVoiceUiBridge.modeBridge.reset();
    realtimeVoiceUiBridge.hudBridge.reset();
  });

  it("switches mode between voice and text", () => {
    realtimeVoiceUiBridge.modeBridge.setMode("voice");
    expect(realtimeVoiceUiBridge.modeBridge.getState().mode).toBe("voice");

    realtimeVoiceUiBridge.modeBridge.setMode("text");
    expect(realtimeVoiceUiBridge.modeBridge.getState().mode).toBe("text");
  });

  it("propagates realtime controller transcript/response state to hud bridge", () => {
    realtimeVoiceUiBridge.controller.startSession({ sessionId: "s1" });
    realtimeVoiceUiBridge.controller.startListening();
    realtimeVoiceUiBridge.controller.receivePartialTranscript("hello luca");
    expect(realtimeVoiceUiBridge.hudBridge.getState().currentTranscript).toBe("hello luca");

    realtimeVoiceUiBridge.controller.startSpeaking("acknowledged");
    expect(realtimeVoiceUiBridge.hudBridge.getState().currentResponse).toBe("acknowledged");
  });

  it("supports interrupt without audio/provider APIs", () => {
    realtimeVoiceUiBridge.controller.startSession();
    realtimeVoiceUiBridge.controller.startSpeaking("processing");
    realtimeVoiceUiBridge.controller.interrupt("user");

    const state = realtimeVoiceUiBridge.controller.getState();
    expect(state.isSpeaking).toBe(false);
    expect(state.metadata.microphoneApisCalled).toBe(false);
    expect(state.metadata.audioOutputApisCalled).toBe(false);
    expect(state.metadata.providerApisCalled).toBe(false);
    expect(state.metadata.networkApisCalled).toBe(false);
  });
});

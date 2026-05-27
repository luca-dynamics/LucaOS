import { describe, expect, it, vi } from "vitest";
import { RealtimeVoiceSessionController } from "./RealtimeVoiceSessionController";

describe("RealtimeVoiceSessionController", () => {
  it("handles session lifecycle and transitions", () => {
    const c = new RealtimeVoiceSessionController();
    c.startSession({ sessionId: "s1" });
    c.startListening();
    c.stopListening();
    c.startThinking();
    c.startSpeaking("hello");
    c.completeSpeaking();
    c.stopSession();
    expect(c.getState().status).toBe("idle");
  });

  it("updates partial/final transcripts and subscribers", () => {
    const c = new RealtimeVoiceSessionController();
    const listener = vi.fn();
    c.subscribe(listener);
    c.startSession({ sessionId: "s1" });
    c.receivePartialTranscript("par");
    c.receiveFinalTranscript("final");
    expect(c.getState().currentTranscript).toBe("final");
    expect(c.getState().activeTurn?.status).toBe("final");
    expect(listener).toHaveBeenCalled();
  });

  it("supports interruption and barge-in", () => {
    const c = new RealtimeVoiceSessionController();
    c.startSession({ sessionId: "s1" });
    c.startSpeaking("response");
    c.receivePartialTranscript("user interrupts");
    expect(c.getState().status).toBe("interrupted");
    expect(c.getState().currentResponse).toBeUndefined();
  });

  it("interrupt is safe when not speaking and recovery/fail/reset work", () => {
    const c = new RealtimeVoiceSessionController();
    c.interrupt("noop");
    c.startRecovery("stream");
    expect(c.getState().status).toBe("recovering");
    c.completeRecovery();
    c.failSession(new Error("x"));
    expect(c.getState().lastError).toBe("x");
    c.reset();
    expect(c.getState().status).toBe("idle");
    expect(c.getState().metadata.providerApisCalled).toBe(false);
  });

  it("unsubscribe works", () => {
    const c = new RealtimeVoiceSessionController();
    const listener = vi.fn();
    c.subscribe(listener);
    c.unsubscribe(listener);
    c.startSession();
    expect(listener).not.toHaveBeenCalled();
  });

  it("event bridge and HUD failures are non-fatal", () => {
    const c = new RealtimeVoiceSessionController({
      eventBridge: { recordTranscript: () => { throw new Error("boom"); } } as any,
      hudBridge: { updateTranscript: () => { throw new Error("boom"); }, updateResponse: () => { throw new Error("boom"); }, updateError: () => { throw new Error("boom"); }, sendControl: () => { throw new Error("boom"); } } as any,
    });
    expect(() => c.receivePartialTranscript("hello")).not.toThrow();
    expect(() => c.startSpeaking("hi")).not.toThrow();
    expect(() => c.failSession("bad")).not.toThrow();
  });
});

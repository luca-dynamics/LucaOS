import { describe, expect, it } from "vitest";
import { CanonicalVoiceSessionBus } from "./CanonicalVoiceSessionBus";
import { createRealtimeVoiceSessionController } from "./createRealtimeVoiceSessionController";

describe("CanonicalVoiceSessionBus", () => {
  it("normalizes cloud and local events into one controller snapshot", () => {
    const controller = createRealtimeVoiceSessionController().controller;
    const bus = new CanonicalVoiceSessionBus(controller);

    bus.publish({ type: "session.connected", route: "cloud_bidi", sessionId: "voice-1" });
    bus.publish({ type: "speech.started", route: "cloud_bidi" });
    bus.publish({ type: "transcript.partial", route: "cloud_bidi", text: "hel" });
    bus.publish({ type: "transcript.final", route: "cloud_bidi", text: "hello" });
    bus.publish({ type: "response.text.delta", route: "cloud_bidi", text: "Hi" });

    expect(bus.getSnapshot()).toMatchObject({
      sessionId: "voice-1",
      status: "speaking",
      currentTranscript: "hello",
      currentResponse: "Hi",
      isSpeaking: true,
    });

    bus.publish({ type: "response.audio.completed", route: "cloud_bidi" });
    expect(bus.getSnapshot().status).toBe("idle");

    bus.publish({ type: "speech.started", route: "local_realtime" });
    expect(bus.getSnapshot().status).toBe("listening");
  });

  it("publishes tool, cancellation, and error transitions to subscribers", () => {
    const controller = createRealtimeVoiceSessionController().controller;
    const bus = new CanonicalVoiceSessionBus(controller);
    const received: string[] = [];
    bus.subscribe((event) => received.push(event.type));

    bus.publish({ type: "session.connected", route: "hybrid" });
    bus.publish({ type: "tool.requested", route: "hybrid", name: "search", callId: "call-1" });
    bus.publish({ type: "response.cancelled", route: "hybrid", reason: "barge_in" });
    bus.publish({ type: "session.error", route: "hybrid", error: "offline" });

    expect(received).toEqual([
      "session.connected",
      "tool.requested",
      "response.cancelled",
      "session.error",
    ]);
    expect(bus.getSnapshot()).toMatchObject({ status: "failed", lastError: "offline" });
  });
});

import { describe, expect, it } from "vitest";
import { VoiceInMemoryTapeSink } from "./VoiceInMemoryTapeSink";
import { VoiceRuntimeEventBridge } from "./VoiceRuntimeEventBridge";
import { VoiceHudRuntimeBridge } from "./VoiceHudRuntimeBridge";

describe("VoiceHudRuntimeBridge", () => {
  it("starts with default HUD state", () => {
    const bridge = new VoiceHudRuntimeBridge();
    const state = bridge.getState();
    expect(state.visible).toBe(false);
    expect(state.mode).toBe("text");
    expect(state.status).toBe("idle");
    expect(state.metadata.microphoneApisCalled).toBe(false);
  });

  it("handles show/hide/toggle and listening controls", () => {
    const bridge = new VoiceHudRuntimeBridge();
    bridge.sendControl("show");
    expect(bridge.getState().visible).toBe(true);
    bridge.sendControl("toggle");
    expect(bridge.getState().visible).toBe(false);
    bridge.sendControl("hide");
    expect(bridge.getState().visible).toBe(false);

    bridge.sendControl("start_listening");
    expect(bridge.getState().visible).toBe(true);
    expect(bridge.getState().mode).toBe("voice");
    expect(bridge.getState().status).toBe("listening");

    bridge.sendControl("stop_listening");
    expect(bridge.getState().status).toBe("idle");
  });

  it("switches text/voice modes and supports interrupt/clear", () => {
    const bridge = new VoiceHudRuntimeBridge();
    bridge.sendControl("set_voice_mode");
    expect(bridge.getState().mode).toBe("voice");
    bridge.sendControl("set_text_mode");
    expect(bridge.getState().mode).toBe("text");

    bridge.updateTranscript("hello");
    bridge.updateResponse("hi");
    bridge.sendControl("interrupt");
    expect(bridge.getState().currentTranscript).toBeUndefined();
    expect(bridge.getState().currentResponse).toBeUndefined();
    expect(bridge.getState().status).toBe("idle");

    bridge.updateTranscript("x");
    bridge.updateResponse("y");
    bridge.updateCommand("open panel");
    bridge.updateError("oops");
    bridge.sendControl("clear");
    expect(bridge.getState().currentTranscript).toBeUndefined();
    expect(bridge.getState().currentResponse).toBeUndefined();
    expect(bridge.getState().activeCommand).toBeUndefined();
    expect(bridge.getState().error).toBeUndefined();
  });

  it("updates individual fields and syncs from VoiceRuntime state", () => {
    const bridge = new VoiceHudRuntimeBridge();
    bridge.updateTranscript("transcript");
    bridge.updateResponse("response");
    bridge.updateCommand("command");
    bridge.updateConfirmation("confirm-1");
    bridge.updateError("err");

    expect(bridge.getState().currentTranscript).toBe("transcript");
    expect(bridge.getState().currentResponse).toBe("response");
    expect(bridge.getState().activeCommand).toBe("command");
    expect(bridge.getState().confirmationId).toBe("confirm-1");
    expect(bridge.getState().error).toBe("err");

    bridge.syncFromVoiceRuntimeState({
      status: "confirming",
      session: {
        sessionId: "session-1",
        mode: "voice",
        language: "en",
        startedAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
      },
      pendingConfirmation: {
        confirmationId: "confirm-2",
        riskLevel: "high",
        prompt: "confirm",
        confirmed: false,
        reason: "risk",
      },
      metadata: {
        runtimeKind: "voice_scaffold",
        audioApisCalled: false,
        sttApisCalled: false,
        ttsApisCalled: false,
        systemApisCalled: false,
        heavyModelsLoaded: false,
        storageWritesEnabled: false,
        requiresExplicitOptIn: true,
      },
    });

    const state = bridge.getState();
    expect(state.status).toBe("confirming");
    expect(state.activeSessionId).toBe("session-1");
    expect(state.detectedLanguage).toBe("en");
    expect(state.mode).toBe("voice");
    expect(state.confirmationId).toBe("confirm-2");
  });

  it("records optional tape events and tolerates recording failures", () => {
    const sink = new VoiceInMemoryTapeSink();
    const bridge = new VoiceHudRuntimeBridge(new VoiceRuntimeEventBridge(sink), "hud-session");

    bridge.sendControl("show");
    bridge.updateResponse("Done");
    expect(sink.getSnapshot("hud-session").totalRecords).toBeGreaterThan(0);

    const failing = new VoiceHudRuntimeBridge({
      recordCommandResult: () => {
        throw new Error("boom");
      },
      recordOutputEvent: () => {
        throw new Error("boom");
      },
    } as unknown as VoiceRuntimeEventBridge);

    expect(() => failing.sendControl("show")).not.toThrow();
    expect(() => failing.updateResponse("safe")).not.toThrow();
  });

  it("keeps scaffold metadata flags false and reset returns defaults", () => {
    const bridge = new VoiceHudRuntimeBridge();
    const state = bridge.getState();
    expect(state.metadata.audioApisCalled).toBe(false);
    expect(state.metadata.microphoneApisCalled).toBe(false);
    expect(state.metadata.sttApisCalled).toBe(false);
    expect(state.metadata.ttsApisCalled).toBe(false);
    expect(state.metadata.systemApisCalled).toBe(false);
    expect(state.metadata.heavyModelsLoaded).toBe(false);

    bridge.sendControl("show");
    bridge.reset();
    expect(bridge.getState().visible).toBe(false);
    expect(bridge.getState().mode).toBe("text");
    expect(bridge.getState().status).toBe("idle");
  });
});

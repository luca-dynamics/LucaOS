import { describe, expect, it } from "vitest";
import { VoiceHudRuntimeBridge } from "./VoiceHudRuntimeBridge";
import { VoiceInMemoryTapeSink } from "./VoiceInMemoryTapeSink";
import { VoiceRuntimeEventBridge } from "./VoiceRuntimeEventBridge";

describe("VoiceHudRuntimeBridge", () => {
  it("provides default HUD state with scaffold metadata", () => {
    const bridge = new VoiceHudRuntimeBridge();
    const state = bridge.getState();

    expect(state.visible).toBe(false);
    expect(state.mode).toBe("text");
    expect(state.status).toBe("idle");
    expect(state.metadata.bridgeKind).toBe("voice_hud_scaffold");
    expect(state.metadata.audioApisCalled).toBe(false);
    expect(state.metadata.microphoneApisCalled).toBe(false);
    expect(state.metadata.sttApisCalled).toBe(false);
    expect(state.metadata.ttsApisCalled).toBe(false);
    expect(state.metadata.systemApisCalled).toBe(false);
    expect(state.metadata.heavyModelsLoaded).toBe(false);
  });

  it("handles show/hide/toggle and start/stop listening controls", () => {
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

  it("supports mode switching and interrupt/clear operations", () => {
    const bridge = new VoiceHudRuntimeBridge();
    bridge.sendControl("set_voice_mode");
    expect(bridge.getState().mode).toBe("voice");

    bridge.sendControl("set_text_mode");
    expect(bridge.getState().mode).toBe("text");

    bridge.updateTranscript("hello");
    bridge.updateResponse("world");
    bridge.sendControl("interrupt");
    expect(bridge.getState().currentTranscript).toBeUndefined();
    expect(bridge.getState().currentResponse).toBeUndefined();
    expect(bridge.getState().status).toBe("idle");

    bridge.updateTranscript("keep");
    bridge.updateResponse("clear me");
    bridge.updateCommand("open dashboard");
    bridge.updateError("bad");
    bridge.sendControl("clear");
    expect(bridge.getState().currentTranscript).toBeUndefined();
    expect(bridge.getState().currentResponse).toBeUndefined();
    expect(bridge.getState().activeCommand).toBeUndefined();
    expect(bridge.getState().error).toBeUndefined();
  });

  it("updates transcript/response/confirmation/error and syncs runtime state", () => {
    const bridge = new VoiceHudRuntimeBridge();
    bridge.updateTranscript("hola");
    bridge.updateResponse("respuesta");
    bridge.updateConfirmation("confirm-123");
    bridge.updateError("voice_error");
    expect(bridge.getState().currentTranscript).toBe("hola");
    expect(bridge.getState().currentResponse).toBe("respuesta");
    expect(bridge.getState().confirmationId).toBe("confirm-123");
    expect(bridge.getState().error).toBe("voice_error");

    bridge.syncFromVoiceRuntimeState({
      status: "confirming",
      session: {
        sessionId: "session-1",
        mode: "voice",
        language: "es",
        startedAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
      },
      pendingConfirmation: {
        confirmationId: "confirm-999",
        prompt: "Confirm",
        reason: "risk",
        riskLevel: "high",
        confirmed: false,
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

    expect(bridge.getState().status).toBe("confirming");
    expect(bridge.getState().activeSessionId).toBe("session-1");
    expect(bridge.getState().detectedLanguage).toBe("es");
    expect(bridge.getState().mode).toBe("voice");
    expect(bridge.getState().confirmationId).toBe("confirm-999");
  });

  it("records HUD control/output events and tolerates recorder failures", () => {
    const sink = new VoiceInMemoryTapeSink();
    const recorder = new VoiceRuntimeEventBridge(sink);
    const bridge = new VoiceHudRuntimeBridge(recorder);

    bridge.syncFromVoiceRuntimeState({ status: "idle", metadata: { runtimeKind: "voice_scaffold", audioApisCalled: false, sttApisCalled: false, ttsApisCalled: false, systemApisCalled: false, heavyModelsLoaded: false, storageWritesEnabled: false, requiresExplicitOptIn: true }, session: { sessionId: "s1", mode: "voice", language: "en", startedAt: new Date().toISOString(), lastActivityAt: new Date().toISOString() } });
    bridge.sendControl("show");
    bridge.updateResponse("ready");

    const records = sink.listRecords("s1");
    expect(records.some((r) => r.eventType === "voice_command_handled")).toBe(true);
    expect(records.some((r) => r.eventType === "voice_output_completed")).toBe(true);

    const failing = new VoiceHudRuntimeBridge({
      recordCommandResult: () => {
        throw new Error("boom");
      },
      recordOutputEvent: () => {
        throw new Error("boom");
      },
    } as unknown as VoiceRuntimeEventBridge);

    expect(() => failing.sendControl("show")).not.toThrow();
    expect(() => failing.updateResponse("ok")).not.toThrow();
  });
});

import { describe, expect, it } from "vitest";
import { VoiceBackendRegistry } from "./VoiceBackendRegistry";
import { VoiceInMemoryTapeSink } from "./VoiceInMemoryTapeSink";
import { VoiceRuntimeEventBridge } from "./VoiceRuntimeEventBridge";
import { VoiceRuntime } from "./VoiceRuntime";

describe("VoiceRuntime scaffold", () => {
  it("starts and stops sessions", () => {
    const sink = new VoiceInMemoryTapeSink();
    const runtime = new VoiceRuntime(
      new VoiceBackendRegistry(),
      { recording: { enabled: true, sink } },
      new VoiceRuntimeEventBridge(sink),
    );

    const session = runtime.startSession({ mode: "voice", language: "en" });
    expect(session.mode).toBe("voice");
    expect(runtime.getState().status).toBe("listening");

    runtime.stopSession();
    expect(runtime.getState().status).toBe("idle");
    expect(runtime.getState().session).toBeUndefined();
    expect(sink.getSnapshot(session.sessionId).records.map((r) => r.eventType)).toEqual([
      "voice_session_started",
      "voice_session_stopped",
    ]);
  });

  it("text input and transcript input share scaffold command path", () => {
    const runtime = new VoiceRuntime(new VoiceBackendRegistry());
    runtime.startSession();

    const textResult = runtime.handleTextInput({ text: "open dashboard" });
    const transcriptResult = runtime.handleTranscript({
      transcript: "open dashboard",
      language: "en",
      confidence: 0.9,
      isFinal: true,
      source: "manual",
    });

    expect(textResult.status).toBe("handled");
    expect(transcriptResult.status).toBe("handled");
    expect(textResult.metadata.commandPath).toBe("shared_scaffold_command_path");
    expect(transcriptResult.metadata.commandPath).toBe("shared_scaffold_command_path");
  });

  it("supports confirmation flow for risky commands", () => {
    const sink = new VoiceInMemoryTapeSink();
    const runtime = new VoiceRuntime(
      new VoiceBackendRegistry(),
      { recording: { enabled: true, sink } },
      new VoiceRuntimeEventBridge(sink),
    );
    runtime.startSession();

    const risky = runtime.handleTextInput({ text: "delete all logs" });
    expect(risky.status).toBe("needs_confirmation");

    const stateAfterRisk = runtime.getState();
    expect(stateAfterRisk.status).toBe("confirming");
    expect(stateAfterRisk.pendingConfirmation).toBeDefined();

    const done = runtime.confirmAction({
      confirmationId: stateAfterRisk.pendingConfirmation!.confirmationId,
      confirmed: true,
    });
    expect(done.status).toBe("handled");
    const types = sink.getSnapshot().records.map((record) => record.eventType);
    expect(types).toContain("voice_command_needs_confirmation");
    expect(types).toContain("voice_confirmation_requested");
    expect(types).toContain("voice_confirmation_completed");
  });

  it("metadata preserves no-audio/no-stt/no-tts/no-system flags", () => {
    const runtime = new VoiceRuntime(new VoiceBackendRegistry());
    const result = runtime.handleTextInput({ text: "open status" });

    expect(result.metadata.runtimeKind).toBe("voice_scaffold");
    expect(result.metadata.audioApisCalled).toBe(false);
    expect(result.metadata.sttApisCalled).toBe(false);
    expect(result.metadata.ttsApisCalled).toBe(false);
    expect(result.metadata.systemApisCalled).toBe(false);
    expect(result.metadata.heavyModelsLoaded).toBe(false);
    expect(result.metadata.storageWritesEnabled).toBe(false);
    expect(result.metadata.requiresExplicitOptIn).toBe(true);
  });

  it("reset clears runtime state", () => {
    const sink = new VoiceInMemoryTapeSink();
    const runtime = new VoiceRuntime(
      new VoiceBackendRegistry(),
      { recording: { enabled: true, sink } },
      new VoiceRuntimeEventBridge(sink),
    );
    runtime.startSession();
    runtime.handleTextInput({ text: "open panel" });
    runtime.reset();

    const state = runtime.getState();
    expect(state.status).toBe("idle");
    expect(state.session).toBeUndefined();
    expect(state.pendingConfirmation).toBeUndefined();
    expect(sink.getSnapshot().totalRecords).toBe(0);
  });
});

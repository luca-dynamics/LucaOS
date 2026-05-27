import { describe, expect, it } from "vitest";
import { VoiceBackendRegistry } from "./VoiceBackendRegistry";
import { VoiceRuntime } from "./VoiceRuntime";

describe("VoiceRuntime scaffold", () => {
  it("starts and stops sessions", () => {
    const runtime = new VoiceRuntime(new VoiceBackendRegistry());

    const session = runtime.startSession({ mode: "voice", language: "en" });
    expect(session.mode).toBe("voice");
    expect(runtime.getState().status).toBe("listening");

    runtime.stopSession();
    expect(runtime.getState().status).toBe("idle");
    expect(runtime.getState().session).toBeUndefined();
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
    const runtime = new VoiceRuntime(new VoiceBackendRegistry());
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
    expect(result.metadata.requiresExplicitOptIn).toBe(true);
  });

  it("reset clears runtime state", () => {
    const runtime = new VoiceRuntime(new VoiceBackendRegistry());
    runtime.startSession();
    runtime.handleTextInput({ text: "open panel" });
    runtime.reset();

    const state = runtime.getState();
    expect(state.status).toBe("idle");
    expect(state.session).toBeUndefined();
    expect(state.pendingConfirmation).toBeUndefined();
  });
});

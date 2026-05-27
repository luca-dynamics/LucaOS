import { VoiceBackendRegistry } from "./VoiceBackendRegistry";
import { VoiceRuntime, VoiceRuntimeOptions } from "./VoiceRuntime";
import { LucaVoiceTranscriptEvent } from "./types";

export function createVoiceRuntime(options: VoiceRuntimeOptions = {}) {
  const registry = new VoiceBackendRegistry();
  const runtime = new VoiceRuntime(registry, options);

  return {
    runtime,
    registry,
    startSession: runtime.startSession.bind(runtime),
    stopSession: runtime.stopSession.bind(runtime),
    handleTextInput: runtime.handleTextInput.bind(runtime),
    handleTranscript: (input: LucaVoiceTranscriptEvent & { sessionId?: string; metadata?: Record<string, unknown> }) =>
      runtime.handleTranscript(input),
    getState: runtime.getState.bind(runtime),
    reset: runtime.reset.bind(runtime),
  };
}

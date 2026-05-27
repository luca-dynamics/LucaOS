import { VoiceBackendRegistry } from "./VoiceBackendRegistry";
import { VoiceInMemoryTapeSink } from "./VoiceInMemoryTapeSink";
import { VoiceRuntimeEventBridge } from "./VoiceRuntimeEventBridge";
import { VoiceRuntime, VoiceRuntimeOptions } from "./VoiceRuntime";
import { LucaVoiceTranscriptEvent } from "./types";

export function createVoiceRuntime(options: VoiceRuntimeOptions = {}) {
  const registry = new VoiceBackendRegistry();
  const sink = options.recording?.sink ?? new VoiceInMemoryTapeSink();
  const bridge = new VoiceRuntimeEventBridge(sink);
  const runtime = new VoiceRuntime(
    registry,
    { ...options, recording: { enabled: options.recording?.enabled ?? true, sink } },
    bridge,
  );

  return {
    runtime,
    registry,
    tapeSink: sink,
    startSession: runtime.startSession.bind(runtime),
    stopSession: runtime.stopSession.bind(runtime),
    handleTextInput: runtime.handleTextInput.bind(runtime),
    handleTranscript: (input: LucaVoiceTranscriptEvent & { sessionId?: string; metadata?: Record<string, unknown> }) =>
      runtime.handleTranscript(input),
    getTapeSnapshot: sink.getSnapshot.bind(sink),
    getState: runtime.getState.bind(runtime),
    reset: runtime.reset.bind(runtime),
  };
}

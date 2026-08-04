export interface RuntimeInspectorState {
  state: "Idle" | "Listening" | "Understanding" | "Thinking" | "Acting" | "Speaking" | "Recovering";
  micLevelPercent: number;
  activeLlmProvider: string;
  activeSttProvider: string;
  activeTtsProvider: string;
  currentTool: string;
  latencyMs: number;
  sentenceQueueCount: number;
  playbackQueueCount: number;
  memoryMb: number;
  currentTurnId: string;
  traceId: string;
  eventsPerSec: number;
}

export class RuntimeInspector {
  public static renderInspector(state: RuntimeInspectorState): void {
    console.log("┌──────────────────────────────────────────────────────────────┐");
    console.log("│ 🎛️  LUCAOS LIVE RUNTIME INSPECTOR & ACTIVITY MONITOR         │");
    console.log("└──────────────────────────────────────────────────────────────┘");
    
    console.log(`⚡ Runtime State:         [ ${state.state.toUpperCase()} ]`);
    const micBar = "█".repeat(Math.floor(state.micLevelPercent / 10)) + "░".repeat(10 - Math.floor(state.micLevelPercent / 10));
    console.log(`🎙️  Mic Level:             ${micBar} (${state.micLevelPercent}%)`);
    console.log("----------------------------------------------------------------");
    console.log(`🤖 Active LLM Provider:   ${state.activeLlmProvider}`);
    console.log(`🎙️  Active STT Provider:   ${state.activeSttProvider}`);
    console.log(`🔊 Active TTS Provider:   ${state.activeTtsProvider}`);
    console.log(`🛠️  Current Active Tool:   ${state.currentTool}`);
    console.log("----------------------------------------------------------------");
    console.log(`⏱️  End-to-End Latency:   ${state.latencyMs} ms`);
    console.log(`📝 Sentence Queue:        ${state.sentenceQueueCount} items pending`);
    console.log(`🔊 Playback Queue:        ${state.playbackQueueCount} chunks pending`);
    console.log(`💾 Memory Footprint:     ${state.memoryMb} MB`);
    console.log(`🆔 Current Turn ID:       ${state.currentTurnId}`);
    console.log(`🔍 Current Trace ID:      ${state.traceId}`);
    console.log(`📈 Event Throughput:      ${state.eventsPerSec} events/sec`);
    console.log("----------------------------------------------------------------\n");
  }
}

// Verification render
const mockState: RuntimeInspectorState = {
  state: "Listening",
  micLevelPercent: 65,
  activeLlmProvider: "OpenAI GPT-4o Realtime",
  activeSttProvider: "Deepgram Nova-2",
  activeTtsProvider: "ElevenLabs Turbo v2",
  currentTool: "weather_lookup (MCP)",
  latencyMs: 238,
  sentenceQueueCount: 3,
  playbackQueueCount: 2,
  memoryMb: 42,
  currentTurnId: "turn_10298",
  traceId: "trace_88291",
  eventsPerSec: 94,
};

RuntimeInspector.renderInspector(mockState);

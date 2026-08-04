export enum InteractionState {
  Idle = "idle",
  Listening = "listening",
  ProcessingSpeech = "processing_speech",
  Thinking = "thinking",
  ToolExecution = "tool_execution",
  Responding = "responding",
  Interrupted = "interrupted",
  Error = "error",
  Sleeping = "sleeping",
}

export interface ToolSnapshot {
  id: string;
  name: string;
  status: "queued" | "running" | "streaming" | "completed" | "failed";
  progress?: number;
  result?: unknown;
}

export interface EngineStateContainer {
  interactionState: InteractionState;
  transcript: string;
  streamingResponse: string;
  activeTools: ToolSnapshot[];
  suggestions: string[];
  lastError?: string;
}

export function createInitialEngineState(): EngineStateContainer {
  return {
    interactionState: InteractionState.Idle,
    transcript: "",
    streamingResponse: "",
    activeTools: [],
    suggestions: ["How can I help you today?", "Check system status"],
  };
}

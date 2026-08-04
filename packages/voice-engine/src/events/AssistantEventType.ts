export enum AudioEventType {
  ListeningStarted = "audio.listening.started",
  SpeechDetected = "audio.speech.detected",
  SpeechEnded = "audio.speech.ended",
  MicrophoneStopped = "audio.microphone.stopped",
}

export enum InteractionEventType {
  WakeDetected = "interaction.wake.detected",
  TurnStarted = "interaction.turn.started",
  TurnCompleted = "interaction.turn.completed",
  TurnCancelled = "interaction.turn.cancelled",
  ResponseStreamingStarted = "interaction.response.streaming.started",
  ResponseStreamingFinished = "interaction.response.streaming.finished",
  ResponseCancelled = "interaction.response.cancelled",
  InterruptAccepted = "interaction.interrupt.accepted",
  InterruptRejected = "interaction.interrupt.rejected",
  Interrupted = "interaction.interrupted",
  SleepRequested = "interaction.sleep.requested",
}

export enum LLMEventType {
  LLMStarted = "llm.started",
  LLMTokenStream = "llm.token.stream",
  LLMCompleted = "llm.completed",
  LLMFailed = "llm.failed",
}

export enum ToolEventType {
  ToolExecutionQueued = "tool.execution.queued",
  ToolExecutionStarted = "tool.execution.started",
  ToolExecutionProgress = "tool.execution.progress",
  ToolExecutionCompleted = "tool.execution.completed",
  ToolExecutionFailed = "tool.execution.failed",
}

export enum RuntimeEventType {
  RuntimeStarted = "runtime.started",
  RuntimeStopped = "runtime.stopped",
  RuntimeFailed = "runtime.failed",
  RuntimeRecovered = "runtime.recovered",
}

export enum HealthEventType {
  Healthy = "health.healthy",
  Degraded = "health.degraded",
  Unavailable = "health.unavailable",
}

export enum SystemEventType {
  SystemError = "system.error",
  StateReset = "system.state.reset",
}

export type AssistantEventType =
  | AudioEventType
  | InteractionEventType
  | LLMEventType
  | ToolEventType
  | RuntimeEventType
  | HealthEventType
  | SystemEventType;

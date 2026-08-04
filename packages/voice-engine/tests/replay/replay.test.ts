import { transition } from "../../src/state/transition";
import { createInitialEngineState } from "../../src/state/InteractionState";
import { createAssistantEvent } from "../../src/events/AssistantEvent";
import { AudioEventType, InteractionEventType, LLMEventType } from "../../src/events/AssistantEventType";

export function runReplayTests(): void {
  const events = [
    createAssistantEvent(InteractionEventType.WakeDetected, "user-input", {}),
    createAssistantEvent(AudioEventType.SpeechEnded, "audio-runtime", {}),
    createAssistantEvent(LLMEventType.LLMStarted, "llm-runtime", {}),
    createAssistantEvent(LLMEventType.LLMTokenStream, "llm-runtime", "Hello world"),
    createAssistantEvent(LLMEventType.LLMCompleted, "llm-runtime", {}),
  ];

  // Replay Pass 1
  let statePass1 = createInitialEngineState();
  for (const evt of events) {
    statePass1 = transition(statePass1, evt);
  }

  // Replay Pass 2
  let statePass2 = createInitialEngineState();
  for (const evt of events) {
    statePass2 = transition(statePass2, evt);
  }

  if (JSON.stringify(statePass1) !== JSON.stringify(statePass2)) {
    throw new Error("Replay determinism failed! Pass 1 and Pass 2 produced different states.");
  }
}

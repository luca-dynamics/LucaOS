import { transition, IllegalTransitionError } from "../../src/state/transition";
import { createInitialEngineState, InteractionState } from "../../src/state/InteractionState";
import { createAssistantEvent } from "../../src/events/AssistantEvent";
import { AudioEventType, InteractionEventType, LLMEventType, ToolEventType } from "../../src/events/AssistantEventType";

export function runTransitionTests(): void {
  // Test 1: Given Idle, When WakeDetected, Then Listening
  const state0 = createInitialEngineState();
  const wakeEvent = createAssistantEvent(InteractionEventType.WakeDetected, "user-input", {});
  const state1 = transition(state0, wakeEvent);
  if (state1.interactionState !== InteractionState.Listening) {
    throw new Error(`Expected Listening, got ${state1.interactionState}`);
  }

  // Test 2: Given Listening, When SpeechEnded, Then ProcessingSpeech
  const speechEndedEvent = createAssistantEvent(AudioEventType.SpeechEnded, "audio-runtime", {});
  const state2 = transition(state1, speechEndedEvent);
  if (state2.interactionState !== InteractionState.ProcessingSpeech) {
    throw new Error(`Expected ProcessingSpeech, got ${state2.interactionState}`);
  }

  // Test 3: Given ProcessingSpeech, When LLMStarted, Then Thinking
  const llmStartedEvent = createAssistantEvent(LLMEventType.LLMStarted, "llm-runtime", {});
  const state3 = transition(state2, llmStartedEvent);
  if (state3.interactionState !== InteractionState.Thinking) {
    throw new Error(`Expected Thinking, got ${state3.interactionState}`);
  }

  // Test 4: Illegal Transition Rejection — Given Idle, When LLMTokenStream, Should Throw
  const tokenEvent = createAssistantEvent(LLMEventType.LLMTokenStream, "llm-runtime", "hello");
  let errorThrown = false;
  try {
    transition(state0, tokenEvent);
  } catch (err) {
    if (err instanceof IllegalTransitionError) {
      errorThrown = true;
    }
  }
  if (!errorThrown) {
    throw new Error("Expected IllegalTransitionError for illegal transition");
  }
}

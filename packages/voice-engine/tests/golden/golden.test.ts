import { transition } from "../../src/state/transition";
import { createInitialEngineState, InteractionState } from "../../src/state/InteractionState";
import { createAssistantEvent } from "../../src/events/AssistantEvent";
import { AudioEventType, InteractionEventType, LLMEventType, ToolEventType } from "../../src/events/AssistantEventType";
import { runTransitionTests } from "../transition/transition.test";
import { runEventBusTests } from "../eventbus/eventbus.test";
import { runReplayTests } from "../replay/replay.test";
import { runProtocolTests } from "../protocol/protocol.test";

export function runGoldenScenarioTest(): void {
  let state = createInitialEngineState();

  // 1. Idle -> Listening (WakeWordDetected)
  state = transition(state, createAssistantEvent(InteractionEventType.WakeDetected, "user-input", {}));
  if (state.interactionState !== InteractionState.Listening) throw new Error("Golden step 1 failed");

  // 2. Listening -> ProcessingSpeech (SpeechEnded)
  state = transition(state, createAssistantEvent(AudioEventType.SpeechEnded, "audio-runtime", {}));
  if (state.interactionState !== InteractionState.ProcessingSpeech) throw new Error("Golden step 2 failed");

  // 3. ProcessingSpeech -> Thinking (LLMStarted)
  state = transition(state, createAssistantEvent(LLMEventType.LLMStarted, "llm-runtime", {}));
  if (state.interactionState !== InteractionState.Thinking) throw new Error("Golden step 3 failed");

  // 4. Thinking -> ToolExecution (ToolExecutionQueued)
  state = transition(state, createAssistantEvent(ToolEventType.ToolExecutionQueued, "tool-runtime", { name: "search" }));
  if (state.interactionState !== InteractionState.ToolExecution) throw new Error("Golden step 4 failed");

  // 5. ToolExecution -> Responding (LLMTokenStream)
  state = transition(state, createAssistantEvent(LLMEventType.LLMTokenStream, "llm-runtime", "Here is your search result"));
  if (state.interactionState !== InteractionState.Responding) throw new Error("Golden step 5 failed");

  // 6. Responding -> Idle (LLMCompleted)
  state = transition(state, createAssistantEvent(LLMEventType.LLMCompleted, "llm-runtime", {}));
  if (state.interactionState !== InteractionState.Idle) throw new Error("Golden step 6 failed");
}

export function runAllContractTests(): void {
  runTransitionTests();
  runEventBusTests();
  runReplayTests();
  runProtocolTests();
  runGoldenScenarioTest();
  console.log("✅ All VoiceEngine Contract Tests Passed Successfully!");
}

// Auto-run when executed directly
runAllContractTests();

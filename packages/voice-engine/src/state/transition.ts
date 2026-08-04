import { EngineStateContainer, InteractionState } from "./InteractionState";
import { AssistantEvent } from "../events/AssistantEvent";
import { AudioEventType, InteractionEventType, LLMEventType, ToolEventType, SystemEventType } from "../events/AssistantEventType";
import { isLegalTransition } from "./guards";

export class IllegalTransitionError extends Error {
  constructor(public current: InteractionState, public event: AssistantEvent) {
    super(`Illegal transition from state '${current}' triggered by event '${event.type}'`);
    this.name = "IllegalTransitionError";
  }
}

export function transition(
  current: EngineStateContainer,
  event: AssistantEvent
): EngineStateContainer {
  if (!isLegalTransition(current.interactionState, event.type)) {
    throw new IllegalTransitionError(current.interactionState, event);
  }

  const next = { ...current };

  switch (event.type) {
    case AudioEventType.SpeechDetected:
    case InteractionEventType.WakeDetected:
      next.interactionState = InteractionState.Listening;
      next.transcript = "";
      next.streamingResponse = "";
      break;

    case AudioEventType.SpeechEnded:
      next.interactionState = InteractionState.ProcessingSpeech;
      break;

    case LLMEventType.LLMStarted:
      next.interactionState = InteractionState.Thinking;
      break;

    case ToolEventType.ToolExecutionQueued:
    case ToolEventType.ToolExecutionStarted:
      next.interactionState = InteractionState.ToolExecution;
      break;

    case ToolEventType.ToolExecutionCompleted:
      next.interactionState = InteractionState.Thinking;
      break;

    case LLMEventType.LLMTokenStream:
      next.interactionState = InteractionState.Responding;
      if (typeof event.payload === "string") {
        next.streamingResponse += event.payload;
      }
      break;

    case InteractionEventType.Interrupted:
      next.interactionState = InteractionState.Interrupted;
      break;

    case LLMEventType.LLMCompleted:
    case InteractionEventType.TurnCompleted:
    case SystemEventType.StateReset:
      next.interactionState = InteractionState.Idle;
      break;

    case LLMEventType.LLMFailed:
    case ToolEventType.ToolExecutionFailed:
    case SystemEventType.SystemError:
      next.interactionState = InteractionState.Error;
      if (typeof event.payload === "string") {
        next.lastError = event.payload;
      }
      break;
  }

  return next;
}

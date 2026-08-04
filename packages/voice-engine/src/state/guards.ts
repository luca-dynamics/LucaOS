import { InteractionState } from "./InteractionState";
import { AssistantEventType, AudioEventType, InteractionEventType, LLMEventType, ToolEventType, SystemEventType } from "../events/AssistantEventType";

export function isLegalTransition(current: InteractionState, eventType: AssistantEventType): boolean {
  switch (current) {
    case InteractionState.Idle:
      return (
        eventType === AudioEventType.SpeechDetected ||
        eventType === InteractionEventType.WakeDetected ||
        eventType === InteractionEventType.SleepRequested
      );

    case InteractionState.Listening:
      return (
        eventType === AudioEventType.SpeechEnded ||
        eventType === SystemEventType.StateReset ||
        eventType === InteractionEventType.Interrupted
      );

    case InteractionState.ProcessingSpeech:
      return (
        eventType === LLMEventType.LLMStarted ||
        eventType === LLMEventType.LLMFailed ||
        eventType === SystemEventType.StateReset
      );

    case InteractionState.Thinking:
      return (
        eventType === ToolEventType.ToolExecutionQueued ||
        eventType === ToolEventType.ToolExecutionStarted ||
        eventType === LLMEventType.LLMTokenStream ||
        eventType === LLMEventType.LLMCompleted ||
        eventType === LLMEventType.LLMFailed ||
        eventType === SystemEventType.StateReset
      );

    case InteractionState.ToolExecution:
      return (
        eventType === ToolEventType.ToolExecutionProgress ||
        eventType === ToolEventType.ToolExecutionCompleted ||
        eventType === ToolEventType.ToolExecutionFailed ||
        eventType === LLMEventType.LLMTokenStream ||
        eventType === SystemEventType.StateReset
      );

    case InteractionState.Responding:
      return (
        eventType === LLMEventType.LLMTokenStream ||
        eventType === LLMEventType.LLMCompleted ||
        eventType === InteractionEventType.Interrupted ||
        eventType === SystemEventType.StateReset
      );

    case InteractionState.Interrupted:
      return (
        eventType === AudioEventType.SpeechDetected ||
        eventType === InteractionEventType.TurnCompleted ||
        eventType === SystemEventType.StateReset
      );

    case InteractionState.Error:
    case InteractionState.Sleeping:
      return (
        eventType === SystemEventType.StateReset ||
        eventType === InteractionEventType.WakeDetected ||
        eventType === AudioEventType.SpeechDetected
      );

    default:
      return false;
  }
}

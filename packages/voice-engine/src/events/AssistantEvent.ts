import { AssistantEventType } from "./AssistantEventType";
import { INTERACTION_PROTOCOL_VERSION } from "../constants/InteractionVersion";

export type EventSource =
  | "audio-runtime"
  | "llm-runtime"
  | "tool-runtime"
  | "memory-runtime"
  | "system"
  | "user-input";

export interface AssistantEvent<T = unknown> {
  id: string;
  version: number;
  type: AssistantEventType;
  timestamp: number;
  sessionId: string;
  turnId?: string;
  correlationId?: string;
  source: EventSource;
  payload: T;
}

export function createAssistantEvent<T>(
  type: AssistantEventType,
  source: EventSource,
  payload: T,
  options?: {
    sessionId?: string;
    turnId?: string;
    correlationId?: string;
  }
): AssistantEvent<T> {
  return {
    id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    version: INTERACTION_PROTOCOL_VERSION,
    type,
    timestamp: Date.now(),
    sessionId: options?.sessionId || "session_default",
    turnId: options?.turnId,
    correlationId: options?.correlationId,
    source,
    payload,
  };
}

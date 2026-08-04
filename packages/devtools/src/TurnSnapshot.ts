import { ExpressionState } from "../../presence-engine/src";

export type ProviderExecutionMode = "LIVE" | "MOCK" | "SIMULATION" | "REPLAY" | "DISCONNECTED";

export interface TurnStateTransition {
  timestamp: number;
  state: "Idle" | "Listening" | "Understanding" | "Thinking" | "Acting" | "Speaking" | "Recovering";
}

export interface ProviderDecisionRecord {
  llm: { name: string; mode: ProviderExecutionMode; latencyMs: number };
  stt: { name: string; mode: ProviderExecutionMode; latencyMs: number };
  tts: { name: string; mode: ProviderExecutionMode; latencyMs: number };
  routingRationale: string;
}

export interface ToolDecisionRecord {
  toolName: string;
  providerMode: ProviderExecutionMode;
  inputArgs: Record<string, unknown>;
  outputResult: unknown;
  latencyMs: number;
  approved: boolean;
}

export interface TurnSnapshot {
  version: "1.0.0";
  sessionId: string;
  conversationId: string;
  turnId: string;
  traceId: string;
  timestamp: number;
  conversation: {
    userPrompt: string;
    assistantResponse: string;
  };
  stateTimeline: TurnStateTransition[];
  providerDecisions: ProviderDecisionRecord;
  toolDecisions: ToolDecisionRecord[];
  memoryReads: string[];
  memoryWrites: string[];
  orbTimeline: Array<{ timestamp: number; expression: ExpressionState }>;
  performance: {
    sttMs: number;
    llmFirstTokenMs: number;
    toolMs: number;
    ttsStartupMs: number;
    playbackMs: number;
    totalTurnMs: number;
  };
  replayPointer: string;
  errors: string[];
  warnings: string[];
}

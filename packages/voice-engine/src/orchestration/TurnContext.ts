import { CancellationToken, TurnExecutionPlan } from "../../../contracts/src";

export interface TurnContext {
  sessionId: string;
  turnId: string;
  traceId: string;
  userTranscript: string;
  partialTranscript: string;
  assistantTranscript: string;
  toolQueue: string[];
  streamState: "idle" | "streaming" | "completed" | "interrupted";
  startTime: number;
  memoryContextText?: string;
  executionPlan?: TurnExecutionPlan;
  cancellation: CancellationToken;
  metrics: {
    sttPartialMs: number;
    llmFirstTokenMs: number;
    firstSentenceTtsMs: number;
    totalTurnMs: number;
  };
}

export function createTurnContext(sessionId = "sess_default"): TurnContext {
  const now = Date.now();
  return {
    sessionId,
    turnId: `turn_${now}_${Math.random().toString(36).substring(2, 6)}`,
    traceId: `trc_${now}`,
    userTranscript: "",
    partialTranscript: "",
    assistantTranscript: "",
    toolQueue: [],
    streamState: "idle",
    startTime: now,
    cancellation: new CancellationToken(),
    metrics: {
      sttPartialMs: 0,
      llmFirstTokenMs: 0,
      firstSentenceTtsMs: 0,
      totalTurnMs: 0,
    },
  };
}

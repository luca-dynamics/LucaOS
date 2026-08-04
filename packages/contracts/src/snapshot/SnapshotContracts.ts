import { ExecutionMode, ConnectionState, LucaRuntimeState } from "../runtime/RuntimeContracts";
import { ExpressionState } from "../orb/OrbContracts";
import { WorkerMessage } from "../worker/WorkerContracts";

export interface ExecutionBudget {
  maxLatencyMs: number;
  maxTokens: number;
  maxCost: number;
  maxWorkers: number;
  priority: "high" | "normal" | "low";
  deadline: number;
}

export interface ExecutionDAGNode {
  stepId: string;
  stepName: string;
  subsystem: "memory" | "llm" | "tool" | "tts" | "playback" | "worker";
  description: string;
  dependsOn: string[]; // Parent step dependencies for parallel execution
  estimatedDurationMs: number;
}

export interface TurnExecutionPlan {
  planId: string;
  userPrompt: string;
  budget: ExecutionBudget;
  dag: ExecutionDAGNode[];
}

export interface TurnDecisionNode {
  nodeId: string;
  stage: string;
  timestamp: number;
  durationMs: number;
  provider: string;
  decision: string;
  confidence: number;
  outputSummary: string;
  parent?: string;
  cost?: number;
  tokens?: number;
  inputHash?: string;
  outputHash?: string;
}

export interface TurnDecisionGraph {
  turnId: string;
  nodes: TurnDecisionNode[];
}

// Sectioned TurnSnapshot v1.2.0 Structure
export interface TurnSnapshot {
  snapshotVersion: "1.2.0";
  schemaVersion: "1.2.0";
  provenance: {
    runtimeVersion: string;
    runtimeConfigurationHash: string;
    featureFlags: string[];
    deviceInformation: { os: string; arch: string; sampleRateHz: number };
  };
  conversation: {
    sessionId: string;
    conversationId: string;
    turnId: string;
    traceId: string;
    timestamp: number;
    userPrompt: string;
    assistantResponse: string;
  };
  runtime: {
    stateHistory: Array<{ timestamp: number; state: LucaRuntimeState; reason: string }>;
    executionMode: ExecutionMode;
    connectionState: ConnectionState;
  };
  providers: {
    stt: { provider: string; latencyMs: number };
    llm: { provider: string; firstTokenMs: number; totalTokens: number };
    tts: { provider: string; startupMs: number };
  };
  tools: Array<{ toolId: string; toolName: string; durationMs: number; status: "success" | "failed" }>;
  memory: {
    retrievedFactsCount: number;
    retrievedEpisodesCount: number;
    workingMemoryTurnsCount: number;
  };
  worker: {
    activeJobs: WorkerMessage[];
  };
  performance: {
    sttMs: number;
    llmFirstTokenMs: number;
    toolMs: number;
    ttsStartupMs: number;
    playbackMs: number;
    totalTurnMs: number;
  };
  timeline: Array<{ timestamp: number; expression: ExpressionState }>;
  decisionGraph: TurnDecisionGraph;
  executionPlan: TurnExecutionPlan;
  replay: {
    pointer: string;
    reproducible: boolean;
  };
  diagnostics: {
    errors: string[];
    warnings: string[];
    qualityScore: number;
  };
}

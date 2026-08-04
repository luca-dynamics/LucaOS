export type ExecutionStatus = "pending" | "running" | "completed" | "failed" | "skipped";

export interface ExecutionStep {
  id: string;
  kind: "search_memory" | "tool_call" | "llm_query" | "summarize" | "speech_output";
  description: string;
  status: ExecutionStatus;
  payload?: Record<string, unknown>;
  requiresApproval?: boolean;
}

export interface ExecutionPlan {
  planId: string;
  userIntent: string;
  steps: ExecutionStep[];
  status: ExecutionStatus;
  createdAt: number;
}

export interface ExecutionResult {
  planId: string;
  success: boolean;
  stepResults: Record<string, unknown>;
  summaryText?: string;
  error?: string;
}

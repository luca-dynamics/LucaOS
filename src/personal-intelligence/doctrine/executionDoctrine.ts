export const EXECUTION_DOCTRINE_STAGES = ["sense", "understand", "plan", "approve", "act", "verify", "learn"] as const;
export type ExecutionDoctrineStage = (typeof EXECUTION_DOCTRINE_STAGES)[number];
export type ExecutionStageStatus = "pending" | "in_progress" | "blocked" | "approved" | "completed" | "failed" | "skipped";

export interface ExecutionDoctrineStageDefinition {
  stage: ExecutionDoctrineStage;
  purpose: string;
  approvalRequired: boolean;
}

export interface ExecutionDoctrine {
  id: string;
  name: string;
  stages: ExecutionDoctrineStageDefinition[];
}

export interface ExecutionTraceEvent {
  traceId: string;
  eventId: string;
  stage: ExecutionDoctrineStage;
  status: ExecutionStageStatus;
  timestamp: string;
  summary: string;
  detail?: Record<string, unknown>;
}

export interface ExecutionTrace {
  traceId: string;
  missionId?: string;
  events: ExecutionTraceEvent[];
  startedAt: string;
  completedAt?: string;
}

export const LUCA_EXECUTION_DOCTRINE: ExecutionDoctrine = {
  id: "luca-personal-intelligence-v1",
  name: "Sense → Understand → Plan → Approve → Act → Verify → Learn",
  stages: [
    { stage: "sense", purpose: "Collect relevant user, environment, and task signals.", approvalRequired: false },
    { stage: "understand", purpose: "Interpret intent, context, constraints, and privacy boundaries.", approvalRequired: false },
    { stage: "plan", purpose: "Produce an inspectable sequence of proposed actions.", approvalRequired: false },
    { stage: "approve", purpose: "Obtain the authorization required by policy before acting.", approvalRequired: true },
    { stage: "act", purpose: "Execute only the approved plan within declared permissions.", approvalRequired: false },
    { stage: "verify", purpose: "Confirm outcomes and surface discrepancies or failures.", approvalRequired: false },
    { stage: "learn", purpose: "Record bounded feedback and future adjustments.", approvalRequired: false },
  ],
};

// Runtime Plan types — PR #122: Runtime Orchestration & Planning Loop Foundation
// Planning creates governed records. It does not bypass governance.
// Approving a plan/checkpoint does not execute tools/skills.

export type RuntimePlanStatus =
  | "proposed"
  | "active"
  | "waiting_approval"
  | "waiting_user"
  | "blocked"
  | "completed"
  | "archived"
  | "rejected";

export type RuntimePlanStepStatus =
  | "proposed"
  | "checkpoint_required"
  | "approval_required"
  | "approved_waiting_action"
  | "waiting_memory_write"
  | "waiting_skill_bridge"
  | "blocked"
  | "completed"
  | "skipped";

export type RuntimePlanStepKind =
  | "explain"
  | "ask_user"
  | "memory_proposal"
  | "governed_action_request"
  | "safe_execution_request"
  | "skill_request"
  | "planning_checkpoint"
  | "reminder"
  | "inbox_event"
  | "blocked_risky_action"
  | "other";

export type RuntimePlanRiskLevel =
  | "safe"
  | "low"
  | "elevated"
  | "high"
  | "critical";

export interface RuntimePlanStep {
  stepId: string;
  title: string;
  summary: string;
  kind: RuntimePlanStepKind;
  status: RuntimePlanStepStatus;
  riskLevel: RuntimePlanRiskLevel;
  requiredApprovals: string[];
  relatedCheckpointId?: string;
  relatedGovernedRequestId?: string;
  relatedMemoryProposalId?: string;
  relatedSkillRequestId?: string;
  relatedExecutionRequestId?: string;
  blockedBy?: string[];
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
}

export interface RuntimePlanRecord {
  planId: string;
  title: string;
  summary: string;
  source: string;
  sourceId?: string;
  userIntentSummary?: string;
  status: RuntimePlanStatus;
  riskLevel: RuntimePlanRiskLevel;
  steps: RuntimePlanStep[];
  currentStepId?: string;
  checkpointIds: string[];
  governedRequestIds: string[];
  memoryProposalIds: string[];
  skillRequestIds: string[];
  safeExecutionRequestIds: string[];
  inboxEventIds: string[];
  provenanceIds: string[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  blockedBy?: string[];
  metadata: Record<string, unknown>;
}

export interface RuntimePlanDiagnosticsSummary {
  totalPlans: number;
  activePlans: number;
  proposedPlans: number;
  waitingPlans: number;
  blockedPlans: number;
  completedPlans: number;
  totalPlanSteps: number;
  blockedRiskySteps: number;
  pendingPlanApprovals: number;
  planArtifactsCreated: number;
  orchestrationEnabled: true;
  riskyExecutionEnabled: false;
}

export const RUNTIME_PLAN_MAX_TITLE_LENGTH = 160;
export const RUNTIME_PLAN_MAX_SUMMARY_LENGTH = 2_000;
export const RUNTIME_PLAN_MAX_STEPS = 50;
export const RUNTIME_PLAN_MAX_METADATA_KEYS = 30;
export const RUNTIME_PLAN_MAX_METADATA_VALUE_LENGTH = 500;

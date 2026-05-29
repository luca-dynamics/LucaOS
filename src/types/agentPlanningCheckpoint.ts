import type { ApprovalRequestRiskLevel } from "./approvalCenter";

export type AgentPlanningCheckpointStatus =
  | "proposed"
  | "approved"
  | "rejected"
  | "blocked"
  | "completed"
  | "archived";

export interface AgentPlanningCheckpoint {
  checkpointId: string;
  sessionId?: string;
  title: string;
  summary: string;
  proposedNextSteps: string[];
  riskLevel: ApprovalRequestRiskLevel;
  requiredApprovals: string[];
  relatedGovernedRequestIds: string[];
  relatedMemoryProposalIds: string[];
  relatedSkillRequestIds: string[];
  status: AgentPlanningCheckpointStatus;
  provenanceIds: string[];
  createdAt: string;
  updatedAt: string;
  blockedBy?: string[];
  metadata: Record<string, unknown>;
}

export interface AgentPlanningCheckpointDiagnosticsSummary {
  totalCheckpoints: number;
  proposedCheckpoints: number;
  approvedCheckpoints: number;
  rejectedCheckpoints: number;
  blockedCheckpoints: number;
  completedCheckpoints: number;
  archivedCheckpoints: number;
  canAutoExecute: false;
}

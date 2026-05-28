import type { LucaUserTier } from "../../types/lucaUserTier";

export type LucaTier = Exclude<LucaUserTier, "unknown">;

export type LucaEvolutionProposalKind =
  | "skill_update"
  | "skill_create"
  | "skill_deprecate"
  | "prompt_update"
  | "tool_metadata_update"
  | "memory_policy_update"
  | "voice_policy_update"
  | "runtime_policy_update"
  | "ui_ux_suggestion"
  | "workflow_update"
  | "optimizer_candidate"
  | "external_lab_candidate"
  | "unknown";

export type LucaEvolutionProposalStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "promoted"
  | "rolled_back"
  | "archived";

export type LucaEvolutionProposalSource =
  | "origin_manual"
  | "tactical_request"
  | "trace_reflection"
  | "mission_tape_analysis"
  | "skill_ingestion"
  | "evolution_service"
  | "lucaos_self_evolution_repo"
  | "external_lab"
  | "unknown";

export interface LucaEvolutionEvidence {
  traceMemoryItemIds?: string[];
  missionTapeIds?: string[];
  evalDatasetIds?: string[];
  failureExamples?: string[];
  successExamples?: string[];
  userFeedback?: string[];
  diagnostics?: string[];
  metadata?: Record<string, unknown>;
}

export interface LucaEvolutionEvalSummary {
  evalRequired: boolean;
  evalPassed?: boolean;
  score?: number;
  baselineScore?: number;
  regressionDetected?: boolean;
  evalDatasetIds?: string[];
  testCommand?: string;
  testOutputSummary?: string;
  metadata?: Record<string, unknown>;
}

export type LucaEvolutionRiskLevel = "low" | "medium" | "high" | "critical" | "unknown";

export interface LucaEvolutionRiskAssessment {
  riskLevel: LucaEvolutionRiskLevel;
  affectedCapabilities?: string[];
  requiresOriginApproval: boolean;
  requiresHumanReview: boolean;
  canAutoPromote?: boolean;
  safetyNotes?: string[];
  metadata?: Record<string, unknown>;
}

export interface LucaEvolutionApprovalPolicy {
  requiredTier: LucaTier;
  requiresOriginApproval: boolean;
  requiresPassingEvals: boolean;
  requiresRollbackPlan: boolean;
  allowsExternalLabProposal: boolean;
  allowsRuntimeAutoApply?: boolean;
}

export interface LucaEvolutionRollbackPlan {
  rollbackAvailable: boolean;
  previousVersion?: string;
  rollbackSteps?: string[];
  rollbackRisk?: LucaEvolutionRiskLevel;
  metadata?: Record<string, unknown>;
}

export interface LucaEvolutionProposalMetadata {
  contractKind: "luca_evolution_proposal";
  autonomousSelfModificationEnabled: false;
  runtimeBehaviorChanged: false;
  externalLabSupported: true;
  originGoverned: true;
  [key: string]: unknown;
}

export interface LucaEvolutionProposal {
  id: string;
  kind: LucaEvolutionProposalKind;
  status: LucaEvolutionProposalStatus;
  title: string;
  summary: string;
  source: LucaEvolutionProposalSource;
  requestedByTier: LucaTier;
  targetSkillManifestId?: string;
  targetSkillVersion?: string;
  targetFiles?: string[];
  proposedChanges?: string[];
  evidence?: LucaEvolutionEvidence;
  evalSummary?: LucaEvolutionEvalSummary;
  riskAssessment?: LucaEvolutionRiskAssessment;
  approvalPolicy?: LucaEvolutionApprovalPolicy;
  rollbackPlan?: LucaEvolutionRollbackPlan;
  createdAt: string;
  updatedAt?: string;
  metadata: LucaEvolutionProposalMetadata;
}

export const LUCA_EVOLUTION_PROPOSAL_DEFAULT_METADATA: LucaEvolutionProposalMetadata = {
  contractKind: "luca_evolution_proposal",
  autonomousSelfModificationEnabled: false,
  runtimeBehaviorChanged: false,
  externalLabSupported: true,
  originGoverned: true,
};

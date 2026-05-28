import type { LucaEvolutionEvidence, LucaEvolutionProposalSource, LucaTier } from "./EvolutionProposal";

export type LucaEvolutionRunStatus =
  | "created"
  | "collecting_context"
  | "building_dataset"
  | "optimizing"
  | "evaluating"
  | "gated"
  | "proposal_created"
  | "failed"
  | "cancelled"
  | "archived";

export type LucaEvolutionRunKind =
  | "skill_optimization"
  | "prompt_optimization"
  | "tool_description_optimization"
  | "memory_policy_optimization"
  | "voice_policy_optimization"
  | "workflow_optimization"
  | "ui_ux_analysis"
  | "runtime_policy_analysis"
  | "unknown";

export type LucaCandidateVariantStatus = "generated" | "evaluating" | "passed" | "failed" | "rejected" | "selected" | "promoted" | "archived";

export interface LucaEvolutionDatasetRef {
  id: string;
  name: string;
  source: LucaEvolutionProposalSource | "unknown";
  itemCount?: number;
  traceMemoryItemIds?: string[];
  missionTapeIds?: string[];
  evalCaseIds?: string[];
  metadata?: Record<string, unknown>;
}

export interface LucaEvolutionEvalCaseRef {
  id: string;
  datasetId?: string;
  title?: string;
  inputSummary?: string;
  expectedBehaviorSummary?: string;
  sourceTraceId?: string;
  sourceMissionTapeId?: string;
  metadata?: Record<string, unknown>;
}

export type LucaOptimizerEngineKind = "gepa" | "dspy" | "heuristic" | "manual" | "external_lab" | "unknown";

export interface LucaOptimizerEngineMetadata {
  kind: LucaOptimizerEngineKind;
  name: string;
  version?: string;
  externalRepo?: string;
  externalRunId?: string;
  localExecutionAllowed: false;
  networkAllowed: false;
  metadata?: Record<string, unknown>;
}

export type LucaConstraintGateKind =
  | "safety"
  | "eval"
  | "regression"
  | "rollback"
  | "tier_permission"
  | "manifest_validity"
  | "runtime_policy"
  | "external_lab_integrity"
  | "unknown";

export interface LucaConstraintGateResult {
  id: string;
  kind: LucaConstraintGateKind;
  passed: boolean;
  severity: "low" | "medium" | "high" | "critical" | "unknown";
  reason?: string;
  evidence?: string[];
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface LucaEvolutionPrBackMetadata {
  repo: string;
  branch?: string;
  pullRequestUrl?: string;
  pullRequestNumber?: number;
  commitSha?: string;
  status: "created" | "opened" | "merged" | "closed" | "unknown";
  createdBy?: string;
  requiresOriginReview: true;
  metadata?: Record<string, unknown>;
}

export interface LucaCandidateVariant {
  id: string;
  runId: string;
  status: LucaCandidateVariantStatus;
  title: string;
  summary?: string;
  targetKind: LucaEvolutionRunKind | "unknown";
  targetId?: string;
  proposedChanges: string[];
  diffSummary?: string;
  evalSummary?: Record<string, unknown>;
  constraintSummary?: string;
  riskAssessment?: Record<string, unknown>;
  rollbackPlan?: Record<string, unknown>;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface LucaEvolutionRun {
  id: string;
  kind: LucaEvolutionRunKind;
  status: LucaEvolutionRunStatus;
  title: string;
  summary?: string;
  createdByTier: LucaTier;
  source: LucaEvolutionProposalSource | "unknown";
  targetSkillManifestId?: string;
  targetProposalId?: string;
  inputEvidence?: LucaEvolutionEvidence;
  datasetRefs?: LucaEvolutionDatasetRef[];
  optimizerEngine?: LucaOptimizerEngineMetadata;
  candidates?: LucaCandidateVariant[];
  constraintResults?: LucaConstraintGateResult[];
  selectedCandidateId?: string;
  outputProposalId?: string;
  startedAt: string;
  completedAt?: string;
  metadata?: Record<string, unknown>;
}

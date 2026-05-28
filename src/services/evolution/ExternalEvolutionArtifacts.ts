import type { LucaCandidateVariant, LucaConstraintGateResult, LucaEvolutionRun } from "./EvolutionRun";
import type { LucaEvolutionProposal, LucaEvolutionEvalSummary } from "./EvolutionProposal";
import type { LucaSkillManifest } from "../skills/SkillManifest";
import type { LucaMemoryItem } from "../memory/MemoryContracts";

export type LucaExternalEvolutionArtifactKind =
  | "run_request"
  | "context_bundle"
  | "dataset_bundle"
  | "candidate_bundle"
  | "eval_report"
  | "constraint_report"
  | "pr_back_report"
  | "rollback_report"
  | "unknown";

export interface LucaExternalEvolutionArtifactEnvelope<TPayload = unknown> {
  id: string;
  kind: LucaExternalEvolutionArtifactKind;
  schemaVersion: string;
  sourceRepo?: string;
  sourceRunId?: string;
  createdAt: string;
  createdBy?: string;
  requiresOriginReview: true;
  redactionApplied?: boolean;
  payload: TPayload;
  metadata?: Record<string, unknown>;
}

export interface LucaEvolutionContextBundle {
  skillManifests?: LucaSkillManifest[];
  proposals?: LucaEvolutionProposal[];
  traceMemoryItems?: LucaMemoryItem[];
  missionTapeMemoryItems?: LucaMemoryItem[];
  evalDatasetRefs?: Array<{ id: string; uri?: string; metadata?: Record<string, unknown> }>;
  userFeedback?: Array<{ id?: string; feedback: string; rating?: number; metadata?: Record<string, unknown> }>;
  redactionSummary?: { applied: boolean; fields?: string[]; reason?: string; metadata?: Record<string, unknown> };
  metadata?: Record<string, unknown>;
}

export interface LucaEvolutionCandidateBundle {
  run: LucaEvolutionRun;
  candidates: LucaCandidateVariant[];
  evalSummaries?: LucaEvolutionEvalSummary[];
  constraintResults?: LucaConstraintGateResult[];
  riskAssessments?: Array<{ riskLevel?: string; affectedCapabilities?: string[]; rationale?: string; metadata?: Record<string, unknown> }>;
  rollbackPlans?: Array<{ rollbackAvailable: boolean; steps?: string[]; metadata?: Record<string, unknown> }>;
  prBackMetadata?: Array<Record<string, unknown>>;
  metadata?: Record<string, unknown>;
}

export type LucaEvolutionArtifactValidationSeverity = "info" | "warning" | "blocked";

export interface LucaEvolutionArtifactValidationResult {
  ok: boolean;
  reason?: string;
  severity: LucaEvolutionArtifactValidationSeverity;
  requiresOriginReview: boolean;
  blockedBy?: string[];
  metadata?: Record<string, unknown>;
}

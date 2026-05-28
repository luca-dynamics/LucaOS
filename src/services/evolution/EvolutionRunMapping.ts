import type { LucaEvolutionProposal } from "./EvolutionProposal";
import type {
  LucaCandidateVariant,
  LucaConstraintGateResult,
  LucaEvolutionPrBackMetadata,
  LucaEvolutionRun,
  LucaOptimizerEngineMetadata,
} from "./EvolutionRun";

const now = () => new Date().toISOString();
const genId = (prefix: string) => `${prefix}_${Date.now().toString(36)}`;

export function createEvolutionRunFromProposal(proposal: LucaEvolutionProposal, options?: Record<string, any>): LucaEvolutionRun {
  return {
    id: options?.id ?? genId("run"),
    kind: options?.kind ?? "unknown",
    status: options?.status ?? "created",
    title: options?.title ?? proposal.title,
    summary: options?.summary ?? proposal.summary,
    createdByTier: options?.createdByTier ?? proposal.requestedByTier,
    source: options?.source ?? proposal.source,
    targetSkillManifestId: options?.targetSkillManifestId ?? proposal.targetSkillManifestId,
    targetProposalId: options?.targetProposalId ?? proposal.id,
    inputEvidence: options?.inputEvidence ?? proposal.evidence,
    datasetRefs: options?.datasetRefs,
    optimizerEngine: {
      kind: options?.optimizerEngine?.kind ?? "unknown",
      name: options?.optimizerEngine?.name ?? "external-only",
      version: options?.optimizerEngine?.version,
      externalRepo: options?.optimizerEngine?.externalRepo,
      externalRunId: options?.optimizerEngine?.externalRunId,
      localExecutionAllowed: false,
      networkAllowed: false,
      metadata: options?.optimizerEngine?.metadata,
    },
    candidates: (options?.candidates ?? []).map((candidate: LucaCandidateVariant) => ({ ...candidate, status: candidate.status === "promoted" ? "selected" : candidate.status })),
    constraintResults: options?.constraintResults,
    selectedCandidateId: options?.selectedCandidateId,
    outputProposalId: options?.outputProposalId,
    startedAt: options?.startedAt ?? options?.nowIso ?? now(),
    completedAt: options?.completedAt,
    metadata: {
      ...proposal.metadata,
      ...(options?.metadata ?? {}),
    },
  };
}

export function createCandidateVariantFromProposal(proposal: LucaEvolutionProposal, options?: Record<string, any>): LucaCandidateVariant {
  return {
    id: options?.id ?? genId("candidate"),
    runId: options?.runId ?? genId("run"),
    status: options?.status ?? "generated",
    title: options?.title ?? proposal.title,
    summary: options?.summary ?? proposal.summary,
    targetKind: options?.targetKind ?? "unknown",
    targetId: options?.targetId ?? proposal.targetSkillManifestId ?? proposal.id,
    proposedChanges: options?.proposedChanges ?? proposal.proposedChanges ?? [],
    diffSummary: options?.diffSummary,
    evalSummary: options?.evalSummary ?? proposal.evalSummary,
    constraintSummary: options?.constraintSummary,
    riskAssessment: options?.riskAssessment ?? proposal.riskAssessment,
    rollbackPlan: options?.rollbackPlan ?? proposal.rollbackPlan,
    createdAt: options?.createdAt ?? options?.nowIso ?? now(),
    metadata: {
      ...proposal.metadata,
      ...(options?.metadata ?? {}),
    },
  };
}

export function createExternalLabRunSnapshot(input: Record<string, any>) {
  const engine: LucaOptimizerEngineMetadata = {
    kind: input.optimizerEngine?.kind ?? "external_lab",
    name: input.optimizerEngine?.name ?? "external-lab",
    version: input.optimizerEngine?.version,
    externalRepo: input.optimizerEngine?.externalRepo ?? input.externalRepo,
    externalRunId: input.optimizerEngine?.externalRunId ?? input.externalRunId,
    localExecutionAllowed: false,
    networkAllowed: false,
    metadata: input.optimizerEngine?.metadata,
  };

  return {
    requiresOriginReview: true,
    optimizerEngine: engine,
    externalLab: true,
    metadata: {
      ...(input.metadata ?? {}),
    },
  };
}

export function createPrBackMetadata(input: Record<string, any>): LucaEvolutionPrBackMetadata {
  return {
    repo: input.repo,
    branch: input.branch,
    pullRequestUrl: input.pullRequestUrl,
    pullRequestNumber: input.pullRequestNumber,
    commitSha: input.commitSha,
    status: input.status ?? "created",
    createdBy: input.createdBy,
    requiresOriginReview: true,
    metadata: {
      ...(input.metadata ?? {}),
    },
  };
}

export function getEvolutionRunContractSnapshot(input?: Record<string, unknown>) {
  return {
    contractKind: "luca_evolution_run",
    adapterOnly: true,
    localExecutionAllowed: false,
    networkAllowed: false,
    autonomousPromotionEnabled: false,
    requiresOriginReviewForExternalLab: true,
    ...input,
  };
}

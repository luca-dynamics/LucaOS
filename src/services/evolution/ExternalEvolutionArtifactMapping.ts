import type {
  LucaEvolutionCandidateBundle,
  LucaEvolutionContextBundle,
  LucaExternalEvolutionArtifactEnvelope,
  LucaExternalEvolutionArtifactKind,
} from "./ExternalEvolutionArtifacts";

const now = () => new Date().toISOString();
const genId = (prefix: string) => `${prefix}_${Date.now().toString(36)}`;

export function createExternalArtifactEnvelope<TPayload>(input: {
  id?: string;
  kind?: LucaExternalEvolutionArtifactKind;
  schemaVersion?: string;
  sourceRepo?: string;
  sourceRunId?: string;
  createdAt?: string;
  createdBy?: string;
  redactionApplied?: boolean;
  payload: TPayload;
  metadata?: Record<string, unknown>;
}): LucaExternalEvolutionArtifactEnvelope<TPayload> {
  return {
    id: input.id ?? genId("ext_artifact"),
    kind: input.kind ?? "unknown",
    schemaVersion: input.schemaVersion ?? "",
    sourceRepo: input.sourceRepo,
    sourceRunId: input.sourceRunId,
    createdAt: input.createdAt ?? now(),
    createdBy: input.createdBy,
    requiresOriginReview: true,
    redactionApplied: input.redactionApplied,
    payload: input.payload,
    metadata: input.metadata,
  };
}

export function createContextBundle(input?: LucaEvolutionContextBundle): LucaEvolutionContextBundle {
  return {
    skillManifests: input?.skillManifests ?? [],
    proposals: input?.proposals ?? [],
    traceMemoryItems: input?.traceMemoryItems ?? [],
    missionTapeMemoryItems: input?.missionTapeMemoryItems ?? [],
    evalDatasetRefs: input?.evalDatasetRefs ?? [],
    userFeedback: input?.userFeedback ?? [],
    redactionSummary: input?.redactionSummary,
    metadata: input?.metadata,
  };
}

export function createCandidateBundle(input: LucaEvolutionCandidateBundle): LucaEvolutionCandidateBundle {
  return {
    run: input.run,
    candidates: input.candidates ?? [],
    evalSummaries: input.evalSummaries ?? [],
    constraintResults: input.constraintResults ?? [],
    riskAssessments: input.riskAssessments ?? [],
    rollbackPlans: input.rollbackPlans ?? [],
    prBackMetadata: input.prBackMetadata ?? [],
    metadata: input.metadata,
  };
}

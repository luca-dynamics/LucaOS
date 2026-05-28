import type { LucaEvolutionProposal, LucaTier } from "./EvolutionProposal";
import type { LucaCandidateVariant, LucaEvolutionRun } from "./EvolutionRun";
import type { LucaExternalEvolutionArtifactEnvelope, LucaEvolutionCandidateBundle } from "./ExternalEvolutionArtifacts";

const now = () => new Date().toISOString();
const genId = (prefix: string) => `${prefix}_${Date.now().toString(36)}`;

export const EXTERNAL_IMPORT_SCHEMA_VERSION = "1.0.0";

export function isSupportedExternalImportSchemaVersion(schemaVersion: string): boolean {
  return schemaVersion === EXTERNAL_IMPORT_SCHEMA_VERSION;
}

export function mapCandidateBundleToReviewProposal(bundle: LucaEvolutionCandidateBundle, actorTier: LucaTier): LucaEvolutionProposal {
  return {
    id: genId("proposal_external"),
    kind: "external_lab_candidate",
    status: "submitted",
    title: `External candidate bundle: ${bundle.run.title}`,
    summary: bundle.run.summary ?? "External lab candidate bundle imported for Origin review.",
    source: "external_lab",
    requestedByTier: actorTier,
    proposedChanges: bundle.candidates.map((candidate) => candidate.title),
    createdAt: now(),
    metadata: {
      contractKind: "luca_evolution_proposal",
      autonomousSelfModificationEnabled: false,
      runtimeBehaviorChanged: false,
      externalLabSupported: true,
      originGoverned: true,
      adapterOnly: true,
      importedArtifactsRequireOriginReview: true,
      autoApplyEnabled: false,
      importKind: "candidate_bundle",
      importedRunId: bundle.run.id,
      importedCandidateCount: bundle.candidates.length,
    },
  };
}

export function mapEvalReportToReviewRun(envelope: LucaExternalEvolutionArtifactEnvelope<Record<string, unknown>>, actorTier: LucaTier): LucaEvolutionRun {
  return {
    id: genId("run_external"),
    kind: "unknown",
    status: "gated",
    title: `External eval report ${envelope.id}`,
    summary: "External eval report imported for Origin-only review.",
    createdByTier: actorTier,
    source: "external_lab",
    startedAt: envelope.createdAt,
    metadata: {
      adapterOnly: true,
      importedArtifactsRequireOriginReview: true,
      autoApplyEnabled: false,
      importKind: "eval_report",
      sourceEnvelopeId: envelope.id,
      sourceSchemaVersion: envelope.schemaVersion,
      payload: envelope.payload,
    },
  };
}

export function mapPrBackReportToReviewProposal(envelope: LucaExternalEvolutionArtifactEnvelope<Record<string, unknown>>, actorTier: LucaTier): LucaEvolutionProposal {
  return {
    id: genId("proposal_external_prback"),
    kind: "external_lab_candidate",
    status: "submitted",
    title: `External PR-back report: ${envelope.id}`,
    summary: "External PR-back report imported as proposal metadata only.",
    source: "external_lab",
    requestedByTier: actorTier,
    proposedChanges: [],
    createdAt: now(),
    metadata: {
      contractKind: "luca_evolution_proposal",
      autonomousSelfModificationEnabled: false,
      runtimeBehaviorChanged: false,
      externalLabSupported: true,
      originGoverned: true,
      adapterOnly: true,
      importedArtifactsRequireOriginReview: true,
      autoApplyEnabled: false,
      importKind: "pr_back_report",
      sourceEnvelopeId: envelope.id,
      sourceSchemaVersion: envelope.schemaVersion,
      prBackReport: envelope.payload,
    },
  };
}

export function normalizeImportedCandidates(bundle: LucaEvolutionCandidateBundle): LucaCandidateVariant[] {
  return (bundle.candidates ?? []).map((candidate) => ({ ...candidate }));
}

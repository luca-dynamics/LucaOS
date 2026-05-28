import type { LucaEvolutionProposal, LucaTier } from "./EvolutionProposal";
import type { LucaEvolutionRun } from "./EvolutionRun";
import type { LucaExternalEvolutionArtifactEnvelope, LucaEvolutionCandidateBundle } from "./ExternalEvolutionArtifacts";
import { validateExternalEvolutionArtifact } from "./ExternalEvolutionArtifactGate";
import {
  isSupportedExternalImportSchemaVersion,
  mapCandidateBundleToReviewProposal,
  mapEvalReportToReviewRun,
  mapPrBackReportToReviewProposal,
  normalizeImportedCandidates,
} from "./ExternalEvolutionImportMapping";

interface LucaExternalImportResult<T> {
  ok: boolean;
  reason?: string;
  blockedBy?: string[];
  value?: T;
}

function guardActorTier(actorTier: LucaTier, riskLevel: string = "unknown"): LucaExternalImportResult<true> {
  if (actorTier === "normal") return { ok: false, reason: "Normal tier cannot import external lab artifacts.", blockedBy: ["tier_forbidden_normal"] };
  if (actorTier === "tactical" && ["high", "critical"].includes(riskLevel)) {
    return { ok: false, reason: "Tactical tier cannot import high-risk external lab artifacts.", blockedBy: ["tier_forbidden_tactical_high_risk"] };
  }
  return { ok: true, value: true };
}

function guardEnvelope(envelope: LucaExternalEvolutionArtifactEnvelope<unknown>): LucaExternalImportResult<true> {
  if (!isSupportedExternalImportSchemaVersion(envelope.schemaVersion)) {
    return { ok: false, reason: "Unsupported external artifact schema version.", blockedBy: ["unsupported_schema_version"] };
  }
  const validation = validateExternalEvolutionArtifact(envelope);
  if (!validation.ok) return { ok: false, reason: validation.reason, blockedBy: validation.blockedBy };
  return { ok: true, value: true };
}

function inferRiskLevel(value: unknown): string {
  const text = JSON.stringify(value ?? {}).toLowerCase();
  if (text.includes('"risklevel":"critical"')) return "critical";
  if (text.includes('"risklevel":"high"')) return "high";
  if (text.includes('"risklevel":"medium"')) return "medium";
  if (text.includes('"risklevel":"low"')) return "low";
  return "unknown";
}

export const ExternalEvolutionImportAdapter = {
  name: "ExternalEvolutionImportAdapter",
  kind: "external_import_adapter",

  importExternalArtifact(envelope: LucaExternalEvolutionArtifactEnvelope<unknown>, actorTier: LucaTier): LucaExternalImportResult<{ proposal?: LucaEvolutionProposal; run?: LucaEvolutionRun }> {
    const tierGate = guardActorTier(actorTier, inferRiskLevel(envelope.payload));
    if (!tierGate.ok) return tierGate;
    const envelopeGate = guardEnvelope(envelope);
    if (!envelopeGate.ok) return envelopeGate;

    if (envelope.kind === "eval_report") {
      return { ok: true, value: { run: mapEvalReportToReviewRun(envelope as LucaExternalEvolutionArtifactEnvelope<Record<string, unknown>>, actorTier) } };
    }
    if (envelope.kind === "pr_back_report") {
      return { ok: true, value: { proposal: mapPrBackReportToReviewProposal(envelope as LucaExternalEvolutionArtifactEnvelope<Record<string, unknown>>, actorTier) } };
    }
    return { ok: false, reason: "Unsupported external artifact kind.", blockedBy: ["unsupported_artifact_kind"] };
  },

  importCandidateBundle(bundle: LucaEvolutionCandidateBundle, actorTier: LucaTier): LucaExternalImportResult<{ proposal: LucaEvolutionProposal; candidates: ReturnType<typeof normalizeImportedCandidates> }> {
    const riskLevel = inferRiskLevel(bundle.riskAssessments ?? bundle.metadata ?? {});
    const tierGate = guardActorTier(actorTier, riskLevel);
    if (!tierGate.ok) return tierGate;

    const proposal = mapCandidateBundleToReviewProposal(bundle, actorTier);
    return { ok: true, value: { proposal, candidates: normalizeImportedCandidates(bundle) } };
  },

  importEvalReport(envelope: LucaExternalEvolutionArtifactEnvelope<Record<string, unknown>>, actorTier: LucaTier): LucaExternalImportResult<LucaEvolutionRun> {
    const result = this.importExternalArtifact(envelope, actorTier);
    if (!result.ok || !result.value?.run) return { ok: false, reason: result.reason ?? "Eval report import failed.", blockedBy: result.blockedBy };
    return { ok: true, value: result.value.run };
  },

  importPrBackReport(envelope: LucaExternalEvolutionArtifactEnvelope<Record<string, unknown>>, actorTier: LucaTier): LucaExternalImportResult<LucaEvolutionProposal> {
    const result = this.importExternalArtifact(envelope, actorTier);
    if (!result.ok || !result.value?.proposal) return { ok: false, reason: result.reason ?? "PR-back report import failed.", blockedBy: result.blockedBy };
    return { ok: true, value: result.value.proposal };
  },

  getSnapshot() {
    return {
      adapterOnly: true,
      runtimeBehaviorChanged: false,
      importedArtifactsRequireOriginReview: true,
      autoApplyEnabled: false,
      existingEvolutionServiceCalled: false,
      noLocalMutation: true,
      noFileWrite: true,
      noAutoMerge: true,
      supports: ["candidate_bundle", "eval_report", "pr_back_report"],
      blockedTiers: ["normal"],
    };
  },
};

export default ExternalEvolutionImportAdapter;

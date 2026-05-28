import type { LucaEvolutionArtifactValidationResult, LucaExternalEvolutionArtifactEnvelope } from "./ExternalEvolutionArtifacts";

const RISKY_CAPS = ["computer-use", "filesystem", "network", "voice", "voice_policy", "runtime_policy", "runtime"];

function detectRiskSignals(value: unknown): string[] {
  const text = JSON.stringify(value ?? {}).toLowerCase();
  return RISKY_CAPS.filter((cap) => text.includes(cap));
}

export function validateExternalEvolutionArtifact(input: LucaExternalEvolutionArtifactEnvelope<unknown>): LucaEvolutionArtifactValidationResult {
  const blockedBy: string[] = [];
  const warnings: string[] = [];
  const riskSignals = detectRiskSignals(input);
  const isMediumPlusRisk = ["medium", "high", "critical"].some((risk) => JSON.stringify(input.payload ?? {}).toLowerCase().includes(`\"risklevel\":\"${risk}\"`));

  if (!input.schemaVersion || input.schemaVersion.trim().length === 0) blockedBy.push("missing_schema_version");

  if (input.kind === "candidate_bundle") {
    const payload = (input.payload ?? {}) as Record<string, unknown>;
    const evalSummaries = payload.evalSummaries as unknown[] | undefined;
    if (!evalSummaries || evalSummaries.length === 0) {
      if (riskSignals.length > 0 || isMediumPlusRisk) blockedBy.push("candidate_bundle_missing_eval_summary_high_risk");
      else warnings.push("candidate_bundle_missing_eval_summary");
    }
  }

  if (input.kind === "pr_back_report" && isMediumPlusRisk) {
    const payload = (input.payload ?? {}) as Record<string, unknown>;
    const rollbackMetadata = payload.rollbackMetadata ?? payload.rollbackPlan ?? payload.rollbackPlans;
    if (!rollbackMetadata) blockedBy.push("pr_back_missing_rollback_metadata");
  }

  if (riskSignals.length > 0) warnings.push("risky_capability_detected");

  const severity: LucaEvolutionArtifactValidationResult["severity"] = blockedBy.length ? "blocked" : warnings.length ? "warning" : "info";

  return {
    ok: blockedBy.length === 0,
    reason: blockedBy.length ? "External evolution artifact failed validation." : warnings.length ? "External evolution artifact requires review." : "External evolution artifact accepted for Origin review.",
    severity,
    requiresOriginReview: true,
    blockedBy: blockedBy.length ? blockedBy : undefined,
    metadata: {
      riskSignals,
      warningFlags: warnings,
      autoPromoteEnabled: false,
      runtimeAutoApplyEnabled: false,
    },
  };
}

export function getExternalEvolutionArtifactSnapshot(input?: Record<string, unknown>) {
  return {
    contractKind: "luca_external_evolution_artifact",
    requiresOriginReview: true,
    autoPromoteEnabled: false,
    runtimeAutoApplyEnabled: false,
    localOptimizerExecutionAllowed: false,
    ...input,
  };
}

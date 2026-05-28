import { describe, expect, it } from "vitest";
import { createExternalArtifactEnvelope } from "./ExternalEvolutionArtifactMapping";
import { ExternalEvolutionImportAdapter } from "./ExternalEvolutionImportAdapter";
import type { LucaEvolutionCandidateBundle } from "./ExternalEvolutionArtifacts";

const candidateBundle: LucaEvolutionCandidateBundle = {
  run: {
    id: "run_external_1",
    kind: "unknown",
    status: "created",
    title: "External Run",
    createdByTier: "origin",
    source: "external_lab",
    startedAt: "2026-01-01T00:00:00.000Z",
  },
  candidates: [{
    id: "cand_1",
    runId: "run_external_1",
    status: "generated",
    title: "Candidate A",
    targetKind: "unknown",
    proposedChanges: ["change"],
    createdAt: "2026-01-01T00:00:00.000Z",
  }],
  riskAssessments: [{ riskLevel: "low" }],
};

describe("ExternalEvolutionImportAdapter", () => {
  it("valid candidate bundle imports as review-only proposal", () => {
    const result = ExternalEvolutionImportAdapter.importCandidateBundle(candidateBundle, "origin");
    expect(result.ok).toBe(true);
    expect(result.value?.proposal.metadata.adapterOnly).toBe(true);
    expect(result.value?.proposal.metadata.autoApplyEnabled).toBe(false);
    expect(result.value?.proposal.metadata.importedArtifactsRequireOriginReview).toBe(true);
  });

  it("invalid schemaVersion blocked", () => {
    const envelope = createExternalArtifactEnvelope({ kind: "eval_report", schemaVersion: "2.0.0", payload: {} });
    const result = ExternalEvolutionImportAdapter.importEvalReport(envelope, "origin");
    expect(result.ok).toBe(false);
    expect(result.blockedBy).toContain("unsupported_schema_version");
  });

  it("PR-back import requires Origin review", () => {
    const envelope = createExternalArtifactEnvelope({ kind: "pr_back_report", schemaVersion: "1.0.0", payload: { status: "opened" } });
    const result = ExternalEvolutionImportAdapter.importPrBackReport(envelope, "origin");
    expect(result.ok).toBe(true);
    expect(result.value?.metadata.importedArtifactsRequireOriginReview).toBe(true);
  });

  it("Tactical import blocked for high-risk", () => {
    const envelope = createExternalArtifactEnvelope({
      kind: "eval_report",
      schemaVersion: "1.0.0",
      payload: { riskLevel: "high" },
    });
    const result = ExternalEvolutionImportAdapter.importEvalReport(envelope, "tactical");
    expect(result.ok).toBe(false);
    expect(result.blockedBy).toContain("tier_forbidden_tactical_high_risk");
  });

  it("Normal import blocked", () => {
    const envelope = createExternalArtifactEnvelope({ kind: "eval_report", schemaVersion: "1.0.0", payload: {} });
    const result = ExternalEvolutionImportAdapter.importEvalReport(envelope, "normal");
    expect(result.ok).toBe(false);
    expect(result.blockedBy).toContain("tier_forbidden_normal");
  });

  it("no runtime apply and no mutate/commit call in snapshot", () => {
    const snapshot = ExternalEvolutionImportAdapter.getSnapshot();
    expect(snapshot.autoApplyEnabled).toBe(false);
    expect(snapshot.existingEvolutionServiceCalled).toBe(false);
  });

  it("snapshot confirms adapter-only", () => {
    const snapshot = ExternalEvolutionImportAdapter.getSnapshot();
    expect(snapshot.adapterOnly).toBe(true);
    expect(snapshot.runtimeBehaviorChanged).toBe(false);
  });
});

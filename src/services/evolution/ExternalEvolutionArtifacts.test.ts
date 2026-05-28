import { describe, expect, it } from "vitest";
import { createExternalArtifactEnvelope, createContextBundle, createCandidateBundle } from "./ExternalEvolutionArtifactMapping";
import { getExternalEvolutionArtifactSnapshot, validateExternalEvolutionArtifact } from "./ExternalEvolutionArtifactGate";
import type { LucaEvolutionRun } from "./EvolutionRun";

describe("ExternalEvolutionArtifacts", () => {
  it("envelope defaults require Origin review", () => {
    const envelope = createExternalArtifactEnvelope({
      kind: "context_bundle",
      schemaVersion: "1.0.0",
      payload: { ok: true },
    });

    expect(envelope.requiresOriginReview).toBe(true);
  });

  it("context bundle preserves trace/memory refs", () => {
    const bundle = createContextBundle({
      traceMemoryItems: [{ id: "trace_1", tier: "trace", scope: {}, source: "external_lab", content: "trace content", createdAt: 1735689600000, metadata: {} }],
      missionTapeMemoryItems: [{ id: "tape_1", tier: "operational", scope: {}, source: "external_lab", content: "tape content", createdAt: 1735689600000, metadata: {} }],
    });

    expect(bundle.traceMemoryItems?.[0]?.id).toBe("trace_1");
    expect(bundle.missionTapeMemoryItems?.[0]?.id).toBe("tape_1");
  });

  it("candidate bundle preserves candidates/evals/constraints", () => {
    const run = {
      id: "run_1",
      kind: "unknown",
      status: "created",
      title: "Run",
      summary: "Summary",
      createdByTier: "origin",
      source: "external_lab",
      targetProposalId: "proposal_1",
      inputEvidence: {},
      optimizerEngine: { kind: "external_lab", name: "lab", localExecutionAllowed: false, networkAllowed: false },
      candidates: [],
      startedAt: "2026-01-01T00:00:00.000Z",
      metadata: {},
    } as LucaEvolutionRun;

    const bundle = createCandidateBundle({
      run,
      candidates: [{ id: "c_1", runId: "run_1", status: "generated", title: "Candidate", summary: "summary", targetKind: "unknown", targetId: "proposal_1", proposedChanges: [], createdAt: "2026-01-01T00:00:00.000Z", metadata: {} }],
      evalSummaries: [{ evalRequired: true, evalPassed: true, score: 0.9 }],
      constraintResults: [{ id: "gate_1", kind: "unknown", passed: true, severity: "low", createdAt: "2026-01-01T00:00:00.000Z" }],
    });

    expect(bundle.candidates).toHaveLength(1);
    expect(bundle.evalSummaries).toHaveLength(1);
    expect(bundle.constraintResults).toHaveLength(1);
  });

  it("invalid schemaVersion blocked", () => {
    const result = validateExternalEvolutionArtifact(
      createExternalArtifactEnvelope({ kind: "run_request", payload: {}, schemaVersion: "" }),
    );
    expect(result.ok).toBe(false);
    expect(result.severity).toBe("blocked");
    expect(result.blockedBy).toContain("missing_schema_version");
  });

  it("risky capability artifact requires Origin", () => {
    const result = validateExternalEvolutionArtifact(
      createExternalArtifactEnvelope({
        kind: "constraint_report",
        schemaVersion: "1.0.0",
        payload: { affectedCapabilities: ["filesystem"] },
      }),
    );

    expect(result.requiresOriginReview).toBe(true);
    expect(result.severity).toBe("warning");
  });

  it("no auto-promotion/default runtime apply", () => {
    const snapshot = getExternalEvolutionArtifactSnapshot();
    expect(snapshot.autoPromoteEnabled).toBe(false);
    expect(snapshot.runtimeAutoApplyEnabled).toBe(false);
    expect(snapshot.localOptimizerExecutionAllowed).toBe(false);
  });
});

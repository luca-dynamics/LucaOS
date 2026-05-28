import { describe, expect, it } from "vitest";
import type { LucaEvolutionProposal } from "./EvolutionProposal";
import { createOriginEvolutionControlService } from "./createOriginEvolutionControlService";

function baseProposal(overrides: Partial<LucaEvolutionProposal> = {}): LucaEvolutionProposal {
  return {
    id: "proposal-1",
    kind: "workflow_update",
    status: "draft",
    title: "Improve workflow",
    summary: "Proposal summary",
    source: "tactical_request",
    requestedByTier: "tactical",
    createdAt: "2026-05-28T00:00:00.000Z",
    metadata: {
      contractKind: "luca_evolution_proposal",
      autonomousSelfModificationEnabled: false,
      runtimeBehaviorChanged: false,
      externalLabSupported: true,
      originGoverned: true,
    },
    ...overrides,
  };
}

describe("OriginEvolutionControlService", () => {
  it("Origin can submit and review proposal through control service", () => {
    const service = createOriginEvolutionControlService();
    service.submitProposal(baseProposal({ id: "origin-1", source: "origin_manual", requestedByTier: "origin" }), "origin");

    const reviewed = service.reviewProposal("origin-1", "origin", { note: "reviewed_by_origin" });
    expect(reviewed.proposal.status).toBe("under_review");
    expect(reviewed.reviewedByTier).toBe("origin");
  });

  it("Tactical can submit low-risk request but cannot import high-risk external artifact", () => {
    const service = createOriginEvolutionControlService();
    expect(() => {
      service.submitProposal(
        baseProposal({
          id: "tactical-low",
          riskAssessment: { riskLevel: "low", requiresOriginApproval: false, requiresHumanReview: true },
        }),
        "tactical",
      );
    }).not.toThrow();

    expect(() => {
      service.importExternalArtifact(
        {
          id: "external-high",
          kind: "pr_back_report",
          schemaVersion: "1.0.0",
          createdAt: "2026-05-28T00:00:00.000Z",
          sourceRepo: "external/fork",
          requiresOriginReview: true,
          payload: { riskLevel: "high" },
        },
        "tactical",
      );
    }).toThrow(/import_external_artifact_requires_origin_tier/);
  });

  it("Normal cannot submit raw proposal", () => {
    const service = createOriginEvolutionControlService();
    expect(() => service.submitProposal(baseProposal({ id: "normal-1", requestedByTier: "normal" }), "normal")).toThrow();
  });

  it("External candidate bundle imports as review-only proposal", () => {
    const service = createOriginEvolutionControlService();
    const imported = service.importCandidateBundle(
      {
        run: {
          id: "run-1",
          kind: "workflow_optimization",
          status: "gated",
          title: "External run",
          createdByTier: "origin",
          source: "external_lab",
          startedAt: "2026-05-28T00:00:00.000Z",
        },
        candidates: [
          {
            id: "cand-1",
            runId: "run-1",
            status: "passed",
            title: "Candidate A",
            targetKind: "workflow_optimization",
            proposedChanges: ["change"],
            createdAt: "2026-05-28T00:00:00.000Z",
          },
        ],
      },
      "origin",
    );

    expect(imported.proposal.kind).toBe("external_lab_candidate");
    expect(imported.proposal.status).toBe("submitted");
    expect(imported.proposal.metadata.importedArtifactsRequireOriginReview).toBe(true);
  });

  it("Constraint report verification blocks failed safety/regression and does not promote", () => {
    const service = createOriginEvolutionControlService();
    const out = service.verifyConstraintReport(
      {
        results: [
          { id: "s1", kind: "safety", passed: false, severity: "high", createdAt: "2026-05-28T00:00:00.000Z" },
          { id: "r1", kind: "regression", passed: false, severity: "high", createdAt: "2026-05-28T00:00:00.000Z" },
        ],
      },
      "origin",
    );

    expect(out.ok).toBe(false);
    expect(out.blockingReasons).toContain("failed_safety_gate");
    expect(out.blockingReasons).toContain("failed_regression_gate");
    expect(out.promotionAllowed).toBe(false);
  });

  it("PR-back verification returns canAutoMerge false and no network call metadata", () => {
    const service = createOriginEvolutionControlService();
    const out = service.verifyPrBack(
      {
        repo: "luca-dynamics/LucaOS",
        pullRequestNumber: 42,
        requiresOriginReview: true,
      },
      "origin",
    );

    expect(out.canAutoMerge).toBe(false);
    expect(out.metadata.networkVerificationAttempted).toBe(false);
  });

  it("Snapshot confirms all safety flags false", () => {
    const service = createOriginEvolutionControlService();
    const snapshot = service.getSnapshot();

    expect(snapshot.serviceKind).toBe("origin_evolution_control_service");
    expect(snapshot.originOnlyControlSurface).toBe(true);
    expect(snapshot.adapterOnly).toBe(true);
    expect(snapshot.runtimeBehaviorChanged).toBe(false);
    expect(snapshot.persistenceEnabled).toBe(false);
    expect(snapshot.optimizerExecutionEnabled).toBe(false);
    expect(snapshot.autonomousSelfModificationEnabled).toBe(false);
    expect(snapshot.existingEvolutionServiceCalled).toBe(false);
    expect(snapshot.autoApplyEnabled).toBe(false);
    expect(snapshot.networkCallsEnabled).toBe(false);
  });

  it("No method named approve/promote/apply/execute exists on the service", () => {
    const service = createOriginEvolutionControlService() as unknown as Record<string, unknown>;
    expect(typeof service.approve).toBe("undefined");
    expect(typeof service.promote).toBe("undefined");
    expect(typeof service.apply).toBe("undefined");
    expect(typeof service.execute).toBe("undefined");
  });
});

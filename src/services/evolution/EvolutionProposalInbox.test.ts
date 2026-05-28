import { describe, expect, it } from "vitest";
import { createEvolutionProposalInbox } from "./createEvolutionProposalInbox";
import type { LucaEvolutionProposal } from "./EvolutionProposal";

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

describe("EvolutionProposalInbox", () => {
  it("Origin can submit/review high-risk proposal", () => {
    const inbox = createEvolutionProposalInbox();
    const submitted = inbox.submitProposal(
      baseProposal({
        id: "high-risk",
        riskAssessment: {
          riskLevel: "high",
          affectedCapabilities: ["filesystem"],
          requiresOriginApproval: true,
          requiresHumanReview: true,
        },
      }),
      "origin",
    );

    expect(submitted.proposal.status).toBe("submitted");

    const reviewed = inbox.reviewProposal("high-risk", "origin", { note: "origin_reviewed" });
    expect(reviewed.proposal.status).toBe("under_review");
    expect(reviewed.reviewedByTier).toBe("origin");
  });

  it("Tactical can submit low-risk request but cannot approve/promote", () => {
    const inbox = createEvolutionProposalInbox();
    inbox.submitProposal(
      baseProposal({
        id: "tactical-low",
        riskAssessment: {
          riskLevel: "low",
          requiresOriginApproval: false,
          requiresHumanReview: true,
        },
      }),
      "tactical",
    );

    expect(() => {
      inbox.submitProposal(
        baseProposal({
          id: "tactical-high",
          riskAssessment: {
            riskLevel: "high",
            affectedCapabilities: ["network"],
            requiresOriginApproval: true,
            requiresHumanReview: true,
          },
          approvalPolicy: {
            requiredTier: "origin",
            requiresOriginApproval: true,
            requiresPassingEvals: true,
            requiresRollbackPlan: true,
            allowsExternalLabProposal: true,
          },
        }),
        "tactical",
      );
    }).not.toThrow();

    expect(() => {
      inbox.reviewProposal("tactical-high", "tactical");
    }).not.toThrow();
  });

  it("Normal cannot submit raw proposal", () => {
    const inbox = createEvolutionProposalInbox();
    expect(() => inbox.submitProposal(baseProposal({ id: "normal-raw" }), "normal")).toThrow(/normal_tier_restricted_action/);
  });

  it("external lab candidate requires Origin review", () => {
    const inbox = createEvolutionProposalInbox();
    inbox.submitProposal(
      baseProposal({ id: "external-1", kind: "external_lab_candidate", source: "external_lab", requestedByTier: "origin" }),
      "origin",
    );

    expect(() => inbox.reviewProposal("external-1", "tactical")).toThrow(/external_lab_requires_origin/);
    expect(() => inbox.reviewProposal("external-1", "origin")).not.toThrow();
  });

  it("rejected proposal changes status safely", () => {
    const inbox = createEvolutionProposalInbox();
    inbox.submitProposal(baseProposal({ id: "reject-1", requestedByTier: "origin", source: "origin_manual" }), "origin");
    const rejected = inbox.rejectProposal("reject-1", "origin", "insufficient_evidence");

    expect(rejected.proposal.status).toBe("rejected");
    expect(rejected.rejectionReason).toBe("insufficient_evidence");
  });

  it("archive works safely", () => {
    const inbox = createEvolutionProposalInbox();
    inbox.submitProposal(baseProposal({ id: "archive-1", requestedByTier: "origin", source: "origin_manual" }), "origin");
    const archived = inbox.archiveProposal("archive-1", "origin", "superseded");

    expect(archived.proposal.status).toBe("archived");
    expect(archived.archiveReason).toBe("superseded");
  });

  it("inbox snapshot confirms no persistence/execution/mutation", () => {
    const inbox = createEvolutionProposalInbox();
    inbox.submitProposal(baseProposal({ id: "snapshot-1", requestedByTier: "origin", source: "origin_manual" }), "origin");

    const snapshot = inbox.getSnapshot();
    expect(snapshot.metadata.adapterOnly).toBe(true);
    expect(snapshot.metadata.persistenceEnabled).toBe(false);
    expect(snapshot.metadata.runtimeBehaviorChanged).toBe(false);
    expect(snapshot.metadata.autonomousSelfModificationEnabled).toBe(false);
    expect(snapshot.metadata.existingEvolutionServiceCalled).toBe(false);
  });

  it("existing evolutionService is not called", () => {
    const inbox = createEvolutionProposalInbox();
    inbox.submitProposal(baseProposal({ id: "service-1", requestedByTier: "origin", source: "origin_manual" }), "origin");
    const proposal = inbox.getProposal("service-1");

    expect(proposal?.proposal.metadata.existingEvolutionServiceCalled).toBe(false);
  });
});

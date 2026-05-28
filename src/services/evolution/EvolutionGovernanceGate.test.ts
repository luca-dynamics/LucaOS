import { describe, expect, it } from "vitest";
import { evaluateEvolutionProposalGate } from "./EvolutionGovernanceGate";
import { createExternalLabCandidateProposal, createTacticalImprovementRequest } from "./EvolutionProposalMapping";

describe("EvolutionGovernanceGate", () => {
  it("tactical can submit but cannot promote high-risk proposal", () => {
    const proposal = createTacticalImprovementRequest({});
    proposal.riskAssessment = { riskLevel: "high", requiresHumanReview: true, requiresOriginApproval: true };
    const submit = evaluateEvolutionProposalGate({ proposal, requestedAction: "submit", actorTier: "tactical" });
    const promote = evaluateEvolutionProposalGate({ proposal, requestedAction: "promote", actorTier: "tactical" });
    expect(submit.allowed).toBe(true);
    expect(promote.allowed).toBe(false);
  });

  it("normal cannot submit/promote/rollback raw proposals", () => {
    const proposal = createTacticalImprovementRequest({});
    expect(evaluateEvolutionProposalGate({ proposal, requestedAction: "submit", actorTier: "normal" }).allowed).toBe(false);
    expect(evaluateEvolutionProposalGate({ proposal, requestedAction: "promote", actorTier: "normal" }).allowed).toBe(false);
    expect(evaluateEvolutionProposalGate({ proposal, requestedAction: "rollback", actorTier: "normal" }).allowed).toBe(false);
  });

  it("origin promotion blocked on eval failure or regression", () => {
    const proposal = createExternalLabCandidateProposal({});
    proposal.rollbackPlan = { rollbackAvailable: true };
    expect(evaluateEvolutionProposalGate({ proposal, requestedAction: "promote", actorTier: "origin", evalSummary: { evalRequired: true, evalPassed: false } }).allowed).toBe(false);
    expect(evaluateEvolutionProposalGate({ proposal, requestedAction: "promote", actorTier: "origin", evalSummary: { evalRequired: true, evalPassed: true, regressionDetected: true } }).allowed).toBe(false);
  });

  it("medium+ risk promotion blocked without rollback", () => {
    const proposal = createExternalLabCandidateProposal({ riskLevel: "medium" });
    proposal.rollbackPlan = { rollbackAvailable: false };
    const out = evaluateEvolutionProposalGate({ proposal, requestedAction: "promote", actorTier: "origin", evalSummary: { evalRequired: true, evalPassed: true } });
    expect(out.allowed).toBe(false);
    expect(out.blockedBy).toContain("missing_rollback_plan");
  });
});

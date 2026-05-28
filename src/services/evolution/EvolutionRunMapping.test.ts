import { describe, expect, it } from "vitest";
import { createCandidateVariantFromProposal, createEvolutionRunFromProposal, createExternalLabRunSnapshot, createPrBackMetadata } from "./EvolutionRunMapping";
import type { LucaEvolutionProposal } from "./EvolutionProposal";

const proposal: LucaEvolutionProposal = {
  id: "proposal_1",
  kind: "optimizer_candidate",
  status: "draft",
  title: "Optimize memory policy",
  summary: "Proposed memory policy optimization.",
  source: "external_lab",
  requestedByTier: "origin",
  proposedChanges: ["Tighten retention rules"],
  evidence: { traceMemoryItemIds: ["trace_1"], missionTapeIds: ["tape_1"] },
  evalSummary: { evalRequired: true, evalPassed: true, score: 0.95 },
  riskAssessment: { riskLevel: "medium", requiresOriginApproval: true, requiresHumanReview: true },
  rollbackPlan: { rollbackAvailable: true, rollbackSteps: ["Revert policy"] },
  createdAt: "2026-01-01T00:00:00.000Z",
  metadata: {
    contractKind: "luca_evolution_proposal",
    autonomousSelfModificationEnabled: false,
    runtimeBehaviorChanged: false,
    externalLabSupported: true,
    originGoverned: true,
  },
};

describe("EvolutionRunMapping", () => {
  it("run created from proposal preserves proposal and evidence refs", () => {
    const run = createEvolutionRunFromProposal(proposal, { id: "run_1" });
    expect(run.targetProposalId).toBe("proposal_1");
    expect(run.inputEvidence?.traceMemoryItemIds).toEqual(["trace_1"]);
    expect(run.optimizerEngine?.localExecutionAllowed).toBe(false);
    expect(run.optimizerEngine?.networkAllowed).toBe(false);
  });

  it("candidate created from proposal preserves proposed/eval/risk/rollback", () => {
    const candidate = createCandidateVariantFromProposal(proposal, { id: "candidate_1", runId: "run_1" });
    expect(candidate.proposedChanges).toEqual(["Tighten retention rules"]);
    expect(candidate.evalSummary).toEqual(proposal.evalSummary);
    expect(candidate.riskAssessment).toEqual(proposal.riskAssessment);
    expect(candidate.rollbackPlan).toEqual(proposal.rollbackPlan);
  });

  it("external lab run snapshot and pr-back metadata require Origin review", () => {
    const snapshot = createExternalLabRunSnapshot({ externalRepo: "https://github.com/luca-dynamics/LucaOS-self-evolution" });
    expect(snapshot.requiresOriginReview).toBe(true);
    expect(snapshot.optimizerEngine.localExecutionAllowed).toBe(false);
    expect(snapshot.optimizerEngine.networkAllowed).toBe(false);

    const prBack = createPrBackMetadata({ repo: "luca-dynamics/LucaOS", status: "created" });
    expect(prBack.requiresOriginReview).toBe(true);
  });
});

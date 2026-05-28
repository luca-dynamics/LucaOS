import { describe, expect, it } from "vitest";
import type { LucaUserTier } from "../../types/lucaUserTier";
import type { LucaTier } from "./EvolutionProposal";
import { evaluateEvolutionProposalGate } from "./EvolutionGovernanceGate";
import { buildEvolutionProposalFromSuggestion } from "./EvolutionProposalMapping";

describe("Evolution tier compatibility", () => {
  it("keeps LucaTier compatible with canonical LucaUserTier values used by evolution services", () => {
    const accepted: LucaTier[] = ["origin", "tactical", "normal"];
    const asUserTier: LucaUserTier[] = accepted;

    expect(asUserTier).toEqual(["origin", "tactical", "normal"]);
  });

  it("preserves normal tier restrictions for raw proposal submission and promote actions", () => {
    const proposal = buildEvolutionProposalFromSuggestion({
      id: "compat-normal-tier",
      title: "normal-tier check",
      suggestion: "proposal compatibility",
    });

    const submit = evaluateEvolutionProposalGate({ proposal, requestedAction: "submit", actorTier: "normal" });
    const promote = evaluateEvolutionProposalGate({ proposal, requestedAction: "promote", actorTier: "normal" });

    expect(submit.allowed).toBe(false);
    expect(promote.allowed).toBe(false);
    expect(submit.blockedBy).toContain("normal_tier_restricted_action");
    expect(promote.blockedBy).toContain("normal_tier_restricted_action");
  });
});

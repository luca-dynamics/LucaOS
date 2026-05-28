import { describe, expect, it } from "vitest";
import {
  createExternalLabCandidateProposal,
  createSkillUpdateProposalFromManifest,
  createTraceReflectionProposal,
} from "./EvolutionProposalMapping";

describe("EvolutionProposalMapping", () => {
  it("creates skill update proposal from manifest", () => {
    const proposal = createSkillUpdateProposalFromManifest({ id: "skill.a", version: "1.2.3", name: "Skill A" });
    expect(proposal.kind).toBe("skill_update");
    expect(proposal.targetSkillManifestId).toBe("skill.a");
    expect(proposal.approvalPolicy?.allowsRuntimeAutoApply).toBe(false);
  });

  it("preserves trace and mission evidence", () => {
    const proposal = createTraceReflectionProposal({
      title: "trace",
      traceMemoryItemIds: ["tr-1"],
      missionTapeIds: ["mt-1"],
    });
    expect(proposal.evidence?.traceMemoryItemIds).toEqual(["tr-1"]);
    expect(proposal.evidence?.missionTapeIds).toEqual(["mt-1"]);
  });

  it("external lab candidate requires origin approval", () => {
    const proposal = createExternalLabCandidateProposal({});
    expect(proposal.approvalPolicy?.requiresOriginApproval).toBe(true);
    expect(proposal.metadata.autonomousSelfModificationEnabled).toBe(false);
  });
});

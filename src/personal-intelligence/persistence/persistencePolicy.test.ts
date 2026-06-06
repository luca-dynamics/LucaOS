import { describe, expect, it } from "vitest";
import type { MemoryItem } from "../memory/memoryTypes";
import {
  createMemoryPersistenceProposal,
  evaluatePersistencePolicy,
  listPersistenceBlockers,
  requiresExplicitPersistenceApproval,
} from "./index";

const timestamp = "2026-06-06T12:00:00.000Z";

function proposalForZone(privacyZone: MemoryItem["privacyZone"]) {
  return createMemoryPersistenceProposal(
    {
      id: `memory-${privacyZone}`,
      kind: "preference",
      title: "Preference",
      content: "Concise updates",
      source: "policy-test",
      confidence: 0.9,
      privacyZone,
      tags: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      proposalId: `proposal-${privacyZone}`,
      proposedPath: `memory/${privacyZone}.json`,
      now: () => new Date(timestamp),
    },
  );
}

describe("persistence policy", () => {
  it.each(["credential", "financial", "health", "enterprise"] as const)(
    "%s proposals always require explicit approval",
    (zone) =>
      expect(requiresExplicitPersistenceApproval(proposalForZone(zone))).toBe(
        true,
      ),
  );

  it("allows policy-controlled private proposal review but never authorizes a write", () => {
    const proposal = proposalForZone("private");
    const evaluation = evaluatePersistencePolicy(proposal, {
      policyId: "private-review-policy",
      allowPrivateProposalReviewWithoutExplicitApproval: true,
    });

    expect(evaluation.allowedForProposalReview).toBe(true);
    expect(evaluation.explicitUserApprovalRequired).toBe(false);
    expect(evaluation.approvalRequired).toBe(true);
    expect(proposal.writePerformed).toBe(false);
  });

  it("blocks missing sources and forbidden serialized preview content", () => {
    const proposal = {
      ...proposalForZone("project"),
      source: "",
      serializedPreview: "api_key=do-not-transfer",
    };

    expect(listPersistenceBlockers(proposal)).toEqual(
      expect.arrayContaining([
        "A proposal source is required.",
        "Serialized previews must not include credentials.",
      ]),
    );
  });

  it("requires review for low-confidence proposals", () => {
    const evaluation = evaluatePersistencePolicy(
      { ...proposalForZone("public"), confidence: 0.4 },
      { policyId: "default" },
    );
    expect(evaluation.reviewRequired).toBe(true);
    expect(evaluation.warnings).toContain(
      "Low-confidence proposals require review.",
    );
  });
});

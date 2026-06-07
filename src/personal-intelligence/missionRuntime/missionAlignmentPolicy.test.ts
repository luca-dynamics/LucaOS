import { describe, expect, it } from "vitest";
import { evaluateMissionAlignment } from "./missionAlignmentPolicy";
import { safeMissionContextSnapshotFixture } from "./missionRuntimeFixtures";

const now = () => new Date("2026-06-07T12:00:00.000Z");

describe("evaluateMissionAlignment", () => {
  it("deterministically recognizes an aligned proposal when evidence is present", () => {
    const result = evaluateMissionAlignment({
      snapshot: safeMissionContextSnapshotFixture,
      proposalTitle: "Transparent project plan with milestones",
      proposalSummary: "Prepare a reviewable project plan with milestones and review evidence while keeping decisions transparent.",
      evidenceRefs: ["evidence:review-summary"],
      now,
    });
    expect(["aligned", "partially_aligned"]).toContain(result.alignmentStatus);
    expect(result.requiresUserReview).toBe(true);
    expect(result.sideEffectsPerformed).toBe(false);
  });

  it("blocks a constraint violation", () => {
    const result = evaluateMissionAlignment({
      snapshot: safeMissionContextSnapshotFixture,
      proposalTitle: "Execute changes",
      proposalSummary: "Execute project changes without explicit user approval.",
      proposedActions: ["Write files and run a shell command."],
      evidenceRefs: ["evidence:proposal"],
      now,
    });
    expect(["misaligned", "blocked"]).toContain(result.alignmentStatus);
    expect(result.violatedConstraints.length).toBeGreaterThan(0);
  });

  it("requires review for execution-heavy proposals without granting execution", () => {
    const result = evaluateMissionAlignment({
      snapshot: safeMissionContextSnapshotFixture,
      proposalTitle: "Install a package",
      proposalSummary: "Prepare a project plan, then install a package.",
      proposedActions: ["Install a package with a shell command."],
      evidenceRefs: ["evidence:proposal"],
      now,
    });
    expect(result.requiresUserReview).toBe(true);
    expect(result.warnings.join(" ")).toMatch(/does not approve/i);
    expect(result.sideEffectsPerformed).toBe(false);
  });

  it("returns needs_review when evidence is missing", () => {
    const result = evaluateMissionAlignment({
      snapshot: safeMissionContextSnapshotFixture,
      proposalTitle: "Project plan",
      proposalSummary: "Prepare a transparent project plan with milestones and review evidence.",
      now,
    });
    expect(result.alignmentStatus).toBe("needs_review");
  });
});

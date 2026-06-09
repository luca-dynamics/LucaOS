import { describe, expect, it } from "vitest";
import {
  activeProjectMemoryFixture,
  createMemoryGraphSummary,
  deviceMemoryFixture,
  filterActiveMemories,
  findConflictingMemories,
  getMemoryStaleness,
  personalMemoryGraphFixture,
  requiresMemoryApproval,
  sensitivePendingReviewMemoryFixture,
  summarizeMemoryGraph,
  temporaryContextMemoryFixture,
  validateMemoryGraph,
  canMemorySyncByDefault,
} from ".";
import type { PersonalMemoryGraph, PersonalMemoryNode } from ".";

const now = new Date("2026-06-09T12:00:00.000Z");

function withNodes(nodes: readonly PersonalMemoryNode[]): PersonalMemoryGraph {
  return { ...personalMemoryGraphFixture, nodes, edges: [] };
}

describe("Personal Intelligence memory graph foundation", () => {
  it("excludes forgotten and expired nodes from active filtering", () => {
    const forgotten = { ...activeProjectMemoryFixture, id: "memory:forgotten", lifecycle: "forgotten" as const };
    const expired = {
      ...activeProjectMemoryFixture,
      id: "memory:expired",
      expiresAt: "2026-06-09T11:59:59.000Z",
    };

    expect(filterActiveMemories(withNodes([activeProjectMemoryFixture, forgotten, expired]), now))
      .toEqual([activeProjectMemoryFixture]);
  });

  it("requires approval for inferred sensitive memory", () => {
    expect(requiresMemoryApproval(sensitivePendingReviewMemoryFixture)).toBe(true);
  });

  it.each(["sensitive", "secret"] as const)(
    "does not make %s memory sync-eligible by default",
    (sensitivity) => {
      const node: PersonalMemoryNode = {
        ...sensitivePendingReviewMemoryFixture,
        id: `memory:${sensitivity}:sync-check`,
        sensitivity,
        lifecycle: "active",
        approvalState: "approved",
        privacy: { localOnly: false, allowSync: true, redactValueInSummaries: true },
      };
      expect(canMemorySyncByDefault(node, now)).toBe(false);
    },
  );

  it("expires temporary context and reports its staleness deterministically", () => {
    expect(getMemoryStaleness(temporaryContextMemoryFixture, now)).toBe("fresh");
    expect(
      getMemoryStaleness(temporaryContextMemoryFixture, new Date("2026-06-10T10:00:00.000Z")),
    ).toBe("expired");
  });

  it("counts categories, sensitivity, and approval states without forgotten or expired details", () => {
    const summary = summarizeMemoryGraph(personalMemoryGraphFixture, now);
    expect(summary.total).toBe(8);
    expect(summary.active).toBe(7);
    expect(summary.byCategory.preference).toBe(2);
    expect(summary.byCategory.sensitive_fact).toBe(1);
    expect(summary.bySensitivity.sensitive).toBe(1);
    expect(summary.byApprovalState.requires_review).toBe(1);
  });

  it("finds explicit conflicts only when both memories are active", () => {
    const conflicts = findConflictingMemories(personalMemoryGraphFixture, now);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].edge.type).toBe("conflicts_with");
    expect(conflicts[0].from.category).toBe("preference");
    expect(conflicts[0].to.category).toBe("preference");
  });

  it("keeps raw sensitive detail out of the Basic summary", () => {
    const summary = createMemoryGraphSummary(personalMemoryGraphFixture, "basic", now);
    const serialized = JSON.stringify(summary);
    expect(summary.visibleMemories.some((item) => item.id === sensitivePendingReviewMemoryFixture.id)).toBe(false);
    expect(serialized).not.toContain(sensitivePendingReviewMemoryFixture.summary);
    expect(serialized).not.toContain("Pending private detail");
    expect(summary.visibleMemories.some((item) => item.id === deviceMemoryFixture.id)).toBe(false);
  });

  it("gives Pro more approved context while Creator exposes redacted audit metadata", () => {
    const pro = createMemoryGraphSummary(personalMemoryGraphFixture, "pro", now);
    const creator = createMemoryGraphSummary(personalMemoryGraphFixture, "creator", now);
    const creatorSensitive = creator.visibleMemories.find(
      (item) => item.id === sensitivePendingReviewMemoryFixture.id,
    );

    expect(pro.visibleMemories.some((item) => item.id === deviceMemoryFixture.id)).toBe(true);
    expect(pro.visibleMemories.some((item) => item.id === sensitivePendingReviewMemoryFixture.id)).toBe(false);
    expect(creatorSensitive).toMatchObject({
      redacted: true,
      source: "assistant_inferred",
      confidence: "low",
      approvalState: "requires_review",
    });
    expect(JSON.stringify(creatorSensitive)).not.toContain(sensitivePendingReviewMemoryFixture.summary);
    expect(creator.sideEffectsPerformed).toBe(false);
  });

  it("keeps all safe fixtures within graph invariants", () => {
    expect(validateMemoryGraph(personalMemoryGraphFixture)).toEqual([]);
  });
});

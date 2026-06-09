import { describe, expect, it } from "vitest";
import {
  continuityMemoryGraphFixture,
  continuityOpenTaskFixture,
  continuityPendingSensitiveFixture,
  continuityProjectFixture,
  createContinuitySnapshot,
} from ".";
import type { PersonalMemoryGraph, PersonalMemoryNode } from "../memoryGraph";

const now = new Date("2026-06-09T12:00:00.000Z");

function createSnapshot(mode: "basic" | "pro" | "creator" = "basic") {
  return createContinuitySnapshot(continuityMemoryGraphFixture, { mode, now });
}

describe("Personal Intelligence Continuity Engine", () => {
  it("generates a deterministic advisory snapshot from the supplied graph", () => {
    const first = createSnapshot("pro");
    const second = createSnapshot("pro");

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      graphId: continuityMemoryGraphFixture.graphId,
      generatedAt: now.toISOString(),
      sideEffectsPerformed: false,
    });
    expect(first.activeProject?.title).toBe("LucaOS Continuity Engine");
    expect(first.openTasks).toHaveLength(2);
    expect(first.recentDecisions[0]?.title).toBe("Continue with the Continuity Engine foundation");
    expect(first.handoffSummary.restoredContext).toContain(
      "Restore the fictional Memory Graph review context for the next work session.",
    );
  });

  it("selects the highest-scoring active project", () => {
    const olderProject: PersonalMemoryNode = {
      ...continuityProjectFixture,
      id: "memory:project:older-fixture",
      title: "Older fixture project",
      projectId: "project:older-fixture",
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
      lastUsedAt: "2025-01-01T00:00:00.000Z",
    };
    const graph: PersonalMemoryGraph = {
      ...continuityMemoryGraphFixture,
      nodes: [...continuityMemoryGraphFixture.nodes, olderProject],
    };

    expect(createContinuitySnapshot(graph, { now }).activeProject?.id).toBe(continuityProjectFixture.id);
  });

  it("extracts open tasks and marks graph-derived blockers", () => {
    const snapshot = createSnapshot("pro");
    const openTask = snapshot.openTasks.find((task) => task.id === continuityOpenTaskFixture.id);
    const blockedTask = snapshot.openTasks.find((task) => task.id === "memory:task:runtime-verification");

    expect(openTask?.blocked).toBe(false);
    expect(blockedTask?.blocked).toBe(true);
    expect(snapshot.blockers.map((blocker) => blocker.kind)).toEqual(
      expect.arrayContaining(["blocked_task", "dependency", "conflict"]),
    );
  });

  it("orders an unblocked open task before blocked work", () => {
    const snapshot = createSnapshot("pro");

    expect(snapshot.recommendedNextActions[0]).toMatchObject({
      taskId: continuityOpenTaskFixture.id,
      blocked: false,
    });
    expect(snapshot.recommendedNextActions.find((action) => action.blocked)).toBeDefined();
  });

  it("keeps Basic output friendly and omits diagnostics", () => {
    const snapshot = createSnapshot("basic");

    expect(snapshot.activeProject?.title).toBe("LucaOS Continuity Engine");
    expect(snapshot.openTasks.length).toBeGreaterThan(0);
    expect(snapshot.recommendedNextActions[0]?.title).toBe("Continue: Review Memory Graph foundation");
    expect(snapshot.handoffSummary.headline).toBe("Ready to continue LucaOS Continuity Engine");
    expect(snapshot.blockers).toEqual([]);
    expect(snapshot.staleContextWarnings).toEqual([]);
    expect(snapshot.privacyWarnings).toEqual([]);
    expect(snapshot.activeProject?.audit).toBeUndefined();
  });

  it("shows project structure, blockers, and warnings in Pro without audit internals", () => {
    const snapshot = createSnapshot("pro");

    expect(snapshot.activeProject?.openTaskCount).toBe(2);
    expect(snapshot.blockers.length).toBeGreaterThan(0);
    expect(snapshot.staleContextWarnings).toHaveLength(1);
    expect(snapshot.privacyWarnings).toHaveLength(1);
    expect(snapshot.openTasks.every((task) => task.audit === undefined)).toBe(true);
    expect(snapshot.privacyWarnings[0]?.relatedMemoryId).toBeUndefined();
  });

  it("adds safe graph-derived audit metadata in Creator", () => {
    const snapshot = createSnapshot("creator");
    const task = snapshot.openTasks.find((item) => item.id === continuityOpenTaskFixture.id);

    expect(snapshot.activeProject?.audit).toMatchObject({
      source: "project_context",
      confidence: "high",
      staleness: "fresh",
      reasoningFlags: ["selected_active_project"],
    });
    expect(task?.audit?.relationshipEvidence).toContainEqual({
      edgeId: "edge:continuity-task-project",
      type: "belongs_to_project",
      relatedNodeId: continuityProjectFixture.id,
    });
    expect(snapshot.privacyWarnings[0]?.audit?.reasoningFlags).toEqual([
      "approval_required",
      "content_redacted",
    ]);
  });

  it("redacts pending sensitive memory from every disclosure mode", () => {
    for (const mode of ["basic", "pro", "creator"] as const) {
      const serialized = JSON.stringify(createSnapshot(mode));
      expect(serialized).not.toContain(continuityPendingSensitiveFixture.title);
      expect(serialized).not.toContain(continuityPendingSensitiveFixture.summary);
      expect(serialized).not.toContain(String(continuityPendingSensitiveFixture.value));
    }
  });

  it.each(["basic", "pro", "creator"] as const)(
    "reports no side effects in %s mode",
    (mode) => {
      expect(createSnapshot(mode).sideEffectsPerformed).toBe(false);
    },
  );
});

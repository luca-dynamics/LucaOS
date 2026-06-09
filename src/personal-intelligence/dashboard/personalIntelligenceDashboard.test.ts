import { describe, expect, it } from "vitest";
import {
  continuityPendingSensitiveFixture,
} from "../continuity";
import {
  createPersonalIntelligenceDashboardDisclosure,
  createPersonalIntelligenceDashboardSummary,
  emptyPersonalIntelligenceDashboardGraphFixture,
  personalIntelligenceDashboardGraphFixture,
} from ".";

const now = new Date("2026-06-09T12:00:00.000Z");

function createDisclosure(mode: "basic" | "pro" | "creator") {
  const summary = createPersonalIntelligenceDashboardSummary(
    personalIntelligenceDashboardGraphFixture,
    { mode, now },
  );
  return createPersonalIntelligenceDashboardDisclosure(summary);
}

describe("Personal Intelligence dashboard summary", () => {
  it("composes continuity and memory review into a read-only summary", () => {
    const summary = createPersonalIntelligenceDashboardSummary(
      personalIntelligenceDashboardGraphFixture,
      { mode: "pro", now },
    );

    expect(summary).toMatchObject({
      mode: "pro",
      graphId: personalIntelligenceDashboardGraphFixture.graphId,
      activeProjectTitle: "LucaOS Continuity Engine",
      openTaskCount: 2,
      blockerCount: 3,
      previewOnly: true,
      sideEffectsPerformed: false,
      generatedAt: now.toISOString(),
    });
    expect(summary.nextActionTitle).toBeTruthy();
    expect(summary.memoryReviewCount).toBeGreaterThan(0);
    expect(summary.staleContextCount).toBeGreaterThan(0);
    expect(summary.privacyReviewCount).toBeGreaterThan(0);
  });

  it("keeps Basic friendly and hides diagnostics and raw IDs", () => {
    const disclosure = createDisclosure("basic");
    const serialized = JSON.stringify(disclosure);

    expect(disclosure.mode).toBe("basic");
    expect(serialized).toContain("Memory changes require your approval");
    expect(serialized).not.toContain("graphId");
    expect(serialized).not.toContain("reviewCountByReason");
    expect(serialized).not.toContain("protectedMemoryCount");
  });

  it("shows Pro operational counts without audit identifiers", () => {
    const disclosure = createDisclosure("pro");
    const serialized = JSON.stringify(disclosure);

    expect(disclosure).toMatchObject({
      mode: "pro",
      openTaskCount: 2,
      blockerCount: 3,
      previewOnly: true,
      sideEffectsPerformed: false,
    });
    expect(serialized).not.toContain("graphId");
    expect(serialized).not.toContain("reviewCountByReason");
  });

  it("shows Creator safe audit counts without memory or edge IDs", () => {
    const disclosure = createDisclosure("creator");
    const serialized = JSON.stringify(disclosure);

    expect(disclosure.mode).toBe("creator");
    if (disclosure.mode !== "creator") throw new Error("Expected Creator disclosure");
    expect(disclosure.graphId).toBe(personalIntelligenceDashboardGraphFixture.graphId);
    expect(disclosure.protectedMemoryCount).toBeGreaterThan(0);
    expect(disclosure.reviewCountByReason).toBeTruthy();
    expect(serialized).not.toContain(continuityPendingSensitiveFixture.id);
    expect(serialized).not.toContain("edge:blocked-sensitive-dependency");
  });

  it.each(["basic", "pro", "creator"] as const)(
    "never serializes protected titles or values in %s disclosure",
    (mode) => {
      const serialized = JSON.stringify(createDisclosure(mode));

      expect(serialized).not.toContain(continuityPendingSensitiveFixture.title);
      expect(serialized).not.toContain(continuityPendingSensitiveFixture.summary);
      expect(serialized).not.toContain(String(continuityPendingSensitiveFixture.value));
    },
  );

  it.each(["basic", "pro", "creator"] as const)(
    "always reports preview-only, side-effect-free posture in %s mode",
    (mode) => {
      const summary = createPersonalIntelligenceDashboardSummary(
        personalIntelligenceDashboardGraphFixture,
        { mode, now },
      );
      const disclosure = createPersonalIntelligenceDashboardDisclosure(summary);

      expect(summary.previewOnly).toBe(true);
      expect(summary.sideEffectsPerformed).toBe(false);
      expect(disclosure.previewOnly).toBe(true);
      expect(disclosure.sideEffectsPerformed).toBe(false);
    },
  );

  it("produces a safe empty state for an empty supplied graph", () => {
    const summary = createPersonalIntelligenceDashboardSummary(
      emptyPersonalIntelligenceDashboardGraphFixture,
      { mode: "basic", now },
    );

    expect(summary).toMatchObject({
      activeProjectTitle: null,
      nextActionTitle: null,
      openTaskCount: 0,
      blockerCount: 0,
      memoryReviewCount: 0,
      privacyReviewCount: 0,
      staleContextCount: 0,
      protectedMemoryCount: 0,
      previewOnly: true,
      sideEffectsPerformed: false,
    });
  });
});

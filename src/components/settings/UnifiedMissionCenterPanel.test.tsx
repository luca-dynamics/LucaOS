// @vitest-environment jsdom
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { UnifiedMissionCenterPanel } from "./UnifiedMissionCenterPanel";

const sources = import.meta.glob(["./UnifiedMissionCenterPanel.tsx"], {
  eager: true,
  import: "default",
  query: "?raw",
}) as Record<string, string>;

describe("UnifiedMissionCenterPanel", () => {
  it("renders mission center shell and shared completion copy", () => {
    const markup = renderToStaticMarkup(<UnifiedMissionCenterPanel />);
    expect(markup).toContain("Mission Center");
    expect(markup).toContain("completeMissionWithVerification");
    expect(markup).toContain("Workforce and computer-use");
    expect(markup).toContain("start mission");
  });

  it("uses gated complete, not raw archive-only completion", () => {
    const file = sources["./UnifiedMissionCenterPanel.tsx"] || "";
    expect(file).toContain("completeMissionWithVerification");
    expect(file).toContain("Complete with verification");
    expect(file).toContain("Verification tape");
    expect(file).toContain("startMission");
    expect(file).toContain("addGoal");
    expect(file).not.toMatch(/archiveMission\s*\(/);
  });
});

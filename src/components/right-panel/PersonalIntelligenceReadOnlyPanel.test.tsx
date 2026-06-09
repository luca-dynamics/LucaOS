// @vitest-environment jsdom
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  personalIntelligenceDashboardGraphFixture,
} from "../../personal-intelligence/dashboard";
import { continuityPendingSensitiveFixture } from "../../personal-intelligence/continuity";
import { PersonalIntelligenceReadOnlyPanel } from "./PersonalIntelligenceReadOnlyPanel";

const now = new Date("2026-06-09T12:00:00.000Z");
const sources = import.meta.glob(
  [
    "./PersonalIntelligenceReadOnlyPanel.tsx",
    "../../personal-intelligence/dashboard/personalIntelligenceDashboardHelpers.ts",
  ],
  { eager: true, import: "default", query: "?raw" },
) as Record<string, string>;

describe("PersonalIntelligenceReadOnlyPanel", () => {
  it.each(["basic", "pro", "creator"] as const)(
    "renders the %s read-only disclosure without protected content",
    (mode) => {
      const markup = renderToStaticMarkup(
        <PersonalIntelligenceReadOnlyPanel
          graph={personalIntelligenceDashboardGraphFixture}
          mode={mode}
          now={now}
          fixture
        />,
      );

      expect(markup).toContain("Personal Intelligence");
      expect(markup).toContain("Preview only");
      expect(markup).toContain("No memory changes have been applied");
      expect(markup).toContain("Safe fictional preview");
      expect(markup).not.toContain(continuityPendingSensitiveFixture.title);
      expect(markup).not.toContain(String(continuityPendingSensitiveFixture.value));
    },
  );

  it("keeps Basic free of Creator audit details", () => {
    const markup = renderToStaticMarkup(
      <PersonalIntelligenceReadOnlyPanel
        graph={personalIntelligenceDashboardGraphFixture}
        mode="basic"
        now={now}
      />,
    );

    expect(markup).toContain("Memory changes require your approval");
    expect(markup).not.toContain(personalIntelligenceDashboardGraphFixture.graphId);
    expect(markup).not.toContain("Safe audit view");
  });

  it("has no persistence, capture, model, tool, or browser storage dependency", () => {
    const source = Object.values(sources).join("\n");

    expect(source).not.toMatch(/memoryService|modelRouter|toolService/i);
    expect(source).not.toMatch(/\b(localStorage|sessionStorage|indexedDB|fetch|WebSocket|EventSource)\b/);
    expect(source).not.toMatch(/\b(node:fs|child_process|electron|ipcRenderer|ipcMain)\b/);
    expect(source).not.toMatch(/useEffect\s*\(/);
  });
});

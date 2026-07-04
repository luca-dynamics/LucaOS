// @vitest-environment jsdom
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PersonalIntelligenceMissionRuntimePanel } from "./PersonalIntelligenceMissionRuntimePanel";

const sources = import.meta.glob(
  ["./PersonalIntelligenceMissionRuntimePanel.tsx", "../../personal-intelligence/missionRuntime/*.ts"],
  { eager: true, import: "default", query: "?raw" },
) as Record<string, string>;

const forbidden = [
  /memoryService/i,
  /saveMemory\s*\(/i,
  /governedMemoryAdapter/i,
  /liveWrite/i,
  /services\/lucaLink/i,
  /modelRouter/i,
  /executeSkill|invokeTool|runWorkflow|modelcontextprotocol/i,
  /from\s+["'](?:node:)?fs(?:\/promises)?["']/,
  /from\s+["'](?:node:)?child_process["']/,
  /\bfetch\s*\(/,
  /new\s+WebSocket\s*\(/,
  /socket\.io-client/,
  /\b(?:localStorage|sessionStorage|indexedDB)\s*\./,
  /\b(?:ipcRenderer|ipcMain)\s*\./,
  /\b(?:playwright|puppeteer|selenium)\b/i,
  /VisualCore|LucaBrowser/,
];

describe("PersonalIntelligenceMissionRuntimePanel", () => {
  it("renders advisory, alignment, collaborative, and readiness boundaries", () => {
    const markup = renderToStaticMarkup(<PersonalIntelligenceMissionRuntimePanel />);
    expect(markup).toContain("Mission Profile Advisory Runtime");
    expect(markup).toContain("Advisory only — no autonomous execution");
    expect(markup).toContain("Mission alignment is not approval");
    expect(markup).toContain("No memory write, no model routing change, no tool execution");
    expect(markup).toContain("Collaborative next steps");
    expect(markup).toContain("Autonomous execution enabled: false");
  });

  it("loads the mission read-only: no mutation, no click actions, no writes", () => {
    const component = sources["./PersonalIntelligenceMissionRuntimePanel.tsx"];
    // A read-only load effect is allowed (it reads the active mission); the
    // panel must never mutate the mission, act on a click, or write anything.
    expect(component).toContain("getActiveMission");
    expect(component).not.toMatch(
      /startMission|addGoal|updateGoalStatus|archiveMission/,
    );
    expect(component).not.toMatch(/onClick\s*=/);
    expect(component).not.toMatch(/saveMemory|liveWrite/i);
  });

  it("keeps production mission runtime and UI sources free of forbidden APIs", () => {
    for (const [file, source] of Object.entries(sources).filter(([file]) => !file.includes(".test."))) {
      for (const pattern of forbidden) expect(source, `${file} matched ${pattern}`).not.toMatch(pattern);
    }
  });
});

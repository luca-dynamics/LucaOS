// @vitest-environment jsdom
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PersonalIntelligenceRuntimeTracePanel } from "./PersonalIntelligenceRuntimeTracePanel";

const sources = import.meta.glob(
  [
    "./PersonalIntelligenceRuntimeTracePanel.tsx",
    "../../personal-intelligence/runtime/*.ts",
  ],
  { eager: true, import: "default", query: "?raw" },
) as Record<string, string>;

const componentSource = sources["./PersonalIntelligenceRuntimeTracePanel.tsx"];

function productionSources() {
  return Object.entries(sources).filter(([file]) => !file.includes(".test."));
}

describe("PersonalIntelligenceRuntimeTracePanel", () => {
  it("renders doctrine stages, evidence posture, learning preview, and readiness", () => {
    const markup = renderToStaticMarkup(<PersonalIntelligenceRuntimeTracePanel />);

    expect(markup).toContain("Runtime Trace + Learning Events");
    expect(markup).toContain("Sense");
    expect(markup).toContain("Understand");
    expect(markup).toContain("Plan");
    expect(markup).toContain("Approve");
    expect(markup).toContain("Act");
    expect(markup).toContain("Verify");
    expect(markup).toContain("Learn");
    expect(markup).toContain("Side effects performed: false");
    expect(markup).toContain("no memory write, no prompt update, no model routing change");
    expect(markup).toContain("Learning event preview");
    expect(markup).toContain("Proposal-ready");
    expect(markup).toContain("Neither status grants execution or write authority");
  });

  it("has no render-time writes, execution calls, or runtime mutation dependencies", () => {
    expect(componentSource).not.toMatch(/useEffect\s*\(/);
    expect(componentSource).not.toMatch(/from\s+["'][^"']*memoryService/i);
    expect(componentSource).not.toContain(".saveMemory(");
    expect(componentSource).not.toMatch(/services\/lucaLink/i);
    expect(componentSource).not.toMatch(/provider|modelRouter|executeSkill|invokeTool|runWorkflow/i);
    expect(componentSource).not.toMatch(/\b(localStorage|sessionStorage|indexedDB|fetch|WebSocket|EventSource)\b/);
    expect(componentSource).not.toMatch(/\b(node:fs|child_process|electron|ipcRenderer|ipcMain)\b/);
  });

  it("keeps every production runtime source free of persistence and execution APIs", () => {
    for (const [, source] of productionSources()) {
      expect(source).not.toMatch(/from\s+["'][^"']*services\/memoryService/i);
      expect(source).not.toMatch(/memoryService\.saveMemory\s*\(/);
      expect(source).not.toMatch(/from\s+["'][^"']*services\/lucaLink/i);
      expect(source).not.toMatch(/from\s+["'](?:node:)?fs(?:\/promises)?["']/);
      expect(source).not.toMatch(/from\s+["'](?:node:)?child_process["']/);
      expect(source).not.toMatch(/\bfetch\s*\(/);
      expect(source).not.toMatch(/new\s+WebSocket\s*\(/);
      expect(source).not.toMatch(/from\s+["']socket\.io-client["']/);
      expect(source).not.toMatch(/\b(?:localStorage|sessionStorage|indexedDB)\s*\./);
      expect(source).not.toMatch(/\b(?:ipcRenderer|ipcMain)\s*\./);
      expect(source).not.toMatch(/\b(?:playwright|puppeteer|selenium)\b/i);
      expect(source).not.toMatch(/VisualCore|LucaBrowser/);
    }
  });
});

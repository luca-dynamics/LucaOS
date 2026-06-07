import { describe, expect, it } from "vitest";
import { SAFE_MEMORY_APPROVAL_DRY_RUN_TRACE_FIXTURE, SAFE_USER_FEEDBACK_LEARNING_EVENT_FIXTURE } from "./runtimeTraceFixtures";
import { summarizeRuntimeTraceReadiness } from "./runtimeTraceReadiness";

const sources = import.meta.glob("./*.ts", { eager: true, import: "default", query: "?raw" }) as Record<string, string>;

describe("runtimeTraceReadiness", () => {
  it("summarizes recording and proposal readiness without implying persistence", () => {
    const readiness = summarizeRuntimeTraceReadiness(
      [SAFE_MEMORY_APPROVAL_DRY_RUN_TRACE_FIXTURE],
      [SAFE_USER_FEEDBACK_LEARNING_EVENT_FIXTURE],
    );
    expect(readiness.readyForRuntimeRecording).toBe(true);
    expect(readiness.readyForPersistenceProposal).toBe(true);
    expect(readiness.learningEventsReadyForProposal).toBe(1);
    expect(readiness.warnings.join(" ")).toContain("does not authorize execution or persistence");
    expect(SAFE_USER_FEEDBACK_LEARNING_EVENT_FIXTURE.persisted).toBe(false);
  });

  it("keeps runtime production sources free from direct side-effect APIs", () => {
    for (const [file, source] of Object.entries(sources)) {
      if (file.includes(".test.")) continue;
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
      expect(source).not.toMatch(/executeSkill|invokeTool|runWorkflow|modelRouter|providerRouter/i);
      expect(source).not.toMatch(/VisualCore|LucaBrowser/);
    }
  });
});

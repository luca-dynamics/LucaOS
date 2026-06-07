import { describe, expect, it } from "vitest";
import approvalSource from "./skillSandboxApproval.ts?raw";
import fixturesSource from "./skillSandboxFixtures.ts?raw";
import permissionsSource from "./skillSandboxPermissions.ts?raw";
import planSource from "./skillSandboxPlan.ts?raw";
import policySource from "./skillSandboxPolicy.ts?raw";
import readinessSource from "./skillSandboxReadiness.ts?raw";
import traceSource from "./skillSandboxTraceBridge.ts?raw";
import typesSource from "./skillSandboxTypes.ts?raw";
import panelSource from "../../components/SkillSandboxPlanPanel.tsx?raw";
import registryPanelSource from "../../components/SkillRegistryPanel.tsx?raw";

const sources = [approvalSource, fixturesSource, permissionsSource, planSource, policySource, readinessSource, traceSource, typesSource, panelSource, registryPanelSource];
const forbiddenUsage = [
  /from\s+["'][^"']*memoryService/, /saveMemory\s*\(/, /governedMemoryAdapter/, /liveWrite/i,
  /from\s+["'][^"']*services\/lucaLink/i, /from\s+["'][^"']*(provider|modelRouter)/i,
  /from\s+["'][^"']*(mcp|toolExecution|workflowExecution)/i,
  /from\s+["'](?:node:)?fs(?:\/promises)?["']/, /from\s+["'](?:node:)?child_process["']/,
  /\bfetch\s*\(/, /new\s+WebSocket\s*\(/, /from\s+["']socket\.io-client["']/,
  /\b(localStorage|sessionStorage|indexedDB)\b/, /electron.*ipc|ipcRenderer|ipcMain/i,
  /import\s*\(.*entrypointRef/i, /\beval\s*\(/, /new\s+Function\s*\(/, /new\s+Worker\s*\(/,
  /from\s+["'](?:node:)?vm["']/, /playwright|puppeteer/i,
  /VisualCore.*(?:set|mutate|update)|LucaBrowser.*(?:set|mutate|update)/i,
];

describe("skill sandbox source safety", () => {
  it.each(forbiddenUsage)("does not use forbidden runtime API %s", (pattern) => {
    for (const source of sources) expect(source).not.toMatch(pattern);
  });
});

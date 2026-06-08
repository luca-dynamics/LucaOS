import { describe, expect, it } from "vitest";
import typesSource from "./skillDryRunTypes.ts?raw";
import policySource from "./skillDryRunPolicy.ts?raw";
import planSource from "./skillDryRunPlan.ts?raw";
import simulatorSource from "./skillDryRunSimulator.ts?raw";
import traceSource from "./skillDryRunTraceBridge.ts?raw";
import readinessSource from "./skillDryRunReadiness.ts?raw";
import fixturesSource from "./skillDryRunFixtures.ts?raw";
import panelSource from "../../components/SkillDryRunPanel.tsx?raw";
import registryPanelSource from "../../components/SkillRegistryPanel.tsx?raw";
import bridgeSource from "../../operation-center/operationCenterBridge.ts?raw";

const sources = [typesSource, policySource, planSource, simulatorSource, traceSource, readinessSource, fixturesSource, panelSource, registryPanelSource, bridgeSource];
const forbiddenUsage = [
  /from\s+["'][^"']*memoryService/, /saveMemory\s*\(/, /governedMemoryAdapter/, /liveWrite/i,
  /lucaLinkService\.send/, /from\s+["'][^"']*services\/lucaLink\/(?!adapterFileInstallPermissions)/i, /from\s+["'][^"']*(provider|modelRouter)/i,
  /from\s+["'][^"']*(mcp|toolExecution|workflowExecution)/i,
  /from\s+["'](?:node:)?fs(?:\/promises)?["']/, /from\s+["'](?:node:)?child_process["']/,
  /\bfetch\s*\(/, /new\s+WebSocket\s*\(/, /from\s+["']socket\.io-client["']/,
  /\b(localStorage|sessionStorage|indexedDB)\b/, /electron.*ipc|ipcRenderer|ipcMain/i,
  /import\s*\(.*entrypointRef/i, /\beval\s*\(/, /new\s+Function\s*\(/, /new\s+Worker\s*\(/,
  /from\s+["'](?:node:)?vm["']/, /playwright|puppeteer/i,
  /VisualCore.*(?:set|mutate|update)|LucaBrowser.*(?:set|mutate|update)/i,
];

describe("skill dry-run source safety", () => {
  it.each(forbiddenUsage)("does not use forbidden runtime API %s", (pattern) => {
    for (const source of sources) expect(source).not.toMatch(pattern);
  });
});

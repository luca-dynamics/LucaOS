import { describe, expect, it } from "vitest";
import manifestValidationSource from "./skillManifestValidation.ts?raw";
import permissionPolicySource from "./skillPermissionPolicy.ts?raw";
import registrySource from "./skillRegistry.ts?raw";
import readinessSource from "./skillReadiness.ts?raw";
import fixturesSource from "./skillRegistryFixtures.ts?raw";
import registryPanelSource from "../../components/SkillRegistryPanel.tsx?raw";
import skillsModalSource from "../../components/SkillsMatrix.tsx?raw";

const sources = [manifestValidationSource, permissionPolicySource, registrySource, readinessSource, fixturesSource, registryPanelSource, skillsModalSource];
const forbiddenUsage = [
  /from\s+["'][^"']*memoryService/, /saveMemory\s*\(/, /governedMemoryAdapter/, /liveWrite/i,
  /from\s+["'][^"']*services\/lucaLink/i, /from\s+["'][^"']*(provider|modelRouter)/i,
  /from\s+["'](?:node:)?fs(?:\/promises)?["']/, /from\s+["']child_process["']/,
  /\bfetch\s*\(/, /new\s+WebSocket\s*\(/, /from\s+["']socket\.io-client["']/,
  /\b(localStorage|sessionStorage|indexedDB)\b/, /electron.*ipc|ipcRenderer|ipcMain/i,
  /\b(eval|Function)\s*\(/, /import\s*\(.*entrypoint/i,
  /VisualCore.*(?:set|mutate|update)|LucaBrowser.*(?:set|mutate|update)/i,
];

describe("skill registry source safety", () => {
  it.each(forbiddenUsage)("does not use forbidden runtime API %s", (pattern) => {
    for (const source of sources) expect(source).not.toMatch(pattern);
  });
});

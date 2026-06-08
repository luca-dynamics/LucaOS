import auditSource from "./operationCenterAudit.ts?raw";
import bridgeSource from "./operationCenterBridge.ts?raw";
import fixturesSource from "./operationCenterFixtures.ts?raw";
import indexSource from "./index.ts?raw";
import readinessSource from "./operationCenterReadiness.ts?raw";
import typesSource from "./operationCenterTypes.ts?raw";
import componentSource from "../components/right-panel/OperationPermissionCenter.tsx?raw";
import fileInstallFixturesSource from "../services/lucaLink/adapterFileInstallPermissions/adapterFileInstallPermissionFixtures.ts?raw";
import fileInstallTypesSource from "../services/lucaLink/adapterFileInstallPermissions/adapterFileInstallPermissionTypes.ts?raw";
import fileInstallIndexSource from "../services/lucaLink/adapterFileInstallPermissions/index.ts?raw";
import { describe, expect, it } from "vitest";
import { operationCenterFixtureItems } from "./operationCenterFixtures";

const productionSources = [auditSource, bridgeSource, fixturesSource, indexSource, readinessSource, typesSource, componentSource, fileInstallFixturesSource, fileInstallTypesSource, fileInstallIndexSource];

const forbiddenPatterns = [
  /memoryService/,
  /saveMemory/,
  /governedMemoryAdapter/,
  /liveWrite/i,
  /lucaLinkService/,
  /socket\.emit/,
  /socket\.io-client/,
  /\bWebSocket\b/,
  /RTCPeerConnection/,
  /\bfetch\s*\(/,
  /from\s+["'](?:node:)?fs(?:\/promises)?["']/,
  /child_process/,
  /from\s+["'](?:node:)?(?:fs|child_process|vm)["']/,
  /\b(?:npm|yarn|pnpm|bun)\s+(?:add|install)\b/i,
  /localStorage|sessionStorage|indexedDB/,
  /electron.*ipc|ipcRenderer|ipcMain/i,
  /\beval\s*\(|new\s+Function|new\s+Worker|\bVM\b/,
  /playwright|puppeteer|selenium/i,
  /modelRouter|modelProvider/i,
  /collectLiveSensors|startSensorCollection|sensorService/i,
];

describe("operation center fixtures and source safety", () => {
  it("contains representative harmless PI and LucaLink summaries", () => {
    const categories = new Set(operationCenterFixtureItems.map((item) => item.category));
    expect(categories.has("memory_approval")).toBe(true);
    expect(categories.has("runtime_trace")).toBe(true);
    expect(categories.has("skill_sandbox")).toBe(true);
    expect(categories.has("skill_permission_gate")).toBe(true);
    expect(categories.has("adapter_sandbox")).toBe(true);
    expect(categories.has("web_display")).toBe(true);
    expect(categories.has("sensor_bridge")).toBe(true);
    expect(categories.has("transport_permission")).toBe(true);
    expect(operationCenterFixtureItems.every((item) => item.sideEffectsPerformed === false && item.canExecute === false)).toBe(true);
    const gateStatuses = operationCenterFixtureItems.filter((item) => item.category === "skill_permission_gate").map((item) => item.status);
    expect(gateStatuses).toEqual(expect.arrayContaining(["pending", "granted_for_review", "denied", "blocked"]));
  });

  it("uses real adapter file/install decisions instead of the unavailable placeholder", () => {
    const items = operationCenterFixtureItems.filter((candidate) => candidate.category === "adapter_file_install");
    expect(items.map((item) => item.status)).toEqual(expect.arrayContaining([
      "ready_for_review",
      "approval_required",
      "blocked",
      "unsupported",
    ]));
    expect(items.every((item) => item.sideEffectsPerformed === false && item.readyForExecution === false)).toBe(true);
    expect(items.some((item) => item.status === "disabled")).toBe(false);
    expect(items.flatMap((item) => item.warnings).some((warning) => warning.includes("not available"))).toBe(false);
  });

  it("does not import or call forbidden runtime APIs in production sources", () => {
    for (const source of productionSources) {
      for (const pattern of forbiddenPatterns) expect(source, `production source matched ${pattern}`).not.toMatch(pattern);
    }
  });
});

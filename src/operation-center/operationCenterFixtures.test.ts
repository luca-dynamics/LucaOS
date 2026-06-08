import auditSource from "./operationCenterAudit.ts?raw";
import bridgeSource from "./operationCenterBridge.ts?raw";
import fixturesSource from "./operationCenterFixtures.ts?raw";
import indexSource from "./index.ts?raw";
import readinessSource from "./operationCenterReadiness.ts?raw";
import typesSource from "./operationCenterTypes.ts?raw";
import componentSource from "../components/right-panel/OperationPermissionCenter.tsx?raw";
import { describe, expect, it } from "vitest";
import { operationCenterFixtureItems } from "./operationCenterFixtures";

const productionSources = [auditSource, bridgeSource, fixturesSource, indexSource, readinessSource, typesSource, componentSource];

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
    expect(categories.has("lucalink_dry_run")).toBe(true);
    expect(categories.has("lucalink_runtime_authority")).toBe(true);
    expect(operationCenterFixtureItems.every((item) => item.sideEffectsPerformed === false && item.canExecute === false)).toBe(true);
    const gateStatuses = operationCenterFixtureItems.filter((item) => item.category === "skill_permission_gate").map((item) => item.status);
    expect(gateStatuses).toEqual(expect.arrayContaining(["pending", "granted_for_review", "denied", "blocked"]));
  });

  it("includes non-executable LucaLink runtime authority fixtures", () => {
    const items = operationCenterFixtureItems.filter((item) => item.category === "lucalink_runtime_authority");
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((item) => !item.executionEnabled && !item.canExecute && !item.sideEffectsPerformed)).toBe(true);
    expect(items.map((item) => item.status)).toEqual(expect.arrayContaining(["blocked", "approval_required", "unsupported"]));
  });

  it("uses real read-only adapter file/install fixture decisions", () => {
    const items = operationCenterFixtureItems.filter((item) => item.category === "adapter_file_install");
    const statuses = items.map((item) => item.status);

    expect(statuses).toEqual(expect.arrayContaining([
      "ready_for_review",
      "approval_required",
      "blocked",
      "unsupported",
    ]));
    expect(items.some((item) => item.status === "disabled")).toBe(false);
    expect(items.some((item) =>
      `${item.title} ${item.summary} ${item.warnings.join(" ")}`.includes("Adapter file/install model not available yet")
    )).toBe(false);
    expect(items.every((item) =>
      item.sideEffectsPerformed === false
      && item.executionEnabled === false
      && item.canExecute === false
      && item.readyForExecution === false
    )).toBe(true);
  });

  it("keeps adapter file/install production declarations and imports unique", () => {
    expect(bridgeSource.match(/createOperationItemsFromAdapterFileInstallDecisions\s*=/g)).toHaveLength(1);
    expect(fixturesSource.match(/const fileInstallItems\s*=/g)).toHaveLength(1);
    expect(fixturesSource.match(/LUCA_LINK_ADAPTER_FILE_INSTALL_PERMISSION_FIXTURE_DECISIONS/g)).toHaveLength(2);
  });

  it("does not import or call forbidden runtime APIs in production sources", () => {
    for (const source of productionSources) {
      for (const pattern of forbiddenPatterns) expect(source, `production source matched ${pattern}`).not.toMatch(pattern);
    }
  });
  it("includes skill dry-run fixture cards", () => {
    expect(operationCenterFixtureItems.some((item) => item.category === "skill_dry_run")).toBe(true);
  });
});

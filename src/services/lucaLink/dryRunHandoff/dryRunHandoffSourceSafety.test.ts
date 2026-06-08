import policySource from "./dryRunHandoffPolicy.ts?raw";
import planSource from "./dryRunHandoffPlan.ts?raw";
import simulatorSource from "./dryRunHandoffSimulator.ts?raw";
import readinessSource from "./dryRunHandoffReadiness.ts?raw";
import auditSource from "./dryRunHandoffAudit.ts?raw";
import fixturesSource from "./dryRunHandoffFixtures.ts?raw";
import componentSource from "../../../components/settings/SettingsLucaLinkDryRunHandoff.tsx?raw";
import { describe, expect, it } from "vitest";

const sources = [policySource, planSource, simulatorSource, readinessSource, auditSource, fixturesSource, componentSource];
const forbidden = [
  /lucaLinkService/, /socket\.emit/, /socket\.io-client/, /\bWebSocket\b/, /RTCPeerConnection/, /\bfetch\s*\(/,
  /from\s+["'](?:node:)?fs(?:\/promises)?["']/, /child_process/, /localStorage|sessionStorage|indexedDB/,
  /ipcRenderer|ipcMain/, /\beval\s*\(|new\s+Function|new\s+Worker|\bVM\b/, /playwright|puppeteer|selenium/i,
  /personal-intelligence/, /modelRouter|modelProvider/i, /collectLiveSensors|startSensorCollection|sensorService/i,
  /navigator\.(?:camera|mediaDevices|geolocation|clipboard|contacts)/, /import\s*\(/,
];

describe("LucaLink dry-run production source safety", () => {
  it("does not import or call forbidden runtime APIs", () => {
    for (const source of sources) for (const pattern of forbidden) expect(source, `source matched ${pattern}`).not.toMatch(pattern);
  });
});

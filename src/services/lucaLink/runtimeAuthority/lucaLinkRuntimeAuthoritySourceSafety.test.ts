import policySource from "./lucaLinkRuntimeAuthorityPolicy.ts?raw";
import registrySource from "./lucaLinkRuntimeAuthorityRegistry.ts?raw";
import evidenceSource from "./lucaLinkRuntimeAuthorityEvidence.ts?raw";
import readinessSource from "./lucaLinkRuntimeAuthorityReadiness.ts?raw";
import fixturesSource from "./lucaLinkRuntimeAuthorityFixtures.ts?raw";
import componentSource from "../../../components/settings/SettingsLucaLinkRuntimeAuthority.tsx?raw";
import lucaLinkBridgeSource from "../../../operation-center/operationCenterLucaLinkRuntimeAuthorityBridge.ts?raw";
import { describe, expect, it } from "vitest";

const productionSources = [policySource, registrySource, evidenceSource, readinessSource, fixturesSource, componentSource, lucaLinkBridgeSource];
const forbidden = [
  /lucaLinkService/, /socket\.emit/, /socket\.io-client/, /\bWebSocket\b/, /RTCPeerConnection/, /\bfetch\s*\(/,
  /from\s+["'](?:node:)?fs(?:\/promises)?["']/, /child_process/, /localStorage|sessionStorage|indexedDB/,
  /ipcRenderer|ipcMain/, /\beval\s*\(|new\s+Function|new\s+Worker|\bVM\b/, /playwright|puppeteer|selenium/i,
  /personal-intelligence/, /modelRouter|modelProvider/i, /collectLiveSensors|startSensorCollection|sensorService/i,
  /navigator\.(?:camera|mediaDevices|geolocation|clipboard|contacts)/, /import\s*\(/,
  /executeAdapter|adapterEntrypoint|packageManager|npm\s+install|yarn\s+add|pnpm\s+add/i,
];

describe("LucaLink runtime authority production source safety", () => {
  it("does not import or call forbidden runtime APIs", () => {
    for (const source of productionSources) {
      for (const pattern of forbidden) expect(source, `production source matched ${pattern}`).not.toMatch(pattern);
    }
  });
});

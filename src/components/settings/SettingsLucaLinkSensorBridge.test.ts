// @vitest-environment jsdom
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SettingsLucaLinkSensorBridge } from "./SettingsLucaLinkSensorBridge";
import sensorBridgeUiSource from "./SettingsLucaLinkSensorBridge.tsx?raw";
import lucaLinkSettingsSource from "./SettingsLucaLinkTab.tsx?raw";

const sensorSources = import.meta.glob("../../services/lucaLink/sensors/*.ts", {
  eager: true,
  import: "default",
  query: "?raw",
}) as Record<string, string>;
const productionSources = {
  ...Object.fromEntries(
    Object.entries(sensorSources).filter(([file]) => !file.includes(".test.")),
  ),
  "SettingsLucaLinkSensorBridge.tsx": sensorBridgeUiSource,
};

const forbiddenSourcePatterns = [
  /\bgetUserMedia\b|\bMediaRecorder\b|navigator\.mediaDevices/,
  /navigator\.geolocation/,
  /navigator\.clipboard/,
  /\bshowOpenFilePicker\b|\bFileReader\b|navigator\.contacts|ContactsManager/,
  /\blocalStorage\b|\bsessionStorage\b|\bindexedDB\b|document\.cookie/,
  /\bfetch\s*\(|new\s+WebSocket|socket\.io-client|lucaLinkService\.send/,
  /from\s+["'](?:node:)?fs(?:\/promises)?["']|child_process/,
  /ipcRenderer|ipcMain|electron\/renderer|from\s+["']electron["']/,
  /personal-intelligence|PersonalIntelligence/,
  /modelRouter|modelProvider|providerRouter/,
  /playwright|puppeteer|selenium|browser\.newPage/i,
];

describe("SettingsLucaLinkSensorBridge", () => {
  it("renders model-only status and required safety copy", () => {
    const markup = renderToStaticMarkup(
      React.createElement(SettingsLucaLinkSensorBridge, {
        accentColor: "#7c3aed",
      }),
    );
    expect(markup).toContain("Read-only Sensor Bridge MVP");
    expect(lucaLinkSettingsSource).toContain(
      "<SettingsLucaLinkSensorBridge accentColor={theme.hex} />",
    );
    expect(markup).toContain("Model-only / read-only");
    expect(markup).toContain("Live collection");
    expect(markup).toContain("Disabled");
    expect(markup).toContain(
      "No camera, microphone, precise location, biometrics, contacts, files, clipboard, credentials, or background surveillance.",
    );
    expect(markup).toContain(
      "Readiness does not enable live sensor collection.",
    );
    expect(markup).toContain(
      "No transport send or device control is performed.",
    );
    expect(markup).toContain("Side effects");
    expect(markup).toContain("Static fixtures only");
  });

  it("exposes no live collection, permission, or polling controls", () => {
    const markup = renderToStaticMarkup(
      React.createElement(SettingsLucaLinkSensorBridge, {
        accentColor: "#7c3aed",
      }),
    );
    expect(markup).not.toContain("<button");
    expect(sensorBridgeUiSource).not.toMatch(
      /useEffect|setInterval|setTimeout/,
    );
    expect(sensorBridgeUiSource).not.toMatch(/onClick\s*=/);
  });

  it("keeps sensor bridge production sources free of forbidden APIs", () => {
    for (const [file, source] of Object.entries(productionSources)) {
      for (const pattern of forbiddenSourcePatterns) {
        expect(source, `${file} matched ${pattern}`).not.toMatch(pattern);
      }
    }
  });
});

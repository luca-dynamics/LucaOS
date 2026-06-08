import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SettingsLucaLinkAdapterFileInstallPermissions } from "./SettingsLucaLinkAdapterFileInstallPermissions";
import typesSource from "../../services/lucaLink/adapterFileInstallPermissions/adapterFileInstallTypes.ts?raw";
import writeSource from "../../services/lucaLink/adapterFileInstallPermissions/adapterFileWritePolicy.ts?raw";
import installSource from "../../services/lucaLink/adapterFileInstallPermissions/adapterInstallPolicy.ts?raw";
import decisionSource from "../../services/lucaLink/adapterFileInstallPermissions/adapterFileInstallDecision.ts?raw";
import readinessSource from "../../services/lucaLink/adapterFileInstallPermissions/adapterFileInstallReadiness.ts?raw";
import auditSource from "../../services/lucaLink/adapterFileInstallPermissions/adapterFileInstallAudit.ts?raw";
import fixturesSource from "../../services/lucaLink/adapterFileInstallPermissions/adapterFileInstallFixtures.ts?raw";
import componentSource from "./SettingsLucaLinkAdapterFileInstallPermissions.tsx?raw";
const sources = [typesSource, writeSource, installSource, decisionSource, readinessSource, auditSource, fixturesSource, componentSource].join("\n");
describe("Settings LucaLink adapter file/install permissions", () => {
  it("renders policy-only status, decisions, and safety copy without controls", () => {
    const markup = renderToStaticMarkup(React.createElement(SettingsLucaLinkAdapterFileInstallPermissions, { accentColor: "#00aaff" }));
    expect(markup).toContain("Adapter File Write + Install Permissions");
    expect(markup).toContain("policy preview only");
    expect(markup).toContain("No files are written.");
    expect(markup).toContain("No packages are installed.");
    expect(markup).toContain("Approval does not grant execution in this PR.");
    expect(markup).toContain("approval_required");
    expect(markup).toContain("ready_for_review");
    expect(markup).toContain("unsupported");
    expect(markup).not.toContain("<button");
  });
  it("contains no forbidden runtime, persistence, transport, or execution APIs", () => {
    const forbidden = [
      /from\s+["'](?:node:)?fs(?:\/promises)?["']/,
      /child_process/,
      /\b(?:exec|spawn|fork)\s*\(/,
      /\b(?:npm|pnpm|yarn|pip|brew|apt|choco|winget|curl)\b/,
      /\bfetch\s*\(/,
      /new\s+WebSocket\s*\(/,
      /socket\.io-client/,
      /lucaLinkService\.send/,
      /socket\.emit/,
      /RTCPeerConnection\s*\(/,
      /localStorage\.|sessionStorage\.|indexedDB\./,
      /ipcRenderer|ipcMain/,
      /import\s*\([^)]*entrypoint/,
      /\beval\s*\(|new\s+Function\s*\(|new\s+Worker\s*\(/,
      /node:vm|from\s+["']vm["']/,
      /personalIntelligence|modelRouter|providerRouter|browserAutomation/i,
      /executeAdapter|runAdapterEntrypoint|invokeAdapter/,
    ];
    forbidden.forEach((pattern) => expect(sources).not.toMatch(pattern));
  });
});

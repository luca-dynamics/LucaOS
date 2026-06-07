import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SettingsLucaLinkTransportPermissions } from "./SettingsLucaLinkTransportPermissions";
import auditSource from "../../services/lucaLink/transportPermissions/transportPermissionAudit.ts?raw";
import decisionSource from "../../services/lucaLink/transportPermissions/transportPermissionDecision.ts?raw";
import fixturesSource from "../../services/lucaLink/transportPermissions/transportPermissionFixtures.ts?raw";
import messagePolicySource from "../../services/lucaLink/transportPermissions/transportMessageClassPolicy.ts?raw";
import channelPolicySource from "../../services/lucaLink/transportPermissions/transportPermissionPolicy.ts?raw";
import readinessSource from "../../services/lucaLink/transportPermissions/transportPermissionReadiness.ts?raw";
import typesSource from "../../services/lucaLink/transportPermissions/transportPermissionTypes.ts?raw";
import componentSource from "./SettingsLucaLinkTransportPermissions.tsx?raw";

const sourceFiles = [
  componentSource,
  typesSource,
  channelPolicySource,
  messagePolicySource,
  decisionSource,
  readinessSource,
  auditSource,
  fixturesSource,
].join("\n");

describe("Settings LucaLink transport permission card", () => {
  it("renders preview status, sample decisions, and safety copy", () => {
    const markup = renderToStaticMarkup(
      React.createElement(SettingsLucaLinkTransportPermissions, {
        accentColor: "#00aaff",
      }),
    );
    expect(markup).toContain("Network / Transport Permission Model");
    expect(markup).toContain("policy preview only");
    expect(markup).toContain("allowed_preview");
    expect(markup).toContain("approval_required");
    expect(markup).toContain("blocked");
    expect(markup).toContain("Allowed preview does not mean sent");
    expect(markup).not.toContain("<button");
  });
  it("contains no forbidden runtime, persistence, execution, or mutation API calls", () => {
    const forbidden = [
      /lucaLinkService\.send/,
      /socket\.emit/,
      /socket\.io-client/,
      /new\s+WebSocket\s*\(/,
      /RTCPeerConnection\s*\(/,
      /\bfetch\s*\(/,
      /localStorage\./,
      /sessionStorage\./,
      /indexedDB\./,
      /from\s+["'](?:node:)?fs["']/,
      /child_process/,
      /ipcRenderer|ipcMain/,
      /approvalQueue\.(?:approve|deny|cancel)/,
      /executeAdapter|collectSensor|startSensor|connectRelay|connectLan|pairDevice/,
    ];
    forbidden.forEach((pattern) => expect(sourceFiles).not.toMatch(pattern));
  });
});

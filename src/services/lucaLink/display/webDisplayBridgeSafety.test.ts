import { describe, expect, it } from "vitest";
import auditSource from "./webDisplayBridgeAudit.ts?raw";
import fixturesSource from "./webDisplayBridgeFixtures.ts?raw";
import indexSource from "./index.ts?raw";
import policySource from "./webDisplayBridgePolicy.ts?raw";
import previewSource from "./webDisplayBridgePreview.ts?raw";
import sessionSource from "./webDisplaySession.ts?raw";
import typesSource from "./webDisplayBridgeTypes.ts?raw";

const displayBridgeSource = [
  auditSource,
  fixturesSource,
  indexSource,
  policySource,
  previewSource,
  sessionSource,
  typesSource,
].join("\n");

describe("LucaLink web display bridge module boundaries", () => {
  it("has no network, storage, filesystem, process, Electron IPC, or runtime imports", () => {
    expect(displayBridgeSource).not.toMatch(/\bfetch\s*\(/);
    expect(displayBridgeSource).not.toMatch(/socket\.io|socket\.emit|\.emit\s*\(/i);
    expect(displayBridgeSource).not.toMatch(/localStorage|sessionStorage/);
    expect(displayBridgeSource).not.toMatch(/from\s+["'](?:node:)?fs["']/);
    expect(displayBridgeSource).not.toMatch(/child_process/);
    expect(displayBridgeSource).not.toMatch(/electron|ipcRenderer|ipcMain/);
    expect(displayBridgeSource).not.toMatch(/PersonalIntelligence/i);
    expect(displayBridgeSource).not.toMatch(/VisualCore|LucaBrowser/);
    expect(displayBridgeSource).not.toMatch(/lucaLinkService/);
  });
});

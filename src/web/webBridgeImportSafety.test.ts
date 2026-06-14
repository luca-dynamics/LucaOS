import { describe, expect, it } from "vitest";

const { readFileSync, readdirSync } = process.getBuiltinModule("node:fs");
const read = (file: string) => readFileSync(file, "utf8");
const entrySource = read("src/web/webBridgeEntry.tsx");
const lifecycleSource = read("src/web/WebLifecycleShell.tsx");
const onboardingSource = read("src/web/WebOnboardingSurface.tsx");
const mainSource = read("src/web/WebMainSurface.tsx");
const capabilitiesSource = read("src/web/WebHostCapabilitiesPanel.tsx");
const lucaLinkSource = read("src/web/WebLucaLinkSurface.tsx");
const diagnosticsSource = read("src/web/WebBridgeDiagnostics.tsx");
const sharedOnboardingSource = read("src/shared/onboarding/ExtractedOnboardingFlow.tsx");
const sharedShellSource = read("src/shared/app-shell/ExtractedLucaWorkspace.tsx");
const sharedSettingsSource = read("src/shared/settings/ExtractedSettingsFrame.tsx");
const sharedDeviceCenterSource = read("src/shared/settings/ExtractedLucaLinkDeviceCenter.tsx");
const sharedPrimitivesSource = read("src/shared/ui/ExtractedSurfacePrimitives.tsx");
const originalModeCardSource = read("src/components/Onboarding/ModeCard.tsx");
const auditSource = read("docs/foundation/WEBBRIDGE_UX_PARITY_AUDIT.md");
const bootstrapSource = read("src/index.tsx");

const forbidden = [
  "better-sqlite3", "robotjs", "eventsource", "whatsapp-web.js", "playwright",
  "express", "reactAppEntry", "electron", "child_process",
];
const sourceFiles = [
  ...readdirSync("src/web").filter((file) => /\.(ts|tsx)$/.test(file) && !file.includes(".test.")),
].map((file) => read(`src/web/${file}`));
const staticImports = sourceFiles.flatMap((source) => source.match(/(?:from\s+|import\s*\()["'][^"']+["']/g) ?? []);

describe("WebBridge browser lifecycle and import boundary", () => {
  it("routes an unknown/new browser user into onboarding before the main surface", () => {
    expect(lifecycleSource).toContain('readWebOnboardingComplete() ? "ready" : "needs-onboarding"');
    expect(lifecycleSource).toContain("<WebOnboardingSurface");
    expect(onboardingSource).toContain("../shared/onboarding/ExtractedOnboardingFlow");
    expect(sharedOnboardingSource).toContain("EXTRACTED_ONBOARDING_SOURCES");
    expect(sharedOnboardingSource).toContain("src/components/Onboarding/OnboardingFlow.tsx");
    expect(sharedOnboardingSource).toContain("src/components/Onboarding/ModeSelect.tsx");
    expect(sharedOnboardingSource).toContain("Interface Calibration");
    expect(onboardingSource).not.toContain("View Capability Map");
    expect(onboardingSource).not.toContain("Open Web Chat");
  });

  it("routes returning browser users to the normal web-safe LucaOS surface", () => {
    expect(lifecycleSource).toContain('lifecycle === "ready"');
    expect(lifecycleSource).toContain("<WebMainSurface");
    expect(mainSource).toContain("../shared/app-shell/ExtractedLucaWorkspace");
    expect(sharedShellSource).toContain('data-luca-extraction="app-shell"');
    expect(sharedShellSource).toContain("src/App.tsx");
    expect(sharedShellSource).toContain("src/components/layout/ChatPanel.tsx");
  });

  it("preserves capability and LucaLink work under settings instead of boot cards", () => {
    expect(mainSource).toContain("../shared/settings/ExtractedSettingsFrame");
    expect(sharedSettingsSource).toContain('data-luca-extraction="settings-modal"');
    expect(sharedSettingsSource).toContain("src/components/SettingsModal.tsx");
    expect(sharedSettingsSource).toContain("Host & Capabilities");
    expect(sharedSettingsSource).toContain('"brain"');
    expect(sharedSettingsSource).toContain('"data"');
    expect(capabilitiesSource).toContain('data-settings-surface="host-capabilities"');
    expect(capabilitiesSource).toContain("Browser-safe capability map");
    expect(capabilitiesSource).toContain("Native and routed capability map");
    expect(capabilitiesSource).toContain("Route Unlock");
    expect(lucaLinkSource).toContain("../shared/settings/ExtractedLucaLinkDeviceCenter");
    expect(sharedDeviceCenterSource).toContain('data-luca-extraction="lucalink-device-center"');
    expect(sharedDeviceCenterSource).toContain("src/components/settings/SettingsLucaLinkTab.tsx");
    expect(sharedDeviceCenterSource).toContain("Desktop");
    expect(sharedDeviceCenterSource).toContain("Continue session");
    expect(lifecycleSource).not.toContain("Choose a WebBridge route");
  });

  it("imports only local web modules or browser-safe shared LucaOS architecture", () => {
    for (const reference of forbidden) {
      expect(staticImports.join("\n").toLowerCase()).not.toContain(reference.toLowerCase());
    }
    expect(staticImports.join("\n")).not.toMatch(/["'](?:node:)?fs["']/);
    expect(sourceFiles.join("\n")).toContain("../shared/onboarding/Extracted");
    expect(sourceFiles.join("\n")).toContain("../shared/app-shell/Extracted");
    expect(sourceFiles.join("\n")).toContain("../shared/settings/Extracted");
  });

  it("keeps web surfaces as adapters rather than standalone alternate layouts", () => {
    expect(onboardingSource).not.toContain("data-web-surface");
    expect(mainSource).not.toContain("data-web-surface");
    expect(lucaLinkSource).not.toContain("data-settings-surface");
    expect(onboardingSource).not.toContain("<aside");
    expect(mainSource).not.toContain("<header");
    expect(lucaLinkSource).not.toContain("<button");
  });

  it("ties extracted primitives back into an original LucaOS component", () => {
    expect(originalModeCardSource).toContain("../../shared/ui/ExtractedSurfacePrimitives");
    expect(originalModeCardSource).toContain("<OnboardingChoiceCard");
    expect(sharedPrimitivesSource).toContain("src/components/Onboarding/ModeCard.tsx");
    expect(sharedPrimitivesSource).toContain("src/components/settings/SettingsLayout.tsx");
  });

  it("documents concrete original parity sources and A/B/C classifications", () => {
    for (const path of [
      "src/components/Onboarding/OnboardingFlow.tsx",
      "src/components/Onboarding/ThemeSelectionStep.tsx",
      "src/App.tsx",
      "src/components/layout/ChatPanel.tsx",
      "src/components/SettingsModal.tsx",
      "src/components/settings/SettingsLucaLinkTab.tsx",
      "src/styles/lucaShellStyles.ts",
    ]) {
      expect(auditSource).toContain(path);
    }
    expect(auditSource).toContain("A — browser-safe");
    expect(auditSource).toContain("B — visual/state");
    expect(auditSource).toContain("C — desktop/native");
  });

  it("keeps diagnostics behind bootDebug and reports lifecycle fields", () => {
    expect(diagnosticsSource).toContain('get("bootDebug") !== "1"');
    for (const field of ["webLifecycleState", "onboardingComplete", "activeWebSurface"]) {
      expect(diagnosticsSource).toContain(field);
    }
  });

  it("keeps desktop loading behind the desktop entry selection branch", () => {
    expect(bootstrapSource).toContain('selectedEntry === "webBridgeEntry"');
    expect(bootstrapSource).toContain('import("./web/webBridgeEntry")');
    expect(bootstrapSource).toContain('import("./reactAppEntry")');
    expect(bootstrapSource.indexOf('import("./web/webBridgeEntry")')).toBeLessThan(bootstrapSource.indexOf('import("./reactAppEntry")'));
  });

  it("does not validate master keys or import desktop runtime from WebBridge entry", () => {
    expect(entrySource).not.toMatch(/master.?key/i);
    expect(entrySource).not.toContain("reactAppEntry");
  });
});

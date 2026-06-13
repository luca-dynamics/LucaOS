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
const sharedOnboardingSource = read("src/shared/onboarding/LucaOnboardingShell.tsx");
const onboardingSchemaSource = read("src/shared/onboarding/lucaOnboardingSchema.ts");
const sharedShellSource = read("src/shared/app-shell/LucaAppShell.tsx");
const sharedSettingsSource = read("src/shared/settings/LucaSettingsShell.tsx");
const sharedDeviceCenterSource = read("src/shared/settings/LucaDeviceCenter.tsx");
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
    expect(onboardingSource).toContain("../shared/onboarding/LucaOnboardingShell");
    expect(onboardingSource).toContain("../shared/onboarding/lucaOnboardingSchema");
    expect(sharedOnboardingSource).toContain('data-luca-surface="onboarding"');
    expect(onboardingSchemaSource).toContain("LUCA_ONBOARDING_STEPS");
    expect(onboardingSchemaSource).toContain("Conversation mode");
    expect(onboardingSchemaSource).toContain("Interface calibration");
    expect(onboardingSource).not.toContain("View Capability Map");
    expect(onboardingSource).not.toContain("Open Web Chat");
  });

  it("routes returning browser users to the normal web-safe LucaOS surface", () => {
    expect(lifecycleSource).toContain('lifecycle === "ready"');
    expect(lifecycleSource).toContain("<WebMainSurface");
    expect(mainSource).toContain("../shared/app-shell/LucaAppShell");
    expect(sharedShellSource).toContain('data-luca-surface="main"');
    expect(mainSource).toContain("What would you like to do?");
  });

  it("preserves capability and LucaLink work under settings instead of boot cards", () => {
    expect(mainSource).toContain("../shared/settings/LucaSettingsShell");
    expect(sharedSettingsSource).toContain('data-luca-surface="settings"');
    expect(sharedSettingsSource).toContain("Host & Capabilities");
    expect(sharedSettingsSource).toContain("Model / Runtime");
    expect(sharedSettingsSource).toContain("Memory / Data");
    expect(capabilitiesSource).toContain('data-settings-surface="host-capabilities"');
    expect(capabilitiesSource).toContain("Browser-safe capability map");
    expect(capabilitiesSource).toContain("Native and routed capability map");
    expect(capabilitiesSource).toContain("Route Unlock");
    expect(lucaLinkSource).toContain("../shared/settings/LucaDeviceCenter");
    expect(sharedDeviceCenterSource).toContain('data-luca-settings-section="lucalink"');
    expect(sharedDeviceCenterSource).toContain("Pair Desktop");
    expect(sharedDeviceCenterSource).toContain("Continue session");
    expect(lifecycleSource).not.toContain("Choose a WebBridge route");
  });

  it("imports only local web modules or browser-safe shared LucaOS architecture", () => {
    for (const reference of forbidden) {
      expect(staticImports.join("\n").toLowerCase()).not.toContain(reference.toLowerCase());
    }
    expect(staticImports.join("\n")).not.toMatch(/["'](?:node:)?fs["']/);
    expect(sourceFiles.join("\n")).toContain("../shared/onboarding/");
    expect(sourceFiles.join("\n")).toContain("../shared/app-shell/");
    expect(sourceFiles.join("\n")).toContain("../shared/settings/");
    expect(sourceFiles.join("\n")).not.toContain("LucaWebPrimitives");
  });

  it("keeps web surfaces as adapters rather than standalone alternate layouts", () => {
    expect(onboardingSource).not.toContain("data-web-surface");
    expect(mainSource).not.toContain("data-web-surface");
    expect(lucaLinkSource).not.toContain("data-settings-surface");
    expect(onboardingSource).not.toContain("<aside");
    expect(mainSource).not.toContain("<header");
    expect(lucaLinkSource).not.toContain("<button");
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

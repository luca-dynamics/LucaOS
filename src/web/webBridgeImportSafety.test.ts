import { describe, expect, it } from "vitest";

const { existsSync, readFileSync, readdirSync } =
  process.getBuiltinModule("node:fs");
const read = (file: string) => readFileSync(file, "utf8");

const entrySource = read("src/web/webBridgeEntry.tsx");
const lifecycleSource = read("src/web/WebLifecycleShell.tsx");
const diagnosticsSource = read("src/web/WebBridgeDiagnostics.tsx");
const auditSource = read(
  "docs/foundation/WEBBRIDGE_DIRECT_REUSE_AUDIT.md",
);
const bootstrapSource = read("src/index.tsx");
const onboardingSource = read(
  "src/components/Onboarding/OnboardingFlow.tsx",
);

const generatedProductSurfaces = [
  "src/web/WebOnboardingSurface.tsx",
  "src/web/WebMainSurface.tsx",
  "src/web/WebLucaLinkSurface.tsx",
  "src/shared/onboarding/ExtractedOnboardingFlow.tsx",
  "src/shared/onboarding/LucaOnboardingShell.tsx",
  "src/shared/app-shell/ExtractedLucaWorkspace.tsx",
  "src/shared/app-shell/LucaAppShell.tsx",
  "src/shared/settings/ExtractedSettingsFrame.tsx",
  "src/shared/settings/ExtractedLucaLinkDeviceCenter.tsx",
  "src/shared/settings/LucaSettingsShell.tsx",
  "src/shared/settings/LucaDeviceCenter.tsx",
  "src/shared/ui/ExtractedSurfacePrimitives.tsx",
  "src/shared/ui/LucaPrimitives.tsx",
];

const forbidden = [
  "better-sqlite3",
  "robotjs",
  "eventsource",
  "whatsapp-web.js",
  "playwright",
  "express",
  "reactAppEntry",
  "electron",
  "child_process",
];
const sourceFiles = readdirSync("src/web")
  .filter((file) => /\.(ts|tsx)$/.test(file) && !file.includes(".test."))
  .map((file) => read(`src/web/${file}`));
const staticImports = sourceFiles.flatMap(
  (source) => source.match(/(?:from\s+|import\s*\()["'][^"']+["']/g) ?? [],
);

describe("WebBridge direct LucaOS UI reuse audit", () => {
  it("removes generated onboarding, main, settings, and LucaLink product surfaces", () => {
    for (const path of generatedProductSurfaces) {
      expect(existsSync(path), path).toBe(false);
    }

    for (const generatedName of [
      "WebOnboardingSurface",
      "WebMainSurface",
      "WebLucaLinkSurface",
      "ExtractedOnboardingFlow",
      "ExtractedLucaWorkspace",
      "ExtractedSettingsFrame",
      "ExtractedLucaLinkDeviceCenter",
    ]) {
      expect(lifecycleSource).not.toContain(generatedName);
    }
  });

  it("renders only the documented plain blocker when direct reuse is unsafe", () => {
    expect(lifecycleSource).toContain(
      "Original LucaOS onboarding is blocked from WebBridge by unsafe imports.",
    );
    expect(lifecycleSource).toContain(
      "See WEBBRIDGE_DIRECT_REUSE_AUDIT.md.",
    );
    expect(lifecycleSource).not.toContain("className=");
    expect(lifecycleSource).not.toContain("<button");
    expect(lifecycleSource).not.toContain("<section");
  });

  it("documents the canonical onboarding target and its exact import blockers", () => {
    expect(auditSource).toContain(
      "src/components/Onboarding/OnboardingFlow.tsx",
    );
    for (const chain of [
      "OnboardingFlow -> ModelManagerService",
      "OnboardingFlow -> LocalProvisioningService -> ModelManagerService",
      "OnboardingFlow -> settingsService -> secureVault -> credentialVault -> window.luca.vault",
      "OnboardingFlow -> ConversationalOnboarding -> llmService -> @google/generative-ai",
      "OnboardingFlow -> realtimeVoiceUiBridge",
    ]) {
      expect(auditSource).toContain(chain);
    }

    expect(onboardingSource).toContain(
      'from "../../services/ModelManagerService"',
    );
    expect(onboardingSource).toContain(
      'from "../../services/onboarding/LocalProvisioningService"',
    );
    expect(onboardingSource).toContain(
      'from "../../services/settingsService"',
    );
  });

  it("audits exact canonical boot, main, settings, and LucaLink source files", () => {
    for (const path of [
      "src/reactAppEntry.tsx",
      "src/App.tsx",
      "src/components/Onboarding/OnboardingFlow.tsx",
      "src/components/Onboarding/ThemeSelectionStep.tsx",
      "src/components/Onboarding/ModeSelect.tsx",
      "src/components/layout/Header.tsx",
      "src/components/layout/ChatPanel.tsx",
      "src/components/SettingsModal.tsx",
      "src/components/settings/SettingsLayout.tsx",
      "src/components/settings/SettingsLucaLinkTab.tsx",
      "src/components/LucaLinkModal.tsx",
      "src/styles/lucaShellStyles.ts",
      "src/styles/lucaMobileShellStyles.ts",
    ]) {
      expect(auditSource).toContain(path);
    }
    expect(auditSource).toContain("Direct browser-safe import");
    expect(auditSource).toContain("Unsafe imports and exact chain");
  });

  it("keeps src/web free of native, server, and desktop-entry imports", () => {
    const imports = staticImports.join("\n");
    for (const reference of forbidden) {
      expect(imports.toLowerCase()).not.toContain(reference.toLowerCase());
    }
    expect(imports).not.toMatch(/["'](?:node:)?fs["']/);
  });

  it("keeps diagnostics behind bootDebug while reporting the blocker lifecycle", () => {
    expect(diagnosticsSource).toContain('get("bootDebug") !== "1"');
    expect(lifecycleSource).toContain('lifecycleState="direct-reuse-blocked"');
    expect(lifecycleSource).toContain('activeWebSurface="direct-reuse-blocked"');
  });

  it("keeps WebBridge and desktop on their separate bootstrap entries", () => {
    expect(bootstrapSource).toContain('selectedEntry === "webBridgeEntry"');
    expect(bootstrapSource).toContain('import("./web/webBridgeEntry")');
    expect(bootstrapSource).toContain('import("./reactAppEntry")');
    expect(
      bootstrapSource.indexOf('import("./web/webBridgeEntry")'),
    ).toBeLessThan(bootstrapSource.indexOf('import("./reactAppEntry")'));
    expect(entrySource).not.toContain("reactAppEntry");
  });

  it("does not validate master keys from the WebBridge entry", () => {
    expect(entrySource).not.toMatch(/master.?key/i);
  });
});

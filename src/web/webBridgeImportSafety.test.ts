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
const iconSource = read("src/components/ui/Icon.tsx");
const webAdapterSource = read("src/web/adapters/webOnboardingRuntime.tsx");
const webConversationSource = read(
  "src/web/adapters/WebOnboardingConversation.tsx",
);
const webBackgroundSource = read("src/web/WebLucaBackground.tsx");
const desktopAdapterSource = read(
  "src/desktop/adapters/desktopOnboardingRuntime.ts",
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

  it("mounts the canonical LucaOS onboarding instead of a blocker or generated surface", () => {
    expect(lifecycleSource).toContain(
      'import OnboardingFlow from "../components/Onboarding/OnboardingFlow"',
    );
    expect(lifecycleSource).toContain("<OnboardingFlow");
    expect(lifecycleSource).toContain("runtime={webOnboardingRuntime}");
    expect(lifecycleSource).not.toContain(
      "Original LucaOS onboarding is blocked",
    );
    expect(lifecycleSource).not.toContain("LiquidBackground");
    expect(lifecycleSource).toContain("<WebLucaBackground");
    expect(webBackgroundSource).not.toMatch(/electron|LiquidBackground/);
  });

  it("keeps Icon presentation-only at module import time", () => {
    expect(iconSource).not.toContain("settingsService");
    expect(iconSource).not.toContain("secureVault");
    expect(iconSource).not.toContain("credentialVault");
    expect(iconSource).not.toContain("electron");
    expect(iconSource).toContain(
      "color || 'var(--app-primary, currentColor)'",
    );
  });

  it("isolates canonical onboarding runtime dependencies behind adapters", () => {
    for (const runtimeImport of [
      "services/ModelManagerService",
      "services/settingsService",
      "services/voice/realtimeVoiceUiBridge",
      'from "./ConversationalOnboarding"',
    ]) {
      expect(onboardingSource).not.toContain(runtimeImport);
    }
    expect(onboardingSource).toContain("runtime: OnboardingRuntimeAdapter");
    expect(onboardingSource).toContain("<ConversationComponent");
    expect(desktopAdapterSource).toContain("ModelManagerService");
    expect(desktopAdapterSource).toContain("settingsService");
    expect(desktopAdapterSource).toContain("realtimeVoiceUiBridge");
    expect(webAdapterSource).not.toContain("ModelManagerService");
    expect(webAdapterSource).not.toContain("settingsService");
    expect(webAdapterSource).not.toContain("realtimeVoiceUiBridge");
    expect(webAdapterSource).not.toContain("ConversationalOnboarding");
    expect(webAdapterSource).toContain("WebOnboardingConversation");
    expect(webAdapterSource).toContain("subscribeVisualSettings");
    expect(lifecycleSource).toContain(
      "webOnboardingRuntime.subscribeVisualSettings",
    );
    expect(onboardingSource).not.toContain("fallback={null}");
    for (const unsafeConversationImport of [
      "llmService",
      "settingsService",
      "personalityService",
      "liveService",
      "soundService",
      "@google/generative-ai",
    ]) {
      expect(webConversationSource).not.toContain(unsafeConversationImport);
    }
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

  it("keeps diagnostics behind bootDebug while reporting canonical onboarding", () => {
    expect(diagnosticsSource).toContain('get("bootDebug") !== "1"');
    expect(lifecycleSource).toContain('lifecycleState="onboarding"');
    expect(lifecycleSource).toContain('activeWebSurface="lucaos-onboarding"');
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

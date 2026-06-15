import { describe, expect, it } from "vitest";

const { existsSync, readFileSync, readdirSync } =
  process.getBuiltinModule("node:fs");
const read = (file: string) => readFileSync(file, "utf8");

const entrySource = read("src/web/webBridgeEntry.tsx");
const lifecycleSource = read("src/web/WebLifecycleShell.tsx");
const diagnosticsSource = read("src/web/WebBridgeDiagnostics.tsx");
const readySource = read("src/web/WebReadyState.tsx");
const webShellSource = read("src/web/WebLucaShell.tsx");
const webChatSource = read("src/web/chat/WebChatSurface.tsx");
const webChatRuntimeSource = read("src/web/chat/webChatRuntime.ts");
const auditSource = read("docs/foundation/WEBBRIDGE_DIRECT_REUSE_AUDIT.md");
const bootstrapSource = read("src/index.tsx");
const onboardingSource = read("src/components/Onboarding/OnboardingFlow.tsx");
const iconSource = read("src/components/ui/Icon.tsx");
const webAdapterSource = read("src/web/adapters/webOnboardingRuntime.tsx");
const webConversationSource = read(
  "src/web/adapters/WebSafeConversationalOnboarding.tsx",
);
const webBackgroundSource = read("src/web/WebLucaBackground.tsx");
const onboardingAccessSource = read(
  "src/components/Onboarding/OnboardingAccessPanels.tsx",
);
const modeSelectSource = read("src/components/Onboarding/ModeSelect.tsx");
const desktopAdapterSource = read(
  "src/desktop/adapters/desktopOnboardingRuntime.ts",
);
const postBootSource = read("src/web/postBoot/WebPostBootTransition.tsx");
const postBootLoadingSource = read("src/web/postBoot/WebPostBootLoading.tsx");
const postBootStateSource = read("src/web/postBoot/webPostBootState.ts");
const presenceOrbSource = read("src/components/visual/LucaPresenceOrb.tsx");
const canvasPresenceOrbSource = read(
  "src/components/visual/LucaCanvasPresenceOrb.tsx",
);
const canvasOrbRendererSource = read(
  "src/components/visual/lucaCanvasOrbRenderer.ts",
);
const hologramShaderPresenceSource = read(
  "src/components/visual/LucaHologramShaderPresence.tsx",
);
const hologramShaderSceneSource = read(
  "src/components/visual/LucaHologramShaderScene.tsx",
);
const visualSourceAuditPath =
  "docs/foundation/LUCA_ORB_AND_POST_BOOT_VISUAL_SOURCE_AUDIT.md";
const visualSourceAudit = read(visualSourceAuditPath);
const onboardingLifecycleSource = read(
  "src/services/onboarding/OnboardingLifecycleService.ts",
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

const unsafeWebRuntimeReferences = [
  "llmService",
  "liveService",
  "settingsService",
  "personalityService",
  "soundService",
  "better-sqlite3",
  "electron",
  "node:fs",
  "node:path",
  "node:crypto",
  "@anthropic-ai/sdk",
  "@google/generative-ai",
  "@google/genai",
  "openai",
];

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
  });

  it("keeps Icon presentation-only at module import time", () => {
    expect(iconSource).not.toContain("settingsService");
    expect(iconSource).not.toContain("secureVault");
    expect(iconSource).not.toContain("credentialVault");
    expect(iconSource).not.toContain("electron");
    expect(iconSource).toContain("color || 'var(--app-primary, currentColor)'");
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
    expect(webAdapterSource).not.toContain(
      "../../components/Onboarding/ConversationalOnboarding",
    );
    expect(webAdapterSource).toContain("WebSafeConversationalOnboarding");
  });

  it("wires browser-safe lifecycle, conversation, and live visual settings", () => {
    expect(lifecycleSource).not.toContain("LiquidBackground");
    expect(lifecycleSource).toContain("WebLucaBackground");
    expect(lifecycleSource).toContain("WebReadyState");
    expect(lifecycleSource).toContain('"onboarding"');
    expect(lifecycleSource).toContain('"ready"');
    expect(lifecycleSource).toContain('"main"');
    expect(lifecycleSource).toContain("setLifecycleState");
    expect(lifecycleSource).toContain("subscribeVisualSettings");
    expect(webAdapterSource).not.toContain(
      "../../components/Onboarding/ConversationalOnboarding",
    );
    expect(webAdapterSource).toContain("WebSafeConversationalOnboarding");
    expect(webAdapterSource).toContain("subscribeVisualSettings");
    expect(onboardingSource).not.toContain("fallback={null}");
    expect(onboardingSource).toContain(
      "Preparing Luca conversation interface...",
    );
  });

  it("keeps post-boot presentation on reused Luca visuals and safe storage", () => {
    expect(postBootSource).toContain("LucaHologramShaderPresence");
    expect(postBootSource).toContain("LucaCanvasPresenceOrb");
    expect(postBootSource).not.toContain("LucaHologramPresence");
    expect(postBootSource).not.toContain("LucaPresenceOrb");
    expect(postBootSource).not.toMatch(/VoiceHud|VoiceHUD/);
    expect(postBootSource).not.toContain("> Luca is waking up");
    expect(hologramShaderPresenceSource).toContain(
      'import("./LucaHologramShaderScene")',
    );
    expect(hologramShaderSceneSource).toContain(
      'useGLTF("/models/avatar.glb")',
    );
    expect(hologramShaderPresenceSource).not.toContain('src="/icon.png"');
    expect(canvasPresenceOrbSource).toContain("<canvas");
    expect(canvasOrbRendererSource).toContain("createRadialGradient");
    expect(postBootStateSource).toContain("readWebOnboardingComplete");
    expect(postBootStateSource).toContain("readWebProfile");
    expect(postBootLoadingSource).toContain("Preparing LucaOS");
    expect(postBootLoadingSource).toContain("LucaCanvasPresenceOrb");
    expect(postBootLoadingSource).not.toContain("rounded-full bg-cyan-100");
    expect(postBootLoadingSource).not.toContain("rgba(207,250,254,0.42)");
    expect(postBootLoadingSource).not.toContain("React did not hydrate");
    for (const reference of unsafeWebRuntimeReferences) {
      expect(postBootLoadingSource.toLowerCase()).not.toContain(
        reference.toLowerCase(),
      );
    }
    for (const reference of unsafeWebRuntimeReferences) {
      expect(postBootSource.toLowerCase()).not.toContain(reference.toLowerCase());
      expect(postBootStateSource.toLowerCase()).not.toContain(
        reference.toLowerCase(),
      );
    }
  });

  it("does not introduce a generated orb or import the VoiceHud runtime", () => {
    const generatedOrbNames = [
      "GeneratedOrb",
      "NewAnimatedOrb",
      "WebGeneratedOrb",
    ];
    const walk = (directory: string): string[] =>
      readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const path = `${directory}/${entry.name}`;
        return entry.isDirectory() ? walk(path) : [path];
      });
    const productionFiles = walk("src").filter((path) =>
      /\.(ts|tsx)$/.test(path),
    );
    for (const path of productionFiles) {
      for (const name of generatedOrbNames) {
        expect(path, name).not.toContain(name);
      }
    }
    expect(postBootSource).not.toMatch(/from\s+["'][^"']*VoiceHud["']/i);
    expect(lifecycleSource).not.toMatch(/from\s+["'][^"']*VoiceHud["']/i);
    expect(postBootSource).not.toMatch(
      /from\s+["'][^"']*voice\/VoiceVisualizer["']/i,
    );
    expect(lifecycleSource).not.toMatch(
      /from\s+["'][^"']*voice\/VoiceVisualizer["']/i,
    );
  });

  it("protects the factual orb and post-boot visual source audit", () => {
    expect(existsSync(visualSourceAuditPath)).toBe(true);
    expect(visualSourceAudit).toContain("src/components/WidgetVisualizer.tsx");
    expect(visualSourceAudit).toContain(
      "src/components/voice/VoiceVisualizer.tsx",
    );
    expect(visualSourceAudit).toContain(
      "src/components/Onboarding/HologramFace.tsx",
    );
    expect(visualSourceAudit).toContain(
      "src/components/Hologram/HologramScene.tsx",
    );
    expect(visualSourceAudit).toContain('useGLTF("/models/avatar.glb")');
    expect(visualSourceAudit).toContain(
      "src/services/onboarding/OnboardingLifecycleService.ts",
    );
    expect(visualSourceAudit).toContain(
      "src/components/Onboarding/OnboardingFlow.tsx",
    );
    expect(visualSourceAudit).toContain("KERNEL_AWAKENING");
  });

  it("keeps the located terminal source and generic orb status explicit", () => {
    for (const copyKey of [
      "kernelAwakening",
      "stabilizingLucaTensors",
      "generatingIdentityKeypair",
      "lucaAgentInitialized",
    ]) {
      expect(onboardingLifecycleSource).toContain(copyKey);
    }
    expect(onboardingSource).toContain('step === "KERNEL_AWAKENING"');
    expect(onboardingSource).not.toContain('{">"} {text}');
    expect(onboardingSource).toContain("<LucaHologramShaderPresence");
    expect(onboardingSource).toContain("<LucaCanvasPresenceOrb");
    expect(presenceOrbSource).toContain(
      "@deprecated Generic PR #310 placeholder",
    );

    const orbComponentFiles = [
      "src/components/visual/LucaCanvasPresenceOrb.tsx",
      "src/components/visual/LucaPresenceOrb.tsx",
      "src/components/voice/VoiceStatusOrb.tsx",
    ];
    const walk = (directory: string): string[] =>
      readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const path = `${directory}/${entry.name}`;
        return entry.isDirectory() ? walk(path) : [path];
      });
    expect(
      walk("src/components")
        .filter((path) => /Orb\.tsx$/.test(path))
        .sort(),
    ).toEqual(orbComponentFiles.sort());
  });

  it("wires ready through the browser-safe LucaOS shell and chat adapter", () => {
    expect(lifecycleSource).toContain(
      'import { WebLucaShell } from "./WebLucaShell"',
    );
    expect(lifecycleSource).toContain('<WebLucaShell');
    expect(lifecycleSource).toContain('setLifecycleState("main")');
    expect(readySource).toContain("onContinueToShell");
    expect(readySource).toContain("Continue to LucaOS Web Shell");
    expect(webShellSource).toContain("<WebChatSurface");
    expect(webChatSource).toContain('from "./webChatRuntime"');
    expect(webChatSource).toContain("runtime.sendMessage");
  });

  it("keeps the main shell and chat path isolated from desktop and provider runtimes", () => {
    expect(webShellSource).not.toMatch(/(?:\.\.\/)+App(?:\.tsx)?/);
    for (const reference of unsafeWebRuntimeReferences) {
      expect(webShellSource.toLowerCase()).not.toContain(reference.toLowerCase());
      expect(webChatSource.toLowerCase()).not.toContain(reference.toLowerCase());
      expect(webChatRuntimeSource.toLowerCase()).not.toContain(
        reference.toLowerCase(),
      );
    }
    expect(webChatRuntimeSource).not.toMatch(/api.?key|secret|localStorage/i);
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
    expect(lifecycleSource).toContain("lifecycleState={lifecycleState}");
    expect(lifecycleSource).toContain('"lucaos-onboarding"');
    expect(lifecycleSource).toContain('"web-ready-state"');
    expect(lifecycleSource).toContain('"web-luca-shell"');
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

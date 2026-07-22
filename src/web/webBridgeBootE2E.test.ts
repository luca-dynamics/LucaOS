import { describe, expect, it } from "vitest";

const { existsSync, readFileSync } = process.getBuiltinModule("node:fs");
const read = (path: string) => readFileSync(path, "utf8");

const indexSource = read("src/index.tsx");
const polyfillSource = read("src/web/webBootPolyfills.ts");
const entrySource = read("src/web/webBridgeEntry.tsx");
const shellSource = read("src/web/WebBridgeShell.tsx");
const lifecycleSource = read("src/web/WebLifecycleShell.tsx");
const onboardingRuntimeSource = read(
  "src/web/adapters/webOnboardingRuntime.tsx",
);
const webShellSource = read("src/web/WebLucaShell.tsx");
const webChatSurfaceSource = read("src/web/chat/WebRealChatPanel.tsx");
const webVoiceSurfaceSource = read(
  "src/web/voice/WebVoiceOnboardingSurface.tsx",
);
const webRealVoiceSurfaceSource = read("src/web/shell/WebRealVoiceSurface.tsx");
const webRealHologramSurfaceSource = read(
  "src/web/shell/WebRealHologramSurface.tsx",
);
const chatRuntimeSource = read("src/web/chat/webChatRuntime.ts");

const forbiddenDesktopImports = [
  "reactAppEntry",
  "electron",
  "window.electron",
  "ipcRenderer",
  "native IPC",
  "../desktop/",
  "./desktop/",
  "lucaService",
  "settingsService",
  "secureVault",
  "better-sqlite3",
  "node:sqlite",
];

const productUiSources = [
  ["src/web/WebLucaShell.tsx", webShellSource],
  ["src/web/chat/WebRealChatPanel.tsx", webChatSurfaceSource],
  ["src/web/voice/WebVoiceOnboardingSurface.tsx", webVoiceSurfaceSource],
  ["src/web/shell/WebRealVoiceSurface.tsx", webRealVoiceSurfaceSource],
  ["src/web/shell/WebRealHologramSurface.tsx", webRealHologramSurfaceSource],
  [
    "src/components/Onboarding/OnboardingConversationSurface.tsx",
    read("src/components/Onboarding/OnboardingConversationSurface.tsx"),
  ],
] as const;

describe("WebBridge full boot, onboarding, chat, and voice runtime QA", () => {
  it("loads browser Buffer polyfills before selecting and mounting WebBridge", () => {
    const firstImport = indexSource.match(/^import[^;]+;/m)?.[0];
    expect(firstImport).toBe('import "./web/webBootPolyfills";');
    expect(polyfillSource).toContain(
      'import { Buffer as BrowserBuffer } from "buffer"',
    );
    expect(polyfillSource).toContain("globalThis.Buffer = BrowserBuffer");
    expect(polyfillSource).toContain("window.Buffer = BrowserBuffer");
    expect(indexSource.indexOf('import "./web/webBootPolyfills"')).toBeLessThan(
      indexSource.indexOf('import("./web/webBridgeEntry")'),
    );
  });

  it("selects the browser WebBridge entry and keeps desktop imports out of that path", () => {
    expect(indexSource).toContain('selectedEntry === "webBridgeEntry"');
    expect(indexSource.indexOf('import("./web/webBridgeEntry")')).toBeLessThan(
      indexSource.indexOf('import("./reactAppEntry")'),
    );
    expect(entrySource).toContain("WebBridgeShell");
    expect(entrySource).toContain("<WebBridgeShell />");
    expect(entrySource).not.toContain("reactAppEntry");

    for (const source of [entrySource, shellSource, lifecycleSource]) {
      for (const forbidden of forbiddenDesktopImports.filter(
        (item) => item !== "reactAppEntry",
      )) {
        expect(source.toLowerCase()).not.toContain(forbidden.toLowerCase());
      }
    }
  });

  it("wires the normal post-boot lifecycle into onboarding, main, and recovery actions", () => {
    expect(shellSource).toContain("WebLifecycleShell");
    expect(shellSource).toContain("<WebLifecycleShell />");
    expect(lifecycleSource).toContain(
      'useState<WebLifecycleState>("post_boot")',
    );
    expect(lifecycleSource).toContain("resolveWebPostBootState");
    expect(lifecycleSource).toContain('snapshot.userState === "new_user"');
    expect(lifecycleSource).toContain("__LUCA_SET_BOOT_STATUS__");
    expect(lifecycleSource).toContain("Preparing safe tool access");
    expect(lifecycleSource).toContain('document.getElementById("root-loader")');
    expect(lifecycleSource).toContain('return "onboarding"');
    expect(lifecycleSource).toContain("setLifecycleState(target)");
    expect(lifecycleSource).toContain(
      'setLifecycleState(showWebReadyDebug ? "ready" : "main")',
    );
    expect(lifecycleSource).not.toContain("WebPostBootTransition");
    expect(lifecycleSource).not.toContain("WebPostBootLoading");
    expect(lifecycleSource).toContain("<LucaPremiumOnboardingPreview");
  });

  it("uses the canonical onboarding, chat, and voice surfaces", () => {
    expect(onboardingRuntimeSource).toContain("OnboardingConversationSurface");
    expect(onboardingRuntimeSource).toContain("WebVoiceOnboardingSurface");
    expect(webShellSource).toContain("<LucaDashboardSurface");
    expect(webShellSource).toContain("chatSurface={<WebRealChatPanel />}");
    expect(webShellSource).toContain("<WebRealVoiceSurface");
    expect(webShellSource).not.toContain("voiceSurface={null}");
    expect(webShellSource).toContain("<WebRealHologramSurface");
    expect(webShellSource).not.toContain("hologramSurface={null}");
    expect(webChatSurfaceSource).toContain("<ChatPanel");
    expect(webChatSurfaceSource).toContain("webAppRuntime.chat.sendMessage");
    expect(chatRuntimeSource).toContain("sendMessage");
    expect(webVoiceSurfaceSource).toContain("<VoiceHudSurface");
    expect(webRealVoiceSurfaceSource).toContain("<VoiceHudSurface");
    expect(webRealHologramSurfaceSource).toContain("LucaHologramPresence");
  });

  it("keeps deleted generated fallback files deleted and product UI free of debug wording", () => {
    expect(
      existsSync("src/web/adapters/WebSafeConversationalOnboarding.tsx"),
    ).toBe(false);
    expect(existsSync("src/web/adapters/WebOnboardingConversation.tsx")).toBe(
      false,
    );

    for (const [path, source] of productUiSources) {
      expect(source, path).not.toMatch(
        /WebBridge|browser-safe|runtime adapter|debug route|capability manifest|host class|Original onboarding complete|Continue to LucaOS Web Shell|System Ready/i,
      );
    }
  });
});

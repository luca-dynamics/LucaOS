import { describe, expect, it } from "vitest";

const { existsSync, readFileSync } = process.getBuiltinModule("node:fs");

const read = (path: string) => readFileSync(path, "utf8");

const webLucaShell = read("src/web/WebLucaShell.tsx");
const webChatSurface = read("src/web/chat/WebChatSurface.tsx");
const webVoiceSurface = read("src/web/voice/WebVoiceOnboardingSurface.tsx");
const webReadyState = read("src/web/WebReadyState.tsx");
const webLifecycleShell = read("src/web/WebLifecycleShell.tsx");
const webOnboardingRuntime = read("src/web/adapters/webOnboardingRuntime.tsx");
const lucaChatSurface = read("src/components/chat/LucaChatSurface.tsx");
const voiceHudSurface = read("src/components/voice/VoiceHudSurface.tsx");

const normalUiSources = [
  ["src/web/WebLucaShell.tsx", webLucaShell],
  ["src/web/chat/WebChatSurface.tsx", webChatSurface],
  ["src/web/voice/WebVoiceOnboardingSurface.tsx", webVoiceSurface],
  ["src/web/WebReadyState.tsx", webReadyState],
] as const;

const forbiddenRuntimeCopy = [
  "WebBridge",
  "browser-safe",
  "runtime adapter",
  "model execution adapter",
  "native routes guarded",
  "host class",
  "capability manifest",
  "debug route",
  "LucaOS web chat",
  "Continue to LucaOS Web Shell",
  "Original onboarding complete",
  "System Ready",
];

const forbiddenNormalVoiceCopy = [
  "ACTIVE PROTOCOLS",
  "TELEMETRY STREAM",
  "ACTIVE_MODEL",
  "RESPONSE_CLASS",
  "LOCAL_CORE",
  "ROUTING_HEALTH",
  "NEXT_ROUTE",
  "ROUTE_CONFIDENCE",
  "AUDIO_INPUT_DB",
  "DOMINANT_FREQ",
  "FIREWALL",
  "SHIELD_ACTIVE",
  "MISSION ACTIVE",
  "WAITING FOR AUDIO INPUT",
  "MICROPHONE UNAVAILABLE",
  "Voice Status:",
];

const forbiddenSharedImports = [
  "electron",
  "window.electron",
  "window.luca",
  "eventBus",
  "lucaService",
  "llmService",
  "liveService",
  "soundService",
  "settingsService",
  "personalityService",
  "awarenessService",
  "conversationService",
  "lucaLinkManager",
  "ToolRegistry",
  "ScreenShare",
  "SecurityGate",
  "node:fs",
  "better-sqlite3",
];

describe("WebBridge generated shell eradication audit", () => {
  it("keeps normal WebBridge UI free of runtime/debug copy", () => {
    for (const [path, source] of normalUiSources) {
      for (const copy of forbiddenRuntimeCopy) {
        expect(source, `${path} must not render ${copy}`).not.toContain(copy);
      }
    }
  });

  it("keeps normal web voice UI free of tactical/debug console copy", () => {
    for (const copy of forbiddenNormalVoiceCopy) {
      expect(
        webVoiceSurface,
        `web voice onboarding must not render ${copy}`,
      ).not.toContain(copy);
    }

    const showTechnicalPanelsIndex = voiceHudSurface.indexOf(
      "const showTechnicalPanels",
    );
    expect(showTechnicalPanelsIndex).toBeGreaterThan(-1);
    for (const copy of forbiddenNormalVoiceCopy.slice(0, 13)) {
      const copyIndex = voiceHudSurface.indexOf(copy);
      if (copyIndex !== -1) {
        expect(
          copyIndex,
          `${copy} should only appear after the debug-gated panel guard`,
        ).toBeGreaterThan(showTechnicalPanelsIndex);
      }
    }
    expect(voiceHudSurface).not.toContain("WAITING FOR AUDIO INPUT");
    expect(voiceHudSurface).not.toContain("MICROPHONE UNAVAILABLE");
    expect(voiceHudSurface).not.toContain("Voice Status:");
  });

  it("removes regenerated onboarding fallback surfaces from normal onboarding", () => {
    expect(webLifecycleShell).toContain("<OnboardingFlow");
    expect(webOnboardingRuntime).toContain("OnboardingConversationSurface");
    expect(webOnboardingRuntime).not.toContain("WebSafeConversationalOnboarding");
    expect(webOnboardingRuntime).not.toContain("WebOnboardingConversation");
    expect(existsSync("src/web/adapters/WebSafeConversationalOnboarding.tsx")).toBe(false);
    expect(existsSync("src/web/adapters/WebOnboardingConversation.tsx")).toBe(false);
  });

  it("keeps WebBridge presentation files as thin shared-surface adapters", () => {
    expect(webLucaShell).toContain("LucaDashboardSurface");
    expect(webLucaShell).toContain("<LucaDashboardSurface");
    expect(webChatSurface).toContain("LucaChatSurface");
    expect(webChatSurface).toContain("<LucaChatSurface");
    expect(webVoiceSurface).toContain("VoiceHudSurface");
    expect(webVoiceSurface).toContain("<VoiceHudSurface");
  });

  it("keeps ready state debug-gated by lifecycle before it can render", () => {
    expect(webLifecycleShell).toContain("showWebReadyDebug");
    expect(webLifecycleShell).toContain(
      'lifecycleState === "ready" && showWebReadyDebug',
    );
    expect(webReadyState).not.toMatch(
      /host class|capability manifest|native routes guarded|runtime adapter/i,
    );
  });

  it("keeps chat on original MiniChat child components", () => {
    expect(lucaChatSurface).toContain('from "../ChatWidgetHistory"');
    expect(lucaChatSurface).toContain('from "../ChatWidgetInput"');
    expect(lucaChatSurface).toContain('from "../SuggestionChips"');
    expect(lucaChatSurface).toContain("<ChatWidgetHistory");
    expect(lucaChatSurface).toContain("<ChatWidgetInput");
    expect(lucaChatSurface).toContain("<SuggestionChips");
    expect(lucaChatSurface).not.toMatch(/messages\.map\(.*rounded-2xl/s);
  });

  it("keeps shared surfaces free of forbidden direct runtime imports", () => {
    for (const path of [
      "src/components/chat/LucaChatSurface.tsx",
      "src/components/dashboard/LucaDashboardSurface.tsx",
      "src/components/voice/VoiceHudSurface.tsx",
    ]) {
      const source = read(path).toLowerCase();
      for (const reference of forbiddenSharedImports) {
        expect(source, `${path} must not import ${reference}`).not.toContain(
          reference.toLowerCase(),
        );
      }
    }
  });
});

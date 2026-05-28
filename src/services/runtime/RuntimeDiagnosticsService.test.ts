import { describe, expect, it } from "vitest";
import type { LucaSettings } from "../settingsService";
import {
  buildRuntimeDiagnosticsSummary,
  detectRuntimeDiagnosticsAudience,
  getVisibleRuntimeRoutesForAudience,
  normalizeRuntimeRoute,
  selectRecommendedActions,
  severityFromReadiness,
  summarizeKeyReadiness,
  type RuntimeLocalRuntimeDiagnostics,
} from "./RuntimeDiagnosticsService";
import type { ModelRouteDecision } from "../../types/modelRouting";

function makeRoute(
  overrides: Partial<ModelRouteDecision> = {},
): ModelRouteDecision {
  return {
    capability: "chat",
    provider: "ollama",
    model: "llama3.2:1b",
    mode: "local",
    reason: "Local chat model is ready.",
    warnings: [],
    readiness: "ready",
    privacy: "local_only",
    fallbackPolicy: "no_fallback",
    networkAllowed: false,
    runtime: "ollama",
    ...overrides,
  };
}

function makeSettings(overrides: Partial<LucaSettings["general"]> = {}): LucaSettings {
  return {
    general: {
      backgroundBlur: 40,
      backgroundOpacity: 0.3,
      startOnBoot: false,
      minimizeToTray: false,
      debugMode: false,
      userName: "Operator",
      setupComplete: true,
      agencyLevel: "PROACTIVE",
      autonomousDomains: [],
      persona: "ASSISTANT",
      theme: "PROFESSIONAL",
      preferredMode: "text",
      syncThemeWithPersona: true,
      toneStyle: "CHILL",
      experimentalMode: false,
      fontScale: 1,
      fontFamily: "Inter",
      activeBrainId: "llama-3.2-1b",
      activeEmbedId: "nomic-embed-text",
      ...overrides,
    },
    hardwareSanitized: true,
    v1betaMigrationComplete: true,
    notifications: {
      enabled: true,
      voiceEnabled: true,
      visualEnabled: true,
      chatEnabled: true,
      tradingVoiceEnabled: true,
      priorityThreshold: "MEDIUM",
    },
    brain: {
      useCustomApiKey: false,
      geminiApiKey: "",
      anthropicApiKey: "",
      openaiApiKey: "",
      xaiApiKey: "",
      xaiBaseUrl: "",
      deepseekApiKey: "",
      groqApiKey: "",
      groqBaseUrl: "https://api.groq.com/openai/v1",
      model: "gemini-3-flash-preview",
      provider: "local-luca",
      voiceModel: "gemini-3-flash-preview",
      visionModel: "gemini-3-flash-preview",
      memoryModel: "nomic-embed-text",
      temperature: 0.7,
      autoContextWindow: true,
      preferOllama: true,
      conversationMode: "fast",
      activePluginId: null,
      embeddingModel: "nomic-embed-text",
    },
    memory: { provider: "local-luca", model: "nomic-embed-text", sovereignFacts: [] },
    voice: {
      provider: "local-luca",
      googleApiKey: "",
      voiceId: "piper-amy",
      rate: 1,
      pitch: 1,
      style: "Natural",
      pacing: "Normal",
      voiceModel: "gemini-3-flash-preview",
      sttModel: "whisper-tiny",
      wakeWordEnabled: false,
    },
    iot: { haUrl: "", haToken: "" },
    connectors: {
      whatsapp: false,
      telegram: false,
      linkedin: false,
      google: false,
      youtube: false,
      twitter: false,
      instagram: false,
      discord: false,
      signal: false,
      notion: false,
      obsidian: false,
    },
    telegram: { apiId: "", apiHash: "", phoneNumber: "" },
    lucaLink: { enabled: false, connectionMode: "auto", relayServerUrl: "", vpnServerUrl: "" },
    mcp: { servers: [] },
    mobile: { offlineModel: "none", offlineModelDownloaded: false },
    socialPersistence: {},
    privacy: { micEnabled: true, cameraEnabled: true, screenEnabled: true, telemetryEnabled: false },
    autonomy: {
      backgroundMissionsEnabled: false,
      shadowExecutionEnabled: false,
      doubleBrainConsensus: false,
      resourceAwareThrottling: true,
      idleThresholdMinutes: 10,
    },
  };
}

const localRuntime: RuntimeLocalRuntimeDiagnostics = {
  ollama: { available: false, installed: true, installedModelCount: 0 },
  cortex: { available: "unknown" },
};

describe("RuntimeDiagnosticsService pure logic", () => {
  it("calculates route severity", () => {
    expect(severityFromReadiness("ready")).toBe("ready");
    expect(severityFromReadiness("missing_key")).toBe("blocked");
    expect(severityFromReadiness("downloading")).toBe("warning");
  });

  it("generates friendly summaries for blocked routes", () => {
    const route = normalizeRuntimeRoute(
      makeRoute({ readiness: "missing_key", provider: "openai", mode: "byok", keySource: "none", reason: "BYOK openai route requires a vault-backed key." }),
    );
    const summary = buildRuntimeDiagnosticsSummary({
      activeMode: "byok",
      routes: [route],
      onboardingWarnings: [],
    });

    expect(summary.severity).toBe("blocked");
    expect(summary.headline).toBe("BYOK · Missing key");
  });

  it("selects add-key action for missing BYOK keys without exposing raw keys", () => {
    const route = normalizeRuntimeRoute(
      makeRoute({
        readiness: "missing_key",
        provider: "openai",
        mode: "byok",
        reason: "BYOK openai route requires a vault-backed key.",
        warnings: ["openai BYOK key is missing or still redacted without a vault entry."],
        keySource: "none",
      }),
    );

    const actions = selectRecommendedActions({ routes: [route], localRuntime });
    const keySummary = summarizeKeyReadiness([route]);
    const serialized = JSON.stringify({ route, actions, keySummary });

    expect(actions.map((action) => action.id)).toContain("add_byok_key");
    expect(keySummary.sources).toEqual(["none"]);
    expect(serialized).not.toContain("sk-");
    expect(serialized).not.toContain("[SECURED]");
  });

  it("selects runtime/model actions for missing local runtime and model", () => {
    const missingRuntime = normalizeRuntimeRoute(
      makeRoute({ readiness: "missing_runtime", reason: "Local Ollama runtime is not available." }),
    );
    const missingModel = normalizeRuntimeRoute(
      makeRoute({ readiness: "missing_model", reason: "Local chat model is not ready." }),
    );

    const actions = selectRecommendedActions({ routes: [missingRuntime, missingModel], localRuntime });
    expect(actions.map((action) => action.id)).toContain("start_ollama");
    expect(actions.map((action) => action.id)).toContain("open_model_manager");
  });

  it("selects no action for ready routes", () => {
    const route = normalizeRuntimeRoute(makeRoute());
    const actions = selectRecommendedActions({ routes: [route], localRuntime });
    expect(actions).toEqual([
      expect.objectContaining({ id: "none", label: "No action needed" }),
    ]);
  });

  it("filters ready route details away from normal users", () => {
    const ready = normalizeRuntimeRoute(makeRoute());
    const blocked = normalizeRuntimeRoute(makeRoute({ readiness: "missing_runtime" }));

    expect(getVisibleRuntimeRoutesForAudience([ready, blocked], "normal")).toEqual([blocked]);
    expect(getVisibleRuntimeRoutesForAudience([ready, blocked], "tactical")).toEqual([ready, blocked]);
  });

  it("detects tiered audience without overexposing normal users", () => {
    expect(detectRuntimeDiagnosticsAudience(makeSettings())).toBe("normal");
    expect(detectRuntimeDiagnosticsAudience(makeSettings({ debugMode: true }))).toBe("tactical");
    expect(detectRuntimeDiagnosticsAudience(makeSettings({ experimentalMode: true }))).toBe("origin");
  });
});

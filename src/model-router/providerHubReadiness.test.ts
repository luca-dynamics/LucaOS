import { describe, expect, it } from "vitest";
import { getProviderHubEntries, getProviderHubEntry } from "./providerHubRegistry";
import {
  createProviderHubConnectionSnapshot,
  evaluateProviderHubReadiness,
  evaluateProviderHubReadinessForAll,
  getProviderHubResultsRequiringAction,
  getReadyProviderHubResults,
  summarizeProviderHubReadiness,
} from "./providerHubReadiness";

describe("providerHubReadiness", () => {
  it("keeps Luca Prime ready without a user key", () => {
    const result = evaluateProviderHubReadiness({ providerId: "luca_prime", taskType: "chat" });

    expect(result.state).toBe("ready");
    expect(result.ready).toBe(true);
    expect(result.requiredAction).toBe("none");
    expect(result.requiresUserKey).toBe(false);
    expect(result.hasUserKey).toBe(false);
    expect(result.sideEffectsPerformed).toBe(false);
  });

  it("marks Luca Prime disabled when the explicit snapshot disables it", () => {
    const result = evaluateProviderHubReadiness({
      providerId: "luca_prime",
      connectionSnapshot: { providerId: "luca_prime", enabled: false },
    });

    expect(result.state).toBe("disabled");
    expect(result.ready).toBe(false);
    expect(result.requiredAction).toBe("enable_provider");
  });

  it("marks primary cloud and router providers missing_user_key without keys", () => {
    for (const providerId of ["openai", "anthropic", "google_gemini", "xai_grok", "openrouter"] as const) {
      const result = evaluateProviderHubReadiness({ providerId, taskType: "chat" });

      expect(result.state).toBe("missing_user_key");
      expect(result.ready).toBe(false);
      expect(result.requiredAction).toBe("add_api_key");
      expect(result.requiresUserKey).toBe(true);
    }
  });

  it("marks OpenAI ready with a key for chat", () => {
    const result = evaluateProviderHubReadiness({
      providerId: "openai",
      taskType: "chat",
      connectionSnapshot: { providerId: "openai", hasUserKey: true },
    });

    expect(result.state).toBe("ready");
    expect(result.ready).toBe(true);
  });

  it("prioritizes custom OpenAI-compatible key before base URL", () => {
    expect(evaluateProviderHubReadiness({ providerId: "custom_openai_compatible" }).state).toBe("missing_user_key");

    const result = evaluateProviderHubReadiness({
      providerId: "custom_openai_compatible",
      connectionSnapshot: { providerId: "custom_openai_compatible", hasUserKey: true },
    });

    expect(result.state).toBe("missing_base_url");
    expect(result.requiredAction).toBe("set_base_url");
  });

  it("marks custom OpenAI-compatible ready with key and base URL", () => {
    const result = evaluateProviderHubReadiness({
      providerId: "custom_openai_compatible",
      taskType: "chat",
      connectionSnapshot: { providerId: "custom_openai_compatible", hasUserKey: true, hasCustomBaseUrl: true },
    });

    expect(result.state).toBe("ready");
    expect(result.ready).toBe(true);
  });

  it("requires runtime availability for Ollama and LM Studio", () => {
    for (const providerId of ["ollama", "lm_studio"] as const) {
      const result = evaluateProviderHubReadiness({ providerId, taskType: "chat" });

      expect(result.state).toBe("local_runtime_unavailable");
      expect(result.ready).toBe(false);
      expect(result.requiredAction).toBe("start_local_runtime");
    }
  });

  it("marks Ollama ready when the local runtime is available", () => {
    const result = evaluateProviderHubReadiness({
      providerId: "ollama",
      taskType: "chat",
      connectionSnapshot: { providerId: "ollama", localRuntimeAvailable: true },
    });

    expect(result.state).toBe("ready");
    expect(result.ready).toBe(true);
  });

  it("never marks disabled or unknown providers ready", () => {
    expect(evaluateProviderHubReadiness({ providerId: "disabled" })).toMatchObject({ state: "disabled", ready: false, requiredAction: "enable_provider" });
    expect(evaluateProviderHubReadiness({ providerId: "unknown" })).toMatchObject({ state: "unknown", ready: false, requiredAction: "choose_known_provider" });
  });

  it("returns unsupported_task for supported connections with unsupported tasks", () => {
    const result = evaluateProviderHubReadiness({
      providerId: "anthropic",
      taskType: "voice_tts",
      connectionSnapshot: { providerId: "anthropic", hasUserKey: true },
    });

    expect(result.state).toBe("unsupported_task");
    expect(result.requiredAction).toBe("select_supported_model");
  });

  it("returns unsupported_capability and lists missing capabilities", () => {
    const result = evaluateProviderHubReadiness({
      providerId: "perplexity",
      requiredCapabilities: ["text_generation", "vision", "speech_to_text"],
      connectionSnapshot: { providerId: "perplexity", hasUserKey: true },
    });

    expect(result.state).toBe("unsupported_capability");
    expect(result.missingCapabilities).toEqual(["vision", "speech_to_text"]);
  });

  it("evaluates every registry provider in deterministic registry order", () => {
    const results = evaluateProviderHubReadinessForAll({
      taskType: "chat",
      connectionSnapshots: [
        { providerId: "openai", hasUserKey: true },
        { providerId: "ollama", localRuntimeAvailable: true },
        { providerId: "custom_openai_compatible", hasUserKey: true, hasCustomBaseUrl: true },
      ],
    });

    expect(results.map((result) => result.providerId)).toEqual(getProviderHubEntries().map((entry) => entry.providerId));
    expect(results).toHaveLength(18);
    expect(getReadyProviderHubResults(results).map((result) => result.providerId)).toEqual([
      "luca_prime",
      "openai",
      "ollama",
      "custom_openai_compatible",
    ]);
    expect(getProviderHubResultsRequiringAction(results, "add_api_key")).toHaveLength(10);
  });

  it("summarizes readiness counts deterministically", () => {
    const results = evaluateProviderHubReadinessForAll({
      taskType: "chat",
      connectionSnapshots: [
        { providerId: "openai", hasUserKey: true },
        { providerId: "ollama", localRuntimeAvailable: true },
        { providerId: "custom_openai_compatible", hasUserKey: true, hasCustomBaseUrl: true },
      ],
    });

    expect(summarizeProviderHubReadiness(results)).toEqual({
      totalProviders: 18,
      readyProviders: 4,
      providersRequiringAction: 14,
      states: {
        ready: 4,
        missing_user_key: 10,
        missing_base_url: 0,
        local_runtime_unavailable: 2,
        disabled: 1,
        unknown: 1,
        unsupported_task: 0,
        unsupported_capability: 0,
      },
      requiredActions: {
        none: 4,
        connect_provider: 0,
        add_api_key: 10,
        set_base_url: 0,
        start_local_runtime: 2,
        select_supported_model: 0,
        enable_provider: 1,
        choose_known_provider: 1,
      },
    });
  });

  it("does not mutate registry data or snapshots", () => {
    const beforeCapabilities = [...getProviderHubEntry("openai").capabilities];
    const snapshot = Object.freeze(createProviderHubConnectionSnapshot({ providerId: "openai", hasUserKey: true }));

    const result = evaluateProviderHubReadiness({
      providerId: "openai",
      requiredCapabilities: ["text_generation"],
      connectionSnapshot: snapshot,
    });

    expect(result.capabilities).not.toBe(getProviderHubEntry("openai").capabilities);
    expect(snapshot).toEqual({ providerId: "openai", hasUserKey: true });
    expect(getProviderHubEntry("openai").capabilities).toEqual(beforeCapabilities);
  });
});

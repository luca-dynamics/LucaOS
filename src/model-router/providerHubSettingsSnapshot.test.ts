import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getProviderHubEntries, type LucaProviderHubId } from "./providerHubRegistry";
import {
  createProviderHubReadinessFromSettings,
  createProviderHubSnapshotsFromSettings,
  normalizeLocalRuntimeAvailability,
  normalizeProviderKeyPresence,
  type LucaProviderHubSettingsSnapshotInput,
} from "./providerHubSettingsSnapshot";

function snapshotById(input: LucaProviderHubSettingsSnapshotInput) {
  return new Map(createProviderHubSnapshotsFromSettings(input).map((snapshot) => [snapshot.providerId, snapshot]));
}

describe("providerHubSettingsSnapshot", () => {
  it("returns one snapshot per Provider Hub registry entry in registry order", () => {
    const snapshots = createProviderHubSnapshotsFromSettings({});

    expect(snapshots.map((snapshot) => snapshot.providerId)).toEqual(getProviderHubEntries().map((entry) => entry.providerId));
    expect(snapshots).toHaveLength(getProviderHubEntries().length);
  });

  it("maps OpenAI, Anthropic, Gemini, xAI, and OpenRouter key presence correctly", () => {
    const snapshots = snapshotById({
      providerKeyPresence: {
        chatgpt: true,
        claude: true,
        gemini: false,
        grok: true,
        openrouter: true,
      },
    });

    expect(snapshots.get("openai")?.hasUserKey).toBe(true);
    expect(snapshots.get("anthropic")?.hasUserKey).toBe(true);
    expect(snapshots.get("google_gemini")?.hasUserKey).toBe(false);
    expect(snapshots.get("xai_grok")?.hasUserKey).toBe(true);
    expect(snapshots.get("openrouter")?.hasUserKey).toBe(true);
  });

  it("maps custom OpenAI-compatible key and base URL correctly", () => {
    const snapshots = snapshotById({
      providerKeyPresence: { "openai-compatible": true },
      customBaseUrl: " https://llm.example.test/v1 ",
    });

    expect(snapshots.get("custom_openai_compatible")).toMatchObject({
      hasUserKey: true,
      hasCustomBaseUrl: true,
    });
  });

  it("keeps missing custom base URL false", () => {
    const snapshots = snapshotById({
      providerKeyPresence: { custom: true },
      customBaseUrl: "   ",
    });

    expect(snapshots.get("custom_openai_compatible")).toMatchObject({
      hasUserKey: true,
      hasCustomBaseUrl: false,
    });
  });

  it("maps Ollama, LM Studio, and internal runtime availability correctly", () => {
    const snapshots = snapshotById({
      localRuntimeAvailability: {
        ollama: true,
        "lm-studio": true,
        "luca-prime": true,
        "local-runtime": false,
      },
    });

    expect(snapshots.get("ollama")?.localRuntimeAvailable).toBe(true);
    expect(snapshots.get("lm_studio")?.localRuntimeAvailable).toBe(true);
    expect(snapshots.get("local_runtime")?.localRuntimeAvailable).toBe(false);
    expect(snapshots.get("luca_prime")?.localRuntimeAvailable).toBe(false);
  });

  it("maps disabledProviderIds to enabled false", () => {
    const snapshots = snapshotById({ disabledProviderIds: ["openai", "ollama"] });

    expect(snapshots.get("openai")?.enabled).toBe(false);
    expect(snapshots.get("ollama")?.enabled).toBe(false);
    expect(snapshots.get("anthropic")?.enabled).toBe(true);
  });

  it("ignores unknown provider key and runtime strings safely", () => {
    expect(normalizeProviderKeyPresence({ providerKeyPresence: { nope: true, openai: true } })).toEqual({ openai: true });
    expect(normalizeLocalRuntimeAvailability({ localRuntimeAvailability: { nope: true, openai: true, ollama: true } })).toEqual({ ollama: true });
  });

  it.each([
    ["chatgpt", "openai"],
    ["claude", "anthropic"],
    ["gemini", "google_gemini"],
    ["grok", "xai_grok"],
    ["openrouter", "openrouter"],
    ["lm-studio", "lm_studio"],
    ["luca-prime", "luca_prime"],
  ] as const)("stores selected model metadata for %s on %s", (selectedProvider, expectedProviderId) => {
    const snapshots = snapshotById({ selectedProvider, selectedModelId: "selected-model" });

    expect(snapshots.get(expectedProviderId as LucaProviderHubId)?.configuredModelId).toBe("selected-model");
    expect([...snapshots.values()].filter((snapshot) => snapshot.configuredModelId === "selected-model")).toHaveLength(1);
  });

  it("does not mutate input objects", () => {
    const input = Object.freeze({
      selectedProvider: "chatgpt",
      selectedModelId: "gpt-test",
      providerKeyPresence: Object.freeze({ openai: true, unknownVendor: true }),
      localRuntimeAvailability: Object.freeze({ ollama: true }),
      disabledProviderIds: Object.freeze(["anthropic"] as const),
    });

    createProviderHubSnapshotsFromSettings(input);

    expect(input).toEqual({
      selectedProvider: "chatgpt",
      selectedModelId: "gpt-test",
      providerKeyPresence: { openai: true, unknownVendor: true },
      localRuntimeAvailability: { ollama: true },
      disabledProviderIds: ["anthropic"],
    });
  });

  it("returns expected readiness states from settings snapshots", () => {
    const results = new Map(createProviderHubReadinessFromSettings({
      providerKeyPresence: { openai: true, custom: true },
      localRuntimeAvailability: { ollama: true, "lm-studio": false },
      customBaseUrl: "https://custom.example/v1",
    }, { taskType: "chat" }).map((result) => [result.providerId, result]));

    expect(results.get("openai")?.state).toBe("ready");
    expect(results.get("anthropic")?.state).toBe("missing_user_key");
    expect(results.get("ollama")?.state).toBe("ready");
    expect(results.get("lm_studio")?.state).toBe("local_runtime_unavailable");
    expect(results.get("custom_openai_compatible")?.state).toBe("ready");
  });

  it("does not import runtime provider adapters", () => {
    const source = readFileSync(join(process.cwd(), "src/model-router/providerHubSettingsSnapshot.ts"), "utf8");

    expect(source).not.toContain("ProviderFactory");
    expect(source).not.toContain("Adapter");
    expect(source).not.toContain("settingsService");
  });

  it("does not contain environment, localStorage, or network behavior", () => {
    const source = readFileSync(join(process.cwd(), "src/model-router/providerHubSettingsSnapshot.ts"), "utf8");

    expect(source).not.toMatch(/process\.env|import\.meta\.env|localStorage|fetch\(|XMLHttpRequest|WebSocket/);
  });
});

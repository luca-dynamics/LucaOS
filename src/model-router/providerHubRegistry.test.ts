import { describe, expect, it } from "vitest";
import {
  getProviderHubEntries,
  getProviderHubEntriesByCategory,
  getProviderHubEntriesForTask,
  getProviderHubEntriesRequiringUserKey,
  getProviderHubEntry,
  normalizeProviderHubId,
  providerHasCapability,
  providerSupportsTask,
  summarizeProviderHubRegistry,
  type LucaProviderHubId,
} from "./providerHubRegistry";
import { CANONICAL_PROVIDER_IDS } from "../shared/llm/providerIds.js";

const expectedProviderIds: readonly LucaProviderHubId[] = [
  "luca_prime",
  "openai",
  "anthropic",
  "google_gemini",
  "xai_grok",
  "openrouter",
  "mistral",
  "deepseek",
  "groq",
  "together",
  "fireworks",
  "perplexity",
  "ollama",
  "lm_studio",
  "custom_openai_compatible",
  "local_runtime",
  "disabled",
  "unknown",
];

describe("providerHubRegistry", () => {
  it("contains all expected providers with stable ids", () => {
    expect(getProviderHubEntries().map((entry) => entry.providerId)).toEqual(expectedProviderIds);
  });

  it("keeps Luca Prime managed without requiring a user key", () => {
    const lucaPrime = getProviderHubEntry("luca_prime");

    expect(lucaPrime.category).toBe("luca_managed");
    expect(lucaPrime.requiresUserKey).toBe(false);
    expect(lucaPrime.supportsApiKeyConnection).toBe(false);
  });

  it("marks connected cloud providers as API-key based user-key providers", () => {
    const connectedCloudProviders = getProviderHubEntriesByCategory("connected_cloud");

    expect(connectedCloudProviders.map((entry) => entry.providerId)).toEqual([
      "openai",
      "anthropic",
      "google_gemini",
      "xai_grok",
      "mistral",
      "deepseek",
      "groq",
      "together",
      "fireworks",
      "perplexity",
    ]);
    expect(connectedCloudProviders.every((entry) => entry.requiresUserKey)).toBe(true);
    expect(connectedCloudProviders.every((entry) => entry.supportsApiKeyConnection)).toBe(true);
  });

  it("categorizes router, local runtime, and custom providers", () => {
    expect(getProviderHubEntry("openrouter").category).toBe("router");
    expect(getProviderHubEntry("ollama").category).toBe("local_runtime");
    expect(getProviderHubEntry("lm_studio").category).toBe("local_runtime");
    expect(getProviderHubEntry("custom_openai_compatible").category).toBe("custom");
    expect(getProviderHubEntry("custom_openai_compatible").supportsCustomBaseUrl).toBe(true);
  });

  it("filters providers by task type", () => {
    expect(getProviderHubEntriesForTask("chat").map((entry) => entry.providerId)).toContain("luca_prime");
    expect(getProviderHubEntriesForTask("vision").map((entry) => entry.providerId)).toEqual(expect.arrayContaining(["luca_prime", "openai", "google_gemini", "openrouter", "ollama"]));
    expect(getProviderHubEntriesForTask("embedding").map((entry) => entry.providerId)).toEqual(expect.arrayContaining(["luca_prime", "openai", "google_gemini", "mistral", "local_runtime"]));
    expect(getProviderHubEntriesForTask("voice_stt").map((entry) => entry.providerId)).toEqual(expect.arrayContaining(["luca_prime", "groq", "local_runtime"]));
    expect(getProviderHubEntriesForTask("voice_tts").map((entry) => entry.providerId)).toEqual(expect.arrayContaining(["luca_prime", "local_runtime"]));
    expect(getProviderHubEntriesForTask("code").map((entry) => entry.providerId)).toEqual(expect.arrayContaining(["anthropic", "deepseek", "ollama"]));
    expect(getProviderHubEntriesForTask("tool_planning").map((entry) => entry.providerId)).toEqual(expect.arrayContaining(["openai", "anthropic", "local_runtime"]));
    expect(getProviderHubEntriesForTask("long_context").map((entry) => entry.providerId)).toEqual(expect.arrayContaining(["openai", "anthropic", "perplexity"]));
  });

  it("checks task support and capabilities", () => {
    expect(providerSupportsTask("luca_prime", "voice_tts")).toBe(true);
    expect(providerSupportsTask("disabled", "chat")).toBe(false);
    expect(providerHasCapability("ollama", "local_only")).toBe(true);
    expect(providerHasCapability("openai", "vision")).toBe(true);
    expect(providerHasCapability("perplexity", "speech_to_text")).toBe(false);
  });

  it("normalizes common provider aliases", () => {
    expect(normalizeProviderHubId("openai")).toBe("openai");
    expect(normalizeProviderHubId("chatgpt")).toBe("openai");
    expect(normalizeProviderHubId("gpt")).toBe("openai");
    expect(normalizeProviderHubId("anthropic")).toBe("anthropic");
    expect(normalizeProviderHubId("claude")).toBe("anthropic");
    expect(normalizeProviderHubId("google")).toBe("google_gemini");
    expect(normalizeProviderHubId("gemini")).toBe("google_gemini");
    expect(normalizeProviderHubId("xai")).toBe("xai_grok");
    expect(normalizeProviderHubId("grok")).toBe("xai_grok");
    expect(normalizeProviderHubId("openrouter")).toBe("openrouter");
    expect(normalizeProviderHubId("ollama")).toBe("ollama");
    expect(normalizeProviderHubId("lmstudio")).toBe("lm_studio");
    expect(normalizeProviderHubId("lm-studio")).toBe("lm_studio");
    expect(normalizeProviderHubId("luca")).toBe("luca_prime");
    expect(normalizeProviderHubId("luca-prime")).toBe("luca_prime");
    expect(normalizeProviderHubId("luca_prime")).toBe("luca_prime");
    expect(normalizeProviderHubId("not-a-provider")).toBe("unknown");
  });

  it("summarizes registry counts deterministically", () => {
    expect(summarizeProviderHubRegistry()).toEqual({
      totalProviders: 18,
      categories: {
        luca_managed: 1,
        connected_cloud: 10,
        router: 1,
        local_runtime: 3,
        custom: 1,
        disabled: 2,
      },
      providersRequiringUserKey: 12,
      providersSupportingCustomBaseUrl: 3,
      providersSupportingApiKeyConnection: 12,
      providersSupportingOAuthLikeConnection: 0,
    });
  });

  it("exposes deterministic helpers without mutating registry state", () => {
    const before = summarizeProviderHubRegistry();
    const firstEntries = getProviderHubEntries();
    const secondEntries = getProviderHubEntries();

    expect(firstEntries).toBe(secondEntries);
    expect(getProviderHubEntriesRequiringUserKey()).toHaveLength(12);
    expect(summarizeProviderHubRegistry()).toEqual(before);
  });
});

describe("providerHubRegistry → the core's provider vocabulary", () => {
  const canonicalById = Object.fromEntries(
    getProviderHubEntries().map((entry) => [
      entry.providerId,
      entry.canonicalProviderId,
    ]),
  );

  it("maps every display id, so the mapping cannot be partial", () => {
    // Golden and total: these display ids are the UI's vocabulary and the values
    // are the core's. Written out rather than derived because the whole point of
    // the field is that a reader can see which selections reach a provider.
    expect(canonicalById).toEqual({
      luca_prime: "gemini",
      openai: "openai",
      anthropic: "anthropic",
      google_gemini: "gemini",
      xai_grok: "xai",
      openrouter: "openrouter",
      mistral: "mistral",
      deepseek: "deepseek",
      groq: "groq",
      together: null,
      fireworks: null,
      perplexity: null,
      ollama: "ollama",
      lm_studio: null,
      custom_openai_compatible: null,
      local_runtime: "cortex",
      disabled: null,
      unknown: null,
    });
    expect(Object.keys(canonicalById)).toEqual(expectedProviderIds);
  });

  it("names only providers the core can actually route to", () => {
    for (const entry of getProviderHubEntries()) {
      if (entry.canonicalProviderId === null) continue;
      expect(
        CANONICAL_PROVIDER_IDS,
        `${entry.providerId} → ${entry.canonicalProviderId}`,
      ).toContain(entry.canonicalProviderId);
    }
  });

  it("offers every provider the core can route to somewhere in the UI", () => {
    // Surjective today. A canonical id absent from the hub would be a provider
    // the core can reach that no user can select.
    const offered = new Set(
      Object.values(canonicalById).filter(
        (id): id is NonNullable<typeof id> => id !== null,
      ),
    );
    expect([...CANONICAL_PROVIDER_IDS].filter((id) => !offered.has(id))).toEqual(
      [],
    );
  });

  it("distinguishes 'the core cannot reach it' from 'not a provider'", () => {
    // Both are null, for different reasons, and the difference decides what the
    // UI owes the user: a Together AI selection is a gap to close, a `disabled`
    // one is working as intended.
    const unreachable = getProviderHubEntries()
      .filter(
        (entry) =>
          entry.canonicalProviderId === null && entry.category !== "disabled",
      )
      .map((entry) => entry.providerId);
    expect(unreachable).toEqual([
      "together",
      "fireworks",
      "perplexity",
      "lm_studio",
      "custom_openai_compatible",
    ]);

    const notProviders = getProviderHubEntries()
      .filter((entry) => entry.category === "disabled")
      .map((entry) => entry.providerId);
    expect(notProviders).toEqual(["disabled", "unknown"]);
    for (const id of notProviders) {
      expect(canonicalById[id]).toBeNull();
    }
  });

  it("lets two display ids share one core provider", () => {
    // Not injective, deliberately: Luca Prime is Gemini-backed today, which is an
    // implementation detail the UI keeps to itself. A test that asserted a
    // one-to-one map would force that detail into the open to stay green.
    expect(canonicalById.luca_prime).toBe(canonicalById.google_gemini);
    expect(getProviderHubEntry("luca_prime").requiresUserKey).toBe(false);
    expect(getProviderHubEntry("google_gemini").requiresUserKey).toBe(true);
  });
});

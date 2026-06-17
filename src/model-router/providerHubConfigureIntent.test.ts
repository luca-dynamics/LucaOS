import { describe, expect, it } from "vitest";
import providerHubConfigureIntentSource from "./providerHubConfigureIntent.ts?raw";
import {
  createProviderHubConfigureIntent,
  createProviderHubConfigureIntentDiagnostics,
  createProviderHubConfigureIntentFromCard,
  createProviderHubConfigureIntentsFromViewModel,
  getProviderHubConfigureIntentKind,
} from "./providerHubConfigureIntent";
import { createProviderHubPanelViewModel } from "./providerHubPanelViewModel";
import { getProviderHubEntry } from "./providerHubRegistry";
import { evaluateProviderHubReadiness } from "./providerHubReadiness";

function intentFor(providerId: Parameters<typeof evaluateProviderHubReadiness>[0]["providerId"], connectionSnapshot = { providerId }) {
  const entry = getProviderHubEntry(providerId);
  const readiness = evaluateProviderHubReadiness({ providerId, connectionSnapshot });
  return createProviderHubConfigureIntent(entry, readiness);
}

describe("providerHubConfigureIntent", () => {
  it("creates an add_api_key intent for missing OpenAI keys", () => {
    const intent = intentFor("openai");

    expect(intent.intentKind).toBe("add_api_key");
    expect(intent.requiredAction).toBe("add_api_key");
    expect(intent.primaryLabel).toBe("Add API key");
  });

  it("creates a set_base_url intent for custom OpenAI-compatible providers missing a base URL", () => {
    const intent = intentFor("custom_openai_compatible", { providerId: "custom_openai_compatible", hasUserKey: true });

    expect(intent.intentKind).toBe("set_base_url");
    expect(intent.requiredAction).toBe("set_base_url");
  });

  it("creates start_local_runtime intents for unavailable Ollama and LM Studio runtimes", () => {
    expect(intentFor("ollama").intentKind).toBe("start_local_runtime");
    expect(intentFor("lm_studio").intentKind).toBe("start_local_runtime");
  });

  it("creates a managed Luca Prime review intent without requesting a key", () => {
    const intent = intentFor("luca_prime");

    expect(intent.intentKind).toBe("connect_managed");
    expect(intent.requiredAction).toBe("none");
    expect(intent.primaryLabel).toBe("Review Luca Prime");
    expect(intent.description).toMatch(/No user API key is required/);
    expect(intent.intentKind).not.toBe("add_api_key");
  });

  it("creates an unsupported intent for unknown providers", () => {
    const intent = intentFor("unknown");

    expect(intent.intentKind).toBe("unsupported");
    expect(intent.requiredAction).toBe("choose_known_provider");
  });

  it("keeps all side-effect flags false", () => {
    const intent = intentFor("openai");

    expect(intent.sideEffectsPerformed).toBe(false);
    expect(intent.settingsWritePerformed).toBe(false);
    expect(intent.providerApiCalled).toBe(false);
    expect(intent.runtimeStarted).toBe(false);
  });

  it("emits diagnostics that exclude secret-like values", () => {
    const intent = intentFor("openai", { providerId: "openai", configuredModelId: "sk-secret-localStorage-bearer-header" });
    const diagnostics = createProviderHubConfigureIntentDiagnostics(intent);

    expect(diagnostics).toContain("providerId=openai");
    expect(diagnostics).toContain("settingsWritePerformed=false");
    expect(diagnostics).toContain("providerApiCalled=false");
    expect(diagnostics).not.toMatch(/sk-secret|raw secret|env|localStorage|request body|raw headers|authorization|bearer|provider api response/i);
  });

  it("creates deterministic intents from cards and view models without mutating input", () => {
    const viewModel = createProviderHubPanelViewModel([{ providerId: "luca_prime" }, { providerId: "openai" }]);
    const before = JSON.stringify(viewModel);
    const card = viewModel.sections.flatMap((section) => section.cards).find((candidate) => candidate.entry.providerId === "openai")!;

    const first = createProviderHubConfigureIntentFromCard(card);
    const second = createProviderHubConfigureIntentFromCard(card);
    const fromViewModel = createProviderHubConfigureIntentsFromViewModel(viewModel);

    expect(first).toEqual(second);
    expect(fromViewModel.map((intent) => intent.providerId)).toContain("openai");
    expect(JSON.stringify(viewModel)).toBe(before);
  });

  it("maps unsupported task/capability and disabled states to safe intent kinds", () => {
    const unsupportedTask = evaluateProviderHubReadiness({ providerId: "perplexity", taskType: "vision", connectionSnapshot: { providerId: "perplexity", hasUserKey: true } });
    const disabled = evaluateProviderHubReadiness({ providerId: "openai", connectionSnapshot: { providerId: "openai", enabled: false } });

    expect(getProviderHubConfigureIntentKind(unsupportedTask)).toBe("unsupported");
    expect(getProviderHubConfigureIntentKind(disabled)).toBe("review_provider");
  });

  it("does not import runtime, settings, network, or storage boundaries", () => {
    expect(providerHubConfigureIntentSource).not.toMatch(/ProviderFactory|providerAdapters|settingsService|localStorage|process\.env|fetch\(|WebSocket|XMLHttpRequest/);
  });
});

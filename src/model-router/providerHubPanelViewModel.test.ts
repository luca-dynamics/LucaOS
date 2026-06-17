import { describe, expect, it } from "vitest";
import { createProviderHubDiagnosticsText, createProviderHubPanelViewModel } from "./providerHubPanelViewModel";
import { getProviderHubEntry } from "./providerHubRegistry";
import { evaluateProviderHubReadiness } from "./providerHubReadiness";

describe("providerHubPanelViewModel", () => {
  it("builds the Provider Hub title and deterministic sections", () => {
    const viewModel = createProviderHubPanelViewModel();

    expect(viewModel.title).toBe("Provider Hub");
    expect(viewModel.sections.map((section) => section.title)).toEqual([
      "Luca Managed",
      "Connected Cloud",
      "Router",
      "Local Runtime",
      "Custom / BYOK",
    ]);
  });

  it("includes Luca Prime, OpenAI, Anthropic, and OpenRouter cards", () => {
    const cards = createProviderHubPanelViewModel().sections.flatMap((section) => section.cards);
    const providerIds = cards.map((card) => card.entry.providerId);

    expect(providerIds).toContain("luca_prime");
    expect(providerIds).toContain("openai");
    expect(providerIds).toContain("anthropic");
    expect(providerIds).toContain("openrouter");
  });

  it("maps readiness states from snapshot input", () => {
    const cards = createProviderHubPanelViewModel([
      { providerId: "luca_prime" },
      { providerId: "openai", hasUserKey: true, configuredModelId: "gpt-example" },
      { providerId: "ollama", localRuntimeAvailable: true, configuredModelId: "llama-example" },
      { providerId: "custom_openai_compatible", hasUserKey: true },
    ]).sections.flatMap((section) => section.cards);

    expect(cards.find((card) => card.entry.providerId === "luca_prime")?.readiness.state).toBe("ready");
    expect(cards.find((card) => card.entry.providerId === "openai")?.readiness.state).toBe("ready");
    expect(cards.find((card) => card.entry.providerId === "ollama")?.readiness.state).toBe("ready");
    expect(cards.find((card) => card.entry.providerId === "custom_openai_compatible")?.readiness.state).toBe("missing_base_url");
  });

  it("keeps diagnostics free of secret-like values", () => {
    const result = evaluateProviderHubReadiness({
      providerId: "openai",
      connectionSnapshot: { providerId: "openai", hasUserKey: true, configuredModelId: "sk-secret-should-not-appear" },
    });
    const diagnostics = createProviderHubDiagnosticsText(result, getProviderHubEntry("openai"));

    expect(diagnostics).toContain("providerId=openai");
    expect(diagnostics).toContain("sideEffectsPerformed=false");
    expect(diagnostics).not.toMatch(/sk-secret|authorization|bearer|localStorage|headers|request body/i);
  });
});

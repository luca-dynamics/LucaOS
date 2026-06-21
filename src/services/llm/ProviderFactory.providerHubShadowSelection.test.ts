import providerFactorySource from "./ProviderFactory.ts?raw";
import { beforeAll, describe, expect, it } from "vitest";
import type { LucaSettings } from "../settingsService";

beforeAll(() => {
  process.env.LUCA_VAULT_KEY = "0".repeat(64);
});

describe("ProviderFactory shadow Provider Hub route diagnostics", () => {
  it("returns optional shadow diagnostics while preserving the selected route", async () => {
    const { ProviderFactory } = await import("./ProviderFactory");
    const brain = { model: "gpt-4o", provider: "byok", useCustomApiKey: true, openaiApiKey: "sk-secret-value" } as LucaSettings["brain"];
    const status = ProviderFactory.resolveProvisioningRouteWithDiagnostics(brain);

    expect(status.route).toEqual({ kind: "BYOK", provider: "openai", model: "gpt-4o", apiKeySource: "user_settings" });
    expect(status.providerHubShadowSelection).toBeDefined();
    expect(status.providerHubShadowSelection?.currentProviderId).toBe("openai");
    expect(status.providerHubShadowSelection?.runtimeExecutionChanged).toBe(false);
    expect(status.providerHubShadowSelection?.providerAdapterInstantiated).toBe(false);
    expect(ProviderFactory.getLastProviderHubShadowSelection()).toEqual(status.providerHubShadowSelection);
    expect(status.providerHubShadowSelection?.safeDiagnosticsText).not.toContain("sk-secret-value");
    expect(status.providerHubRouteHandoff).toBeDefined();
    expect(status.providerHubRouteHandoff?.providerApiCalled).toBe(false);
    expect(status.providerHubRouteHandoff?.providerAdapterInstantiated).toBe(false);
    expect(status.providerHubRouteHandoff?.safeDiagnosticsText).not.toContain("sk-secret-value");
  });

  it("keeps adapter creation routed through the existing ProviderFactory path", () => {
    const source = providerFactorySource;
    expect(source).toContain("return this.createProviderForRoute(route, settings)");
    expect(source).not.toMatch(/createProviderForRoute\(shadow|providerHubSelectedProviderId\)/);
    expect(source).not.toMatch(/testProviderHubConnection|startLocal|ollama serve|App\.tsx/);
  });
});

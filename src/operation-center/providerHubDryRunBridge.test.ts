import { createProviderFactoryProviderHubDryRunComparison } from "../model-router/providerHubProviderFactoryDryRun";
import { describe, expect, it } from "vitest";
import { createProviderFactoryDryRunOperationItems } from "./providerHubDryRunBridge";

describe("ProviderFactory dry-run Operation Center bridge", () => {
  it("creates a read-only dry-run comparison item", () => {
    const [item] = createProviderFactoryDryRunOperationItems(createProviderFactoryProviderHubDryRunComparison({
      currentProviderId: "openai",
      currentModelId: "gpt-4o",
      taskType: "chat",
      requiredCapabilities: ["text_generation"],
      routePreference: "managed_first",
      connectionSnapshots: [{ providerId: "luca_prime", enabled: true, configuredModelId: "gemini-2.5-pro" }],
      allowFallbacks: true,
      allowPaidProviders: true,
      allowLocalProviders: true,
      allowCloudProviders: true,
    }));
    expect(item.source).toBe("provider_hub");
    expect(item.category).toBe("model_mesh");
    expect(item.title).toBe("ProviderFactory dry-run comparison");
    expect(item.status).toBe("ready_for_review");
    expect(item.canExecute).toBe(false);
    expect(item.executionEnabled).toBe(false);
    expect(item.sideEffectsPerformed).toBe(false);
    expect(item.blockedActions).toEqual(expect.arrayContaining(["ProviderFactory execution", "provider adapter import", "provider API call", "connection test"]));
  });
});

import { describe, expect, it } from "vitest";
import { selectProviderHubRuntimeRoute } from "../model-router/providerHubRuntimeRouteSelection";
import { createProviderHubRuntimeRouteSelectionGuardItems } from "./providerHubRuntimeRouteSelectionBridge";

describe("Provider Hub runtime route selection Operation Center bridge", () => {
  it("creates a read-only disabled/default guard item", () => {
    const [item] = createProviderHubRuntimeRouteSelectionGuardItems(selectProviderHubRuntimeRoute({
      runtimeRouteSelectionEnabled: false,
      taskType: "chat",
      requiredCapabilities: ["text_generation"],
      routePreference: "balanced",
      connectionSnapshots: [],
      allowFallbacks: true,
      allowPaidProviders: true,
      allowLocalProviders: true,
      allowCloudProviders: true,
    }));
    expect(item.source).toBe("provider_hub");
    expect(item.category).toBe("model_mesh");
    expect(item.title).toBe("Provider Hub runtime route selection guard");
    expect(item.status).toBe("ready_for_review");
    expect(item.canExecute).toBe(false);
    expect(item.sideEffectsPerformed).toBe(false);
    expect(item.executionEnabled).toBe(false);
  });
});

import { createProviderHubShadowRouteTrace } from "../model-router/providerHubShadowRouteTrace";
import { createProviderHubShadowRouteTraceItems } from "./providerHubShadowRouteTraceBridge";

describe("Provider Hub shadow route trace Operation Center bridge", () => {
  it("creates a read-only item", () => {
    const [item] = createProviderHubShadowRouteTraceItems(createProviderHubShadowRouteTrace({
      currentProviderId: "openai",
      currentRouteMode: "cloud",
      taskType: "chat",
      requiredCapabilities: ["text_generation"],
      routePreference: "balanced",
      connectionSnapshots: [{ providerId: "luca_prime", enabled: true }],
      allowFallbacks: true,
      allowPaidProviders: true,
      allowLocalProviders: true,
      allowCloudProviders: true,
      trigger: "operation_center_fixture",
      observedAt: "2026-06-20T00:00:00.000Z",
    }));
    expect(item.source).toBe("provider_hub");
    expect(item.category).toBe("model_mesh");
    expect(item.title).toBe("Provider Hub shadow route trace");
    expect(item.canExecute).toBe(false);
    expect(item.executionEnabled).toBe(false);
    expect(item.readyForExecution).toBe(false);
    expect(item.sideEffectsPerformed).toBe(false);
    expect(item.blockedActions).toEqual(expect.arrayContaining(["ProviderFactory execution", "runtime route switch", "provider API call", "connection test", "settings write"]));
  });
});

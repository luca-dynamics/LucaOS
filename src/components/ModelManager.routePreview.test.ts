import modelManagerSource from "./ModelManager.tsx?raw";
import { describe, expect, it } from "vitest";
import { createProviderHubRouteDecision } from "../model-router/providerHubRoutePlanner";
import { createProviderHubSettingsSnapshots } from "../model-router/providerHubSettingsSnapshot";

describe("ModelManager Provider Hub route preview", () => {
  it("creates a default chat balanced route decision from settings snapshots", () => {
    const snapshots = createProviderHubSettingsSnapshots({ settings: { brain: {}, general: {}, providerHub: {} }, ollamaAvailable: false });
    const decision = createProviderHubRouteDecision({
      taskType: "chat",
      requiredCapabilities: ["text_generation"],
      preference: "balanced",
      connectionSnapshots: snapshots,
      allowFallbacks: true,
      allowPaidProviders: true,
      allowLocalProviders: true,
      allowCloudProviders: true,
    });

    expect(decision.status).toBe("selected");
    expect(decision.selectedProviderId).toBe("luca_prime");
    expect(decision.sideEffectsPerformed).toBe(false);
    expect(decision.providerApiCalled).toBe(false);
    expect(decision.runtimeRoutingChanged).toBe(false);
  });

  it("wires preview controls without importing runtime factories or adapters", () => {
    expect(modelManagerSource).toContain("Route Preview");
    expect(modelManagerSource).toContain("createProviderHubRouteDecision");
    expect(modelManagerSource).not.toMatch(/ProviderFactory|ProviderAdapter/);
  });
});

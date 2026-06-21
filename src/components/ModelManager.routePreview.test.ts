import modelManagerSource from "./ModelManager.tsx?raw";
import { describe, expect, it } from "vitest";
import { createProviderHubRouteDecision } from "../model-router/providerHubRoutePlanner";
import { createProviderHubRouteRequestFromPolicy, resolveProviderHubTaskRoutePolicy } from "../model-router/providerHubTaskRoutePolicies";
import { createProviderHubSettingsSnapshots } from "../model-router/providerHubSettingsSnapshot";

describe("ModelManager Provider Hub route preview", () => {
  it("creates a default chat balanced route decision from settings snapshots", () => {
    const snapshots = createProviderHubSettingsSnapshots({ settings: { brain: {}, general: {}, providerHub: {} }, ollamaAvailable: false });
    const decision = createProviderHubRouteDecision(createProviderHubRouteRequestFromPolicy(resolveProviderHubTaskRoutePolicy({ taskType: "chat" }), { connectionSnapshots: snapshots }));

    expect(decision.status).toBe("selected");
    expect(decision.selectedProviderId).toBe("luca_prime");
    expect(decision.sideEffectsPerformed).toBe(false);
    expect(decision.providerApiCalled).toBe(false);
    expect(decision.runtimeRoutingChanged).toBe(false);
  });

  it("wires preview controls without importing runtime factories or adapters", () => {
    expect(modelManagerSource).toContain("Route Preview");
    expect(modelManagerSource).toContain("Emergency Provider Hub runtime kill switch");
    expect(modelManagerSource).toContain("Forces Luca to ignore Provider Hub runtime handoff and use the current ProviderFactory route.");
    expect(modelManagerSource).toContain("runtimeRouteKillSwitchEnabled");
    expect(modelManagerSource).toContain("createProviderHubRouteDecision");
    expect(modelManagerSource).toContain("resolveProviderHubTaskRoutePolicy");
    expect(modelManagerSource).toContain("createProviderHubRouteRequestFromPolicy");
    expect(modelManagerSource).not.toContain("getRoutePreviewCapabilities");
    expect(modelManagerSource).not.toMatch(/from .*ProviderFactory|from .*ProviderAdapter/);
  });
});

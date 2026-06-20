import { describe, expect, it } from "vitest";
import { createProviderHubRouteDecision } from "../model-router/providerHubRoutePlanner";
import { createProviderHubRouteTraceItems } from "./providerHubRouteTraceBridge";

const decision = createProviderHubRouteDecision({
  taskType: "chat",
  requiredCapabilities: ["text_generation"],
  preference: "balanced",
  connectionSnapshots: [{ providerId: "luca_prime", enabled: true }],
  allowFallbacks: true,
  allowPaidProviders: true,
  allowLocalProviders: true,
  allowCloudProviders: true,
});

describe("Provider Hub route trace bridge", () => {
  it("creates read-only Operation Center route trace items", () => {
    const [item] = createProviderHubRouteTraceItems(decision);
    expect(item.source).toBe("provider_hub");
    expect(item.category).toBe("model_mesh");
    expect(item.title).toBe("Provider Hub route preview");
    expect(item.sideEffectsPerformed).toBe(false);
    expect(item.canExecute).toBe(false);
    expect(item.executionEnabled).toBe(false);
    expect(item.blockedActions).toContain("provider API call");
  });

  it("keeps audit details safe and secret-free", () => {
    const [item] = createProviderHubRouteTraceItems(decision);
    expect(item.auditSummary).toContain("sideEffectsPerformed=false");
    expect(item.auditSummary).not.toMatch(/sk-|api[_-]?key|secret|token/i);
  });
});

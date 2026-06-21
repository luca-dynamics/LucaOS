import { describe, expect, it } from "vitest";
import { createProviderHubRouteHandoffGuardItems } from "./providerHubRouteHandoffBridge";
import { createProviderHubProviderFactoryRouteHandoff } from "../model-router/providerHubProviderFactoryRouteHandoff";

describe("providerHubRouteHandoffBridge", () => {
  it("creates a non-executable Operation Center item for route handoff diagnostics", () => {
    const [item] = createProviderHubRouteHandoffGuardItems(createProviderHubProviderFactoryRouteHandoff({
      runtimeRouteSelectionEnabled: true,
      providerHubSelectedProviderId: "openai",
      providerHubSelectedModelId: "gpt-4o",
      decisionStatus: "selected",
      shouldUseProviderHubRoute: true,
      currentRoute: { kind: "LUCA_PRIME", provider: "gemini", model: "gemini-1.5-pro" },
      settings: { openaiApiKey: "sk-secret-value" } as any,
      taskType: "chat",
      requiredCapabilities: ["text_generation"],
    }));

    expect(item.title).toBe("Provider Hub route handoff guard");
    expect(item.canExecute).toBe(false);
    expect(item.executionEnabled).toBe(false);
    expect(item.sideEffectsPerformed).toBe(false);
    expect(item.auditSummary).not.toContain("sk-secret-value");
    expect(item.auditSummary).toContain("actualProviderFactoryRoute=BYOK:openai:gpt-4o");
  });
});

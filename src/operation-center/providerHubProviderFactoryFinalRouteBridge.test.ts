import { describe, expect, it } from "vitest";
import { createProviderFactoryFinalRouteGuardItems } from "./providerHubProviderFactoryFinalRouteBridge";
import type { LucaProviderFactoryFinalRouteDecision } from "../services/llm/ProviderFactory";

describe("ProviderFactory final route guard Operation Center bridge", () => {
  it("creates a read-only diagnostic item for final route choice", () => {
    const decision: LucaProviderFactoryFinalRouteDecision = {
      currentRoute: { kind: "LUCA_PRIME", provider: "gemini", model: "gemini-1.5-pro" },
      handoffRoute: { kind: "BYOK", provider: "openai", model: "gpt-4o", apiKeySource: "user_settings" },
      fallbackRoute: { kind: "LUCA_PRIME", provider: "gemini", model: "gemini-1.5-pro" },
      finalRoute: { kind: "BYOK", provider: "openai", model: "gpt-4o", apiKeySource: "user_settings" },
      usedProviderHubHandoff: true,
      routeSource: "provider_hub_handoff",
      flagDisabledRestoresCurrentRoute: true,
      handoffStatus: "mapped",
      reason: "mapped",
      safeDiagnosticsText: "safe diagnostics without secrets",
      providerApiCalledDuringSelection: false,
      providerAdapterInstantiatedByHandoffMapper: false,
      runtimeExecutionChanged: true,
    };
    const [item] = createProviderFactoryFinalRouteGuardItems(decision);
    expect(item.title).toBe("ProviderFactory final route guard");
    expect(item.summary).toContain("Current route: LUCA_PRIME:gemini:gemini-1.5-pro");
    expect(item.summary).toContain("handoff route: BYOK:openai:gpt-4o");
    expect(item.summary).toContain("final route: BYOK:openai:gpt-4o");
    expect(item.canExecute).toBe(false);
    expect(item.executionEnabled).toBe(false);
    expect(item.summary).toContain("route source: provider_hub_handoff");
    expect(item.summary).toContain("fallback reason code: none");
    expect(item.auditSummary).toContain("fallbackReasonCode=none");
    expect(item.auditSummary).toContain("providerApiCalledDuringSelection=false");
  });
});

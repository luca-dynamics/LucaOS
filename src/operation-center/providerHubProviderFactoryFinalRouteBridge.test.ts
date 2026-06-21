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
      runtimeRouteSelectionEnabled: true,
      runtimeRouteKillSwitchEnabled: false,
      killSwitchForcedCurrentRoute: false,
      safeDiagnosticsText: "safe diagnostics without secrets",
      providerApiCalledDuringSelection: false,
      providerAdapterInstantiatedByHandoffMapper: false,
      runtimeExecutionChanged: true,
    };
    const [item, killSwitchItem] = createProviderFactoryFinalRouteGuardItems(decision);
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
    expect(killSwitchItem.title).toBe("Provider Hub emergency runtime kill switch");
    expect(killSwitchItem.summary).toContain("disabled");
    expect(killSwitchItem.auditSummary).toContain("canExecute=false");
    expect(killSwitchItem.auditSummary).toContain("sideEffectsPerformed=false");
  });

  it("exposes active kill switch override state as a read-only Operation Center item", () => {
    const currentRoute = { kind: "LUCA_PRIME", provider: "gemini", model: "gemini-1.5-pro" } as const;
    const [, killSwitchItem] = createProviderFactoryFinalRouteGuardItems({
      currentRoute,
      handoffRoute: { kind: "BYOK", provider: "openai", model: "gpt-4o", apiKeySource: "user_settings" },
      fallbackRoute: currentRoute,
      finalRoute: currentRoute,
      usedProviderHubHandoff: false,
      routeSource: "current_provider_factory",
      flagDisabledRestoresCurrentRoute: true,
      handoffStatus: "mapped",
      reason: "Provider Hub runtime kill switch active; using current ProviderFactory route.",
      fallbackReasonCode: "kill_switch_enabled",
      fallbackReason: "Provider Hub runtime kill switch active; using current ProviderFactory route.",
      runtimeRouteSelectionEnabled: true,
      runtimeRouteKillSwitchEnabled: true,
      killSwitchForcedCurrentRoute: true,
      safeDiagnosticsText: "safe diagnostics without secrets",
      providerApiCalledDuringSelection: false,
      providerAdapterInstantiatedByHandoffMapper: false,
      runtimeExecutionChanged: false,
    });

    expect(killSwitchItem.summary).toContain("enabled");
    expect(killSwitchItem.summary).toContain("overrides runtime route selection: true");
    expect(killSwitchItem.summary).toContain("current route forced: true");
    expect(killSwitchItem.summary).toContain("Provider Hub handoff ignored: true");
    expect(killSwitchItem.canExecute).toBe(false);
    expect(killSwitchItem.sideEffectsPerformed).toBe(false);
  });
});

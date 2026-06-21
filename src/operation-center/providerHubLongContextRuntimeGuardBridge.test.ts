import { describe, expect, it } from "vitest";
import { createProviderHubLongContextRuntimeGuardItems } from "./providerHubLongContextRuntimeGuardBridge";
import type { LucaProviderHubLongContextRuntimeGuardSummary } from "../services/llm/ProviderFactory";

describe("Provider Hub Long Context runtime guard Operation Center bridge", () => {
  it("creates a read-only Operation Center item", () => {
    const summary: LucaProviderHubLongContextRuntimeGuardSummary = {
      taskType: "long_context",
      requiredCapabilities: ["long_context"],
      preference: "managed_first",
      currentRoute: { kind: "LUCA_PRIME", provider: "gemini", model: "gemini-1.5-pro" },
      handoffRoute: { kind: "BYOK", provider: "openai", model: "gpt-4o", apiKeySource: "user_settings" },
      finalRoute: { kind: "BYOK", provider: "openai", model: "gpt-4o", apiKeySource: "user_settings" },
      routeSource: "provider_hub_handoff",
      runtimeRouteSelectionEnabled: true,
      runtimeRouteKillSwitchEnabled: false,
      killSwitchForcedCurrentRoute: false,
      sideEffectsPerformed: false,
      providerApiCalledDuringSelection: false,
      automaticConnectionTestStarted: false,
      localRuntimeStarted: false,
      providerAdapterInstantiatedByHandoffMapper: false,
      safeDiagnosticsText: "{}",
    };

    const [item] = createProviderHubLongContextRuntimeGuardItems(summary);
    expect(item.title).toBe("Provider Hub long context runtime guard");
    expect(item.summary).toContain("required capabilities: long_context");
    expect(item.summary).toContain("preference: managed_first");
    expect(item.auditSummary).toContain("executionEnabled=false");
    expect(item.canExecute).toBe(false);
    expect(item.executionEnabled).toBe(false);
    expect(item.sideEffectsPerformed).toBe(false);
  });
});

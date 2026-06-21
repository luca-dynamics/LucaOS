import { describe, expect, it } from "vitest";
import { createProviderHubFastReplyRuntimeGuardItems } from "./providerHubFastReplyRuntimeGuardBridge";
import type { LucaProviderHubFastReplyRuntimeGuardSummary } from "../services/llm/ProviderFactory";

describe("Provider Hub Fast Reply runtime guard Operation Center bridge", () => {
  it("creates a read-only Operation Center item", () => {
    const summary: LucaProviderHubFastReplyRuntimeGuardSummary = {
      taskType: "fast_reply",
      requiredCapabilities: ["text_generation"],
      preference: "lowest_latency",
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
    const [item] = createProviderHubFastReplyRuntimeGuardItems(summary);
    expect(item.title).toBe("Provider Hub fast reply runtime guard");
    expect(item.canExecute).toBe(false);
    expect(item.executionEnabled).toBe(false);
    expect(item.sideEffectsPerformed).toBe(false);
    expect(item.auditSummary).toContain("preference=lowest_latency");
  });
});

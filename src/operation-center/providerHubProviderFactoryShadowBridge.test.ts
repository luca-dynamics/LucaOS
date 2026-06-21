import { describe, expect, it } from "vitest";
import { createProviderFactoryShadowSelectionOperationItems } from "./providerHubProviderFactoryShadowBridge";
import type { LucaProviderFactoryShadowSelection } from "../model-router/providerHubProviderFactoryShadowHook";

describe("ProviderFactory shadow selection Operation Center bridge", () => {
  it("emits a read-only trace with execution disabled", () => {
    const [item] = createProviderFactoryShadowSelectionOperationItems({
      currentProviderId: "openai",
      currentModelId: "gpt-4o",
      providerHubSelectedProviderId: "openai",
      providerHubSelectedModelId: "gpt-4o",
      providerHubEnabled: true,
      shouldUseProviderHubRoute: true,
      wouldFallbackToCurrentRuntime: false,
      decisionStatus: "selected",
      matchesCurrentRoute: true,
      reason: "shadow only",
      safeDiagnosticsText: "{}",
      sideEffectsPerformed: false,
      providerApiCalled: false,
      providerAdapterInstantiated: false,
      runtimeExecutionChanged: false,
    } satisfies LucaProviderFactoryShadowSelection);

    expect(item.title).toBe("ProviderFactory shadow selection hook");
    expect(item.summary).toContain("actual runtime unchanged");
    expect(item.canExecute).toBe(false);
    expect(item.executionEnabled).toBe(false);
    expect(item.auditSummary).toContain("runtimeExecutionChanged=false");
    expect(item.blockedActions).toEqual(expect.arrayContaining(["provider API call", "automatic connection test", "local runtime startup"]));
  });
});

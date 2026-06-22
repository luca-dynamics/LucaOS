import { describe, expect, it } from "vitest";
import { createProviderHubCodeRuntimeGuardItems } from "./providerHubCodeRuntimeGuardBridge";
import type { LucaProviderHubCodeRuntimeGuardSummary } from "../services/llm/ProviderFactory";

describe("Provider Hub Code Generation runtime guard Operation Center bridge", () => {
  it("creates a read-only Operation Center item with output-only side-effect flags", () => {
    const summary: LucaProviderHubCodeRuntimeGuardSummary = {
      taskType: "code",
      requiredCapabilities: ["code_generation"],
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
      toolExecutionPerformed: false,
      fileMutationPerformed: false,
      terminalCommandExecuted: false,
      safeDiagnosticsText: '{"taskType":"code","requiredCapabilities":["code_generation"],"toolExecutionPerformed":false,"fileMutationPerformed":false,"terminalCommandExecuted":false}',
    };

    const [item] = createProviderHubCodeRuntimeGuardItems(summary);

    expect(item.title).toBe("Provider Hub code generation runtime guard");
    expect(item.canExecute).toBe(false);
    expect(item.executionEnabled).toBe(false);
    expect(item.sideEffectsPerformed).toBe(false);
    expect(item.summary).toContain("required capability: code_generation");
    expect(item.summary).toContain("tool/file/terminal execution: false/false/false");
    expect(item.auditSummary).toContain("toolExecutionPerformed=false");
    expect(item.auditSummary).toContain("fileMutationPerformed=false");
    expect(item.auditSummary).toContain("terminalCommandExecuted=false");
  });
});

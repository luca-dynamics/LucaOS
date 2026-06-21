import { beforeAll, describe, expect, it } from "vitest";
import { createProviderHubExecutionFallbackGuardItems } from "./providerHubExecutionFallbackBridge";

beforeAll(() => {
  process.env.LUCA_VAULT_KEY = "0".repeat(64);
});

describe("providerHubExecutionFallbackBridge", () => {
  it("creates a read-only Operation Center item for execution fallback diagnostics", () => {
    const [item] = createProviderHubExecutionFallbackGuardItems({
      attemptedRoute: { kind: "BYOK", provider: "openai", model: "gpt-4o", apiKeySource: "user_settings" },
      fallbackRoute: { kind: "LUCA_PRIME", provider: "gemini", model: "gemini-1.5-pro" },
      fallbackAttempted: true,
      fallbackUsed: true,
      trigger: "first_execution_error",
      sanitizedErrorMessage: "token [redacted-api-key] failed at [redacted-path]",
      providerHubHandoffWasActive: true,
      emergencyKillSwitchEnabled: false,
      maxFallbackAttempts: 1,
      fallbackLoopPrevented: false,
      sideEffectsPerformed: false,
      providerApiCalledDuringSelection: false,
      safeDiagnosticsText: JSON.stringify({ sanitizedErrorMessage: "token [redacted-api-key] failed at [redacted-path]" }),
    });

    expect(item.title).toBe("ProviderFactory execution-time fallback guard");
    expect(item.canExecute).toBe(false);
    expect(item.executionEnabled).toBe(false);
    expect(item.sideEffectsPerformed).toBe(false);
    expect(item.auditSummary).toContain("fallbackAttempted=true");
    expect(item.auditSummary).not.toContain("sk-secret-value");
    expect(item.auditSummary).not.toContain("/Users/private/file");
  });
});

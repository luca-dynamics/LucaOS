import { describe, expect, it } from "vitest";
import { createProviderHubTaskRouteDiagnosticsMatrix } from "../model-router/providerHubTaskRouteDiagnosticsMatrix";
import { createProviderHubTaskRouteDiagnosticsMatrixItems } from "./providerHubTaskRouteDiagnosticsMatrixBridge";

describe("Provider Hub task route diagnostics matrix Operation Center bridge", () => {
  it("creates a read-only matrix item with execution blocked", () => {
    const [item] = createProviderHubTaskRouteDiagnosticsMatrixItems(createProviderHubTaskRouteDiagnosticsMatrix({ observedAt: "2026-06-21T12:00:00.000Z", connectionSnapshots: [] }));
    expect(item.title).toBe("Provider Hub task route diagnostics matrix");
    expect(item.source).toBe("provider_hub");
    expect(item.category).toBe("model_mesh");
    expect(item.canExecute).toBe(false);
    expect(item.executionEnabled).toBe(false);
    expect(item.sideEffectsPerformed).toBe(false);
    expect(item.blockedActions).toEqual(expect.arrayContaining(["provider API call", "automatic connection test", "runtime route switch", "provider adapter instantiation", "local runtime startup", "MCP/action execution"]));
  });
});

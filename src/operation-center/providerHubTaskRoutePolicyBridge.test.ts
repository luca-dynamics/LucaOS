import { describe, expect, it } from "vitest";
import { resolveProviderHubTaskRoutePolicy } from "../model-router/providerHubTaskRoutePolicies";
import { createProviderHubTaskRoutePolicyItems } from "./providerHubTaskRoutePolicyBridge";

describe("Provider Hub task route policy Operation Center bridge", () => {
  it("creates read-only diagnostics without execution or secrets", () => {
    const [item] = createProviderHubTaskRoutePolicyItems(resolveProviderHubTaskRoutePolicy({ taskType: "tool_planning" }));
    expect(item.title).toBe("Provider Hub task route policy");
    expect(item.canExecute).toBe(false);
    expect(item.sideEffectsPerformed).toBe(false);
    expect(item.auditSummary).toContain("tool_planning");
    expect(item.auditSummary).not.toMatch(/sk-|apiKey|secret|token/i);
    expect(item.blockedActions).toEqual(expect.arrayContaining(["provider API call", "automatic connection test", "local runtime startup", "MCP/action execution"]));
  });
});

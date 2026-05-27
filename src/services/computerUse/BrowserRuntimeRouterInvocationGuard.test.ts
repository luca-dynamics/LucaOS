import { describe, expect, it } from "vitest";
import { evaluateBrowserRuntimeRouterInvocationReadiness, createBrowserRuntimeRouterInvocationReadinessInputFromSandboxResult } from "./BrowserRuntimeRouterInvocationGuard";
import { ComputerUseSandboxBrowserAdapterResult } from "./types";

const bridgeRequest = {
  requestId: "req-1",
  missionId: "m-1",
  action: "click" as const,
  issuedAt: new Date().toISOString(),
  riskLevel: "safe" as const,
  trustTier: "untrusted" as const,
};

const dryRunPass = { ok: true, metadata: { adapterKind: "browser_runtime_router_dry_run", dryRun: true, realBrowserExecutionEnabled: false, browserRuntimeRouterImported: false, browserRuntimeRouterInstantiated: false, browserRuntimeRouterCalled: false, playwrightCalled: false, browserApisCalled: false, systemApisCalled: false, directHostAllowed: false, requiresExplicitOptIn: true } };

const baseInput = {
  featureFlags: {
    sandboxBrowserAdapterEnabled: true,
    browserRuntimeRouterBridgeEnabled: true,
    browserRuntimeRouterDryRunEnabled: true,
    realBrowserRuntimeRouterEnabled: true,
  },
  bridgeRequest,
  dryRunResult: dryRunPass,
  guardDecision: { status: "allowed" as const, reason: "ok" },
};

describe("BrowserRuntimeRouterInvocationGuard", () => {
  it("blocked when real router flag disabled", () => expect(evaluateBrowserRuntimeRouterInvocationReadiness({ ...baseInput, featureFlags: { ...baseInput.featureFlags, realBrowserRuntimeRouterEnabled: false } }).status).toBe("blocked"));
  it("blocked when sandbox flag disabled", () => expect(evaluateBrowserRuntimeRouterInvocationReadiness({ ...baseInput, featureFlags: { ...baseInput.featureFlags, sandboxBrowserAdapterEnabled: false } }).status).toBe("blocked"));
  it("blocked when router bridge flag disabled", () => expect(evaluateBrowserRuntimeRouterInvocationReadiness({ ...baseInput, featureFlags: { ...baseInput.featureFlags, browserRuntimeRouterBridgeEnabled: false } }).status).toBe("blocked"));
  it("dry_run_required when dry-run flag disabled", () => expect(evaluateBrowserRuntimeRouterInvocationReadiness({ ...baseInput, featureFlags: { ...baseInput.featureFlags, browserRuntimeRouterDryRunEnabled: false } }).status).toBe("dry_run_required"));
  it("dry_run_required when dry-run result missing", () => expect(evaluateBrowserRuntimeRouterInvocationReadiness({ ...baseInput, dryRunResult: undefined }).status).toBe("dry_run_required"));
  it("blocked when dry-run failed", () => expect(evaluateBrowserRuntimeRouterInvocationReadiness({ ...baseInput, dryRunResult: { ...dryRunPass, ok: false, reason: "failed" } }).status).toBe("blocked"));
  it("needs_confirmation when guard needs confirmation", () => expect(evaluateBrowserRuntimeRouterInvocationReadiness({ ...baseInput, guardDecision: { status: "needs_confirmation", reason: "approve" } }).status).toBe("needs_confirmation"));
  it("ready when confirmation approved", () => expect(evaluateBrowserRuntimeRouterInvocationReadiness({ ...baseInput, guardDecision: { status: "needs_confirmation", reason: "approve" }, confirmationResult: { status: "approved" } }).status).toBe("ready"));
  it("blocked when guard denied", () => expect(evaluateBrowserRuntimeRouterInvocationReadiness({ ...baseInput, guardDecision: { status: "denied", reason: "no" } }).status).toBe("blocked"));
  it("blocked on direct-host lane", () => expect(evaluateBrowserRuntimeRouterInvocationReadiness({ ...baseInput, lane: "authenticated_direct_host" }).status).toBe("blocked"));
  it("blocked on critical risk", () => expect(evaluateBrowserRuntimeRouterInvocationReadiness({ ...baseInput, riskLevel: "critical" }).status).toBe("blocked"));
  it("blocked when bridge request missing", () => expect(evaluateBrowserRuntimeRouterInvocationReadiness({ ...baseInput, bridgeRequest: undefined }).status).toBe("blocked"));
  it("ready only when all gates pass", () => expect(evaluateBrowserRuntimeRouterInvocationReadiness(baseInput).status).toBe("ready"));
  it("helper can build input from sandbox adapter metadata", () => {
    const sandboxResult = {
      status: "executed",
      metadata: {
        reason: "ok",
        adapterKind: "sandbox_browser_scaffold",
        sandboxBrowserAdapterEnabled: true,
        browserRuntimeRouterBridgeEnabled: true,
        delegatedToBrowserRuntime: false,
        simulated: true,
        browserRuntimeImported: false,
        browserRuntimeRouterImported: false,
        browserRuntimeRouterCalled: false,
        playwrightCalled: false,
        browserApisCalled: false,
        systemApisCalled: false,
        directHostAllowed: false,
        realBrowserExecutionEnabled: false,
        requiresExplicitOptIn: true,
        routerBridgeRequest: bridgeRequest,
      },
    } as ComputerUseSandboxBrowserAdapterResult;
    const input = createBrowserRuntimeRouterInvocationReadinessInputFromSandboxResult(sandboxResult, { dryRunResult: dryRunPass, guardDecision: { status: "allowed", reason: "ok" } });
    expect(input.bridgeRequest?.requestId).toBe("req-1");
    expect(input.featureFlags?.sandboxBrowserAdapterEnabled).toBe(true);
  });
  it("metadata confirms no BrowserRuntimeRouter/Playwright/browser/system/direct-host calls", () => {
    const result = evaluateBrowserRuntimeRouterInvocationReadiness(baseInput);
    expect(result.metadata).toMatchObject({
      guardKind: "browser_runtime_router_invocation_guard",
      realBrowserExecutionEnabled: false,
      browserRuntimeRouterImported: false,
      browserRuntimeRouterInstantiated: false,
      browserRuntimeRouterCalled: false,
      playwrightCalled: false,
      browserApisCalled: false,
      systemApisCalled: false,
      directHostAllowed: false,
      requiresExplicitOptIn: true,
    });
  });
});

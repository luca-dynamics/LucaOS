import { BrowserRuntimeRouterBridgeRequest } from "./BrowserRuntimeRouterBridge";
import {
  ComputerUseBrowserRuntimeLane,
  ComputerUseBrowserRuntimeRouterDryRunResult,
  ComputerUseBrowserRuntimeRouterInvocationGate,
  ComputerUseBrowserRuntimeRouterInvocationReadinessResult,
  ComputerUseGuardDecision,
  ComputerUseGuardConfirmationResult,
  ComputerUseGuardRiskLevel,
  ComputerUseSandboxBrowserAdapterResult,
} from "./types";

export interface BrowserRuntimeRouterInvocationReadinessFeatureFlags {
  sandboxBrowserAdapterEnabled?: boolean;
  browserRuntimeRouterBridgeEnabled?: boolean;
  browserRuntimeRouterDryRunEnabled?: boolean;
  realBrowserRuntimeRouterEnabled?: boolean;
}

export interface BrowserRuntimeRouterInvocationReadinessInput {
  featureFlags?: BrowserRuntimeRouterInvocationReadinessFeatureFlags;
  bridgeRequest?: BrowserRuntimeRouterBridgeRequest;
  dryRunResult?: ComputerUseBrowserRuntimeRouterDryRunResult;
  guardDecision?: Pick<ComputerUseGuardDecision, "status" | "reason">;
  confirmationResult?: Pick<ComputerUseGuardConfirmationResult, "status">;
  lane?: ComputerUseBrowserRuntimeLane;
  riskLevel?: ComputerUseGuardRiskLevel;
  missionTapeReady?: boolean;
  metadata?: Record<string, unknown>;
}

export interface BrowserRuntimeRouterInvocationReadinessFromSandboxOptions {
  dryRunResult?: ComputerUseBrowserRuntimeRouterDryRunResult;
  guardDecision?: BrowserRuntimeRouterInvocationReadinessInput["guardDecision"];
  confirmationResult?: BrowserRuntimeRouterInvocationReadinessInput["confirmationResult"];
  lane?: ComputerUseBrowserRuntimeLane;
  riskLevel?: ComputerUseGuardRiskLevel;
  missionTapeReady?: boolean;
  metadata?: Record<string, unknown>;
}

export const createBrowserRuntimeRouterInvocationGate = (
  gate: string,
  passed: boolean,
  reason: string,
): ComputerUseBrowserRuntimeRouterInvocationGate => ({ gate, passed, reason });

export const evaluateBrowserRuntimeRouterInvocationReadiness = (
  input: BrowserRuntimeRouterInvocationReadinessInput,
): ComputerUseBrowserRuntimeRouterInvocationReadinessResult => {
  const featureFlags = input.featureFlags ?? {};
  const gates: ComputerUseBrowserRuntimeRouterInvocationGate[] = [];

  const push = (gate: string, passed: boolean, reason: string): boolean => {
    gates.push(createBrowserRuntimeRouterInvocationGate(gate, passed, reason));
    return passed;
  };

  if (!push("real_browser_runtime_router_enabled", featureFlags.realBrowserRuntimeRouterEnabled === true, "Real BrowserRuntimeRouter feature flag must be enabled.")) {
    return blocked(gates);
  }
  if (!push("sandbox_browser_adapter_enabled", featureFlags.sandboxBrowserAdapterEnabled === true, "Sandbox browser adapter feature flag must be enabled.")) {
    return blocked(gates);
  }
  if (!push("browser_runtime_router_bridge_enabled", featureFlags.browserRuntimeRouterBridgeEnabled === true, "BrowserRuntime router bridge feature flag must be enabled.")) {
    return blocked(gates);
  }
  if (!push("lane_not_direct_host", input.lane !== "authenticated_direct_host", "Direct-host lane is not allowed for BrowserRuntime router invocation.")) {
    return blocked(gates);
  }
  if (!push("risk_not_critical", input.riskLevel !== "critical", "Critical risk actions are blocked.")) {
    return blocked(gates);
  }
  if (!push("bridge_request_present", Boolean(input.bridgeRequest), "Router bridge request is required.")) {
    return blocked(gates);
  }

  if (!push("browser_runtime_router_dry_run_enabled", featureFlags.browserRuntimeRouterDryRunEnabled === true, "BrowserRuntime router dry-run feature flag must be enabled.")) {
    return dryRunRequired(gates);
  }
  if (!push("dry_run_result_present", Boolean(input.dryRunResult), "Dry-run result is required before readiness can be ready.")) {
    return dryRunRequired(gates);
  }
  if (!push("dry_run_passed", input.dryRunResult?.ok === true, input.dryRunResult?.reason ?? "Dry-run must pass before invocation can proceed.")) {
    return blocked(gates);
  }

  if (!push("guard_not_denied", input.guardDecision?.status !== "denied", input.guardDecision?.reason ?? "Guard denied BrowserRuntime router invocation.")) {
    return blocked(gates);
  }

  const needsConfirmation = input.guardDecision?.status === "needs_confirmation";
  const approvedConfirmation = input.confirmationResult?.status === "approved";
  if (!push("confirmation_ready", !needsConfirmation || approvedConfirmation, "Guard requires explicit approved confirmation.")) {
    return needsConfirm(gates);
  }

  gates.push(createBrowserRuntimeRouterInvocationGate("readiness_evaluated", true, "All invocation readiness gates passed."));
  return ready(gates);
};

export const createBrowserRuntimeRouterInvocationReadinessInputFromSandboxResult = (
  result: ComputerUseSandboxBrowserAdapterResult,
  options: BrowserRuntimeRouterInvocationReadinessFromSandboxOptions = {},
): BrowserRuntimeRouterInvocationReadinessInput => ({
  featureFlags: {
    sandboxBrowserAdapterEnabled: result?.metadata?.sandboxBrowserAdapterEnabled,
    browserRuntimeRouterBridgeEnabled: result?.metadata?.browserRuntimeRouterBridgeEnabled,
    browserRuntimeRouterDryRunEnabled: options.dryRunResult ? true : undefined,
    realBrowserRuntimeRouterEnabled: false,
  },
  bridgeRequest: result?.metadata?.routerBridgeRequest,
  dryRunResult: options.dryRunResult,
  guardDecision: options.guardDecision,
  confirmationResult: options.confirmationResult,
  lane: options.lane,
  riskLevel: options.riskLevel,
  missionTapeReady: options.missionTapeReady,
  metadata: options.metadata,
});

const baseMetadata = {
  guardKind: "browser_runtime_router_invocation_guard" as const,
  realBrowserExecutionEnabled: false as const,
  browserRuntimeRouterImported: false as const,
  browserRuntimeRouterInstantiated: false as const,
  browserRuntimeRouterCalled: false as const,
  playwrightCalled: false as const,
  browserApisCalled: false as const,
  systemApisCalled: false as const,
  directHostAllowed: false as const,
  requiresExplicitOptIn: true as const,
};

const blocked = (gates: ComputerUseBrowserRuntimeRouterInvocationGate[]): ComputerUseBrowserRuntimeRouterInvocationReadinessResult => ({ status: "blocked", gates, metadata: baseMetadata });
const dryRunRequired = (gates: ComputerUseBrowserRuntimeRouterInvocationGate[]): ComputerUseBrowserRuntimeRouterInvocationReadinessResult => ({ status: "dry_run_required", gates, metadata: baseMetadata });
const needsConfirm = (gates: ComputerUseBrowserRuntimeRouterInvocationGate[]): ComputerUseBrowserRuntimeRouterInvocationReadinessResult => ({ status: "needs_confirmation", gates, metadata: baseMetadata });
const ready = (gates: ComputerUseBrowserRuntimeRouterInvocationGate[]): ComputerUseBrowserRuntimeRouterInvocationReadinessResult => ({ status: "ready", gates, metadata: baseMetadata });

import {
  evaluateBrowserRuntimeRouterInvocationReadiness,
  type BrowserRuntimeRouterInvocationReadinessInput,
} from "./BrowserRuntimeRouterInvocationGuard";
import {
  ComputerUseBrowserRuntimeRouterGuardedAdapterOptions,
  ComputerUseBrowserRuntimeRouterGuardedAdapterSnapshot,
  ComputerUseBrowserRuntimeRouterGuardedInvocationInput,
  ComputerUseBrowserRuntimeRouterGuardedInvocationResult,
} from "./types";

const SHELL_METADATA: ComputerUseBrowserRuntimeRouterGuardedInvocationResult["metadata"] = {
  adapterKind: "browser_runtime_router_guarded_shell",
  shellOnly: true,
  realBrowserExecutionEnabled: false,
  browserRuntimeRouterImported: false,
  browserRuntimeRouterInstantiated: false,
  browserRuntimeRouterCalled: false,
  playwrightCalled: false,
  browserApisCalled: false,
  systemApisCalled: false,
  directHostAllowed: false,
  requiresExplicitOptIn: true,
};

export class BrowserRuntimeRouterGuardedAdapter {
  private readonly now: () => string;
  private readonly onEvent?: ComputerUseBrowserRuntimeRouterGuardedAdapterOptions["onEvent"];

  private snapshot: ComputerUseBrowserRuntimeRouterGuardedAdapterSnapshot = {
    invocationCount: 0,
    blockedCount: 0,
    dryRunRequiredCount: 0,
    needsConfirmationCount: 0,
    readyButNotInvokedCount: 0,
  };

  constructor(options: ComputerUseBrowserRuntimeRouterGuardedAdapterOptions = {}) {
    this.now = options.now ?? (() => new Date().toISOString());
    this.onEvent = options.onEvent;
  }

  invoke(input: ComputerUseBrowserRuntimeRouterGuardedInvocationInput): ComputerUseBrowserRuntimeRouterGuardedInvocationResult {
    this.snapshot.invocationCount += 1;
    this.snapshot.lastInvocationAt = this.now();

    const readinessInput = this.toReadinessInput(input);
    const readiness = evaluateBrowserRuntimeRouterInvocationReadiness(readinessInput);

    const result = this.toShellResult(readiness.status, readinessInput, readiness.gates);
    this.updateCounters(result.status);
    this.snapshot.lastResult = result;
    this.emitEvent(result);
    return result;
  }

  getSnapshot(): ComputerUseBrowserRuntimeRouterGuardedAdapterSnapshot {
    return {
      ...this.snapshot,
      lastResult: this.snapshot.lastResult ? { ...this.snapshot.lastResult, gates: [...this.snapshot.lastResult.gates] } : undefined,
    };
  }

  reset(): void {
    this.snapshot = {
      invocationCount: 0,
      blockedCount: 0,
      dryRunRequiredCount: 0,
      needsConfirmationCount: 0,
      readyButNotInvokedCount: 0,
    };
  }

  private toReadinessInput(input: ComputerUseBrowserRuntimeRouterGuardedInvocationInput): BrowserRuntimeRouterInvocationReadinessInput {
    if (input.readinessInput) return input.readinessInput;
    return {
      featureFlags: input.featureFlags,
      bridgeRequest: input.bridgeRequest,
      dryRunResult: input.dryRunResult,
      guardDecision: input.guardDecision,
      confirmationResult: input.confirmationResult,
      lane: input.lane,
      riskLevel: input.riskLevel,
      missionTapeReady: input.missionTapeReady,
      metadata: input.metadata,
    };
  }

  private toShellResult(
    readinessStatus: ComputerUseBrowserRuntimeRouterGuardedInvocationResult["readinessStatus"],
    readinessInput: BrowserRuntimeRouterInvocationReadinessInput,
    gates: ComputerUseBrowserRuntimeRouterGuardedInvocationResult["gates"],
  ): ComputerUseBrowserRuntimeRouterGuardedInvocationResult {
    const status = readinessStatus === "ready" ? "ready_but_not_invoked" : readinessStatus;
    const reason =
      status === "ready_but_not_invoked"
        ? "Invocation readiness is ready, but real BrowserRuntimeRouter execution is disabled in guarded shell mode."
        : `Invocation readiness status: ${status}.`;

    return {
      status,
      requestId: readinessInput.bridgeRequest?.requestId,
      missionId: readinessInput.bridgeRequest?.missionId,
      action: readinessInput.bridgeRequest?.action,
      target: readinessInput.bridgeRequest?.target,
      reason,
      gates,
      readinessStatus,
      metadata: SHELL_METADATA,
    };
  }

  private updateCounters(status: ComputerUseBrowserRuntimeRouterGuardedInvocationResult["status"]): void {
    if (status === "blocked") this.snapshot.blockedCount += 1;
    if (status === "dry_run_required") this.snapshot.dryRunRequiredCount += 1;
    if (status === "needs_confirmation") this.snapshot.needsConfirmationCount += 1;
    if (status === "ready_but_not_invoked") this.snapshot.readyButNotInvokedCount += 1;
  }

  private emitEvent(result: ComputerUseBrowserRuntimeRouterGuardedInvocationResult): void {
    if (!this.onEvent) return;
    try {
      this.onEvent({
        eventType: "browser_runtime_router_guarded_shell_invoked",
        timestamp: this.now(),
        status: result.status,
        requestId: result.requestId,
        missionId: result.missionId,
        action: result.action,
        target: result.target,
        reason: result.reason,
      });
    } catch {
      // Non-fatal by design.
    }
  }
}

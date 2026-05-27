import { BrowserRuntimeRouterGuardedAdapter } from "./BrowserRuntimeRouterGuardedAdapter";
import {
  ComputerUseBrowserRuntimeRealInvocationInput,
  ComputerUseBrowserRuntimeRealInvocationResult,
  ComputerUseBrowserRuntimeRealInvocationShellOptions,
  ComputerUseBrowserRuntimeRealInvocationSnapshot,
} from "./types";

const SHELL_METADATA: ComputerUseBrowserRuntimeRealInvocationResult["metadata"] = {
  adapterKind: "browser_runtime_real_invocation_shell",
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

export class BrowserRuntimeRouterRealInvocationShell {
  private readonly now: () => string;
  private readonly guardedAdapter: BrowserRuntimeRouterGuardedAdapter;
  private readonly onEvent?: ComputerUseBrowserRuntimeRealInvocationShellOptions["onEvent"];

  private snapshot: ComputerUseBrowserRuntimeRealInvocationSnapshot = {
    invocationCount: 0,
    blockedCount: 0,
    dryRunRequiredCount: 0,
    needsConfirmationCount: 0,
    readyButRealInvocationDisabledCount: 0,
  };

  constructor(options: ComputerUseBrowserRuntimeRealInvocationShellOptions = {}) {
    this.now = options.now ?? (() => new Date().toISOString());
    this.guardedAdapter = options.guardedAdapter ?? new BrowserRuntimeRouterGuardedAdapter({ now: this.now });
    this.onEvent = options.onEvent;
  }

  invoke(input: ComputerUseBrowserRuntimeRealInvocationInput): ComputerUseBrowserRuntimeRealInvocationResult {
    this.snapshot.invocationCount += 1;
    this.snapshot.lastInvocationAt = this.now();

    const guardedResult = (input.guardedInput ? this.guardedAdapter.invoke(input.guardedInput) : this.guardedAdapter.invoke(input));

    const status =
      guardedResult.status === "ready_but_not_invoked"
        ? "ready_but_real_invocation_disabled"
        : guardedResult.status;
    const reason =
      status === "ready_but_real_invocation_disabled"
        ? "Guarded invocation is ready, but real BrowserRuntimeRouter invocation is disabled by shell policy."
        : guardedResult.reason;

    const result: ComputerUseBrowserRuntimeRealInvocationResult = {
      status,
      requestId: guardedResult.requestId,
      missionId: guardedResult.missionId,
      action: guardedResult.action,
      target: guardedResult.target,
      reason,
      readinessStatus: guardedResult.readinessStatus,
      guardedStatus: guardedResult.status,
      gates: [...guardedResult.gates],
      metadata: SHELL_METADATA,
    };

    this.updateCounters(result.status);
    this.snapshot.lastResult = result;
    this.emitEvent(result);
    return result;
  }

  getSnapshot(): ComputerUseBrowserRuntimeRealInvocationSnapshot {
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
      readyButRealInvocationDisabledCount: 0,
    };
  }

  private updateCounters(status: ComputerUseBrowserRuntimeRealInvocationResult["status"]): void {
    if (status === "blocked") this.snapshot.blockedCount += 1;
    if (status === "dry_run_required") this.snapshot.dryRunRequiredCount += 1;
    if (status === "needs_confirmation") this.snapshot.needsConfirmationCount += 1;
    if (status === "ready_but_real_invocation_disabled") this.snapshot.readyButRealInvocationDisabledCount += 1;
  }

  private emitEvent(result: ComputerUseBrowserRuntimeRealInvocationResult): void {
    if (!this.onEvent) return;
    try {
      this.onEvent({
        eventType: "browser_runtime_real_invocation_shell_invoked",
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

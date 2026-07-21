import { BrowserRuntimeRouterGuardedAdapter } from "./BrowserRuntimeRouterGuardedAdapter";
import type { BrowserRuntimeRouterBridgeRequest } from "./BrowserRuntimeRouterBridge";
import {
  ComputerUseBrowserRuntimeRealInvocationInput,
  ComputerUseBrowserRuntimeRealInvocationResult,
  ComputerUseBrowserRuntimeRealInvocationShellOptions,
  ComputerUseBrowserRuntimeRealInvocationSnapshot,
  ComputerUseBrowserRuntimeRouterPort,
  ComputerUseBrowserRuntimeRealInvocationShellMetadata,
} from "./types";

const SCAFFOLD_METADATA: ComputerUseBrowserRuntimeRealInvocationShellMetadata = {
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
  private readonly router: ComputerUseBrowserRuntimeRouterPort | undefined;
  private readonly onEvent?: ComputerUseBrowserRuntimeRealInvocationShellOptions["onEvent"];

  private snapshot: ComputerUseBrowserRuntimeRealInvocationSnapshot = {
    invocationCount: 0,
    blockedCount: 0,
    dryRunRequiredCount: 0,
    needsConfirmationCount: 0,
    readyButRealInvocationDisabledCount: 0,
    invokedCount: 0,
    invokeFailedCount: 0,
  };

  constructor(options: ComputerUseBrowserRuntimeRealInvocationShellOptions = {}) {
    this.now = options.now ?? (() => new Date().toISOString());
    this.guardedAdapter =
      options.guardedAdapter ?? new BrowserRuntimeRouterGuardedAdapter({ now: this.now });
    this.router = options.router;
    this.onEvent = options.onEvent;
  }

  /**
   * Evaluate readiness and, when ready + router DI present, call BrowserRuntimeRouter.route().
   * Without an injected router, ready paths remain `ready_but_real_invocation_disabled`.
   */
  async invoke(
    input: ComputerUseBrowserRuntimeRealInvocationInput,
  ): Promise<ComputerUseBrowserRuntimeRealInvocationResult> {
    this.snapshot.invocationCount += 1;
    this.snapshot.lastInvocationAt = this.now();

    const guardedResult = input.guardedInput
      ? this.guardedAdapter.invoke(input.guardedInput)
      : this.guardedAdapter.invoke(input);

    if (guardedResult.status !== "ready_but_not_invoked") {
      const status =
        guardedResult.status === "blocked" ||
        guardedResult.status === "dry_run_required" ||
        guardedResult.status === "needs_confirmation"
          ? guardedResult.status
          : "blocked";

      const result: ComputerUseBrowserRuntimeRealInvocationResult = {
        status,
        requestId: guardedResult.requestId,
        missionId: guardedResult.missionId,
        action: guardedResult.action,
        target: guardedResult.target,
        reason: guardedResult.reason,
        readinessStatus: guardedResult.readinessStatus,
        guardedStatus: guardedResult.status,
        gates: [...guardedResult.gates],
        metadata: { ...SCAFFOLD_METADATA },
      };

      this.updateCounters(result.status);
      this.snapshot.lastResult = result;
      this.emitEvent(result);
      return result;
    }

    // Readiness ready — only invoke when a router is injected.
    if (!this.router) {
      const result: ComputerUseBrowserRuntimeRealInvocationResult = {
        status: "ready_but_real_invocation_disabled",
        requestId: guardedResult.requestId,
        missionId: guardedResult.missionId,
        action: guardedResult.action,
        target: guardedResult.target,
        reason:
          "Guarded invocation is ready, but no BrowserRuntimeRouter was injected into the real invocation shell.",
        readinessStatus: guardedResult.readinessStatus,
        guardedStatus: guardedResult.status,
        gates: [...guardedResult.gates],
        metadata: {
          ...SCAFFOLD_METADATA,
          browserRuntimeRouterImported: false,
          browserRuntimeRouterInstantiated: false,
        },
      };

      this.updateCounters(result.status);
      this.snapshot.lastResult = result;
      this.emitEvent(result);
      return result;
    }

    const bridgeRequest =
      input.bridgeRequest ??
      input.guardedInput?.bridgeRequest ??
      input.readinessInput?.bridgeRequest;

    if (!bridgeRequest) {
      const result: ComputerUseBrowserRuntimeRealInvocationResult = {
        status: "invoke_failed",
        requestId: guardedResult.requestId,
        missionId: guardedResult.missionId,
        action: guardedResult.action,
        target: guardedResult.target,
        reason: "Ready for real invocation but bridgeRequest is missing.",
        readinessStatus: guardedResult.readinessStatus,
        guardedStatus: guardedResult.status,
        gates: [...guardedResult.gates],
        metadata: {
          ...SCAFFOLD_METADATA,
          shellOnly: false,
          realBrowserExecutionEnabled: true,
          browserRuntimeRouterImported: true,
          browserRuntimeRouterInstantiated: true,
          browserRuntimeRouterCalled: false,
        },
      };
      this.updateCounters(result.status);
      this.snapshot.lastResult = result;
      this.emitEvent(result);
      return result;
    }

    try {
      const routeRequest = this.toRouterRequest(bridgeRequest);
      const routeResult = await this.router.route(routeRequest);
      const execution = routeResult.execution;

      if (routeResult.accepted) {
        const result: ComputerUseBrowserRuntimeRealInvocationResult = {
          status: "invoked",
          requestId: guardedResult.requestId ?? bridgeRequest.requestId,
          missionId: guardedResult.missionId ?? bridgeRequest.missionId,
          action: guardedResult.action ?? bridgeRequest.action,
          target: guardedResult.target ?? bridgeRequest.target,
          reason: routeResult.reason ?? "BrowserRuntimeRouter route accepted.",
          readinessStatus: guardedResult.readinessStatus,
          guardedStatus: guardedResult.status,
          gates: [...guardedResult.gates],
          metadata: {
            adapterKind: "browser_runtime_real_invocation_shell",
            shellOnly: false,
            realBrowserExecutionEnabled: true,
            browserRuntimeRouterImported: true,
            browserRuntimeRouterInstantiated: true,
            browserRuntimeRouterCalled: true,
            playwrightCalled: execution?.playwrightCalled === true,
            browserApisCalled: execution?.browserApisCalled === true,
            systemApisCalled: false,
            directHostAllowed: false,
            requiresExplicitOptIn: true,
            routeAccepted: true,
            routeLane: routeResult.lane,
            routeRuntime: routeResult.runtime,
          },
        };
        this.updateCounters(result.status);
        this.snapshot.lastResult = result;
        this.emitEvent(result);
        return result;
      }

      const result: ComputerUseBrowserRuntimeRealInvocationResult = {
        status: "invoke_failed",
        requestId: guardedResult.requestId ?? bridgeRequest.requestId,
        missionId: guardedResult.missionId ?? bridgeRequest.missionId,
        action: guardedResult.action ?? bridgeRequest.action,
        target: guardedResult.target ?? bridgeRequest.target,
        reason: routeResult.reason ?? "BrowserRuntimeRouter route rejected.",
        readinessStatus: guardedResult.readinessStatus,
        guardedStatus: guardedResult.status,
        gates: [...guardedResult.gates],
        metadata: {
          adapterKind: "browser_runtime_real_invocation_shell",
          shellOnly: false,
          realBrowserExecutionEnabled: true,
          browserRuntimeRouterImported: true,
          browserRuntimeRouterInstantiated: true,
          browserRuntimeRouterCalled: true,
          playwrightCalled: execution?.playwrightCalled === true,
          browserApisCalled: execution?.browserApisCalled === true,
          systemApisCalled: false,
          directHostAllowed: false,
          requiresExplicitOptIn: true,
          routeAccepted: false,
          routeLane: routeResult.lane,
          routeRuntime: routeResult.runtime,
        },
      };
      this.updateCounters(result.status);
      this.snapshot.lastResult = result;
      this.emitEvent(result);
      return result;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error ?? "unknown error");
      const result: ComputerUseBrowserRuntimeRealInvocationResult = {
        status: "invoke_failed",
        requestId: guardedResult.requestId,
        missionId: guardedResult.missionId,
        action: guardedResult.action,
        target: guardedResult.target,
        reason: `BrowserRuntimeRouter invocation error: ${message}`,
        readinessStatus: guardedResult.readinessStatus,
        guardedStatus: guardedResult.status,
        gates: [...guardedResult.gates],
        metadata: {
          adapterKind: "browser_runtime_real_invocation_shell",
          shellOnly: false,
          realBrowserExecutionEnabled: true,
          browserRuntimeRouterImported: true,
          browserRuntimeRouterInstantiated: true,
          browserRuntimeRouterCalled: true,
          playwrightCalled: false,
          browserApisCalled: false,
          systemApisCalled: false,
          directHostAllowed: false,
          requiresExplicitOptIn: true,
          routeAccepted: false,
        },
      };
      this.updateCounters(result.status);
      this.snapshot.lastResult = result;
      this.emitEvent(result);
      return result;
    }
  }

  getSnapshot(): ComputerUseBrowserRuntimeRealInvocationSnapshot {
    return {
      ...this.snapshot,
      lastResult: this.snapshot.lastResult
        ? {
            ...this.snapshot.lastResult,
            gates: [...this.snapshot.lastResult.gates],
          }
        : undefined,
    };
  }

  reset(): void {
    this.snapshot = {
      invocationCount: 0,
      blockedCount: 0,
      dryRunRequiredCount: 0,
      needsConfirmationCount: 0,
      readyButRealInvocationDisabledCount: 0,
      invokedCount: 0,
      invokeFailedCount: 0,
    };
  }

  private toRouterRequest(bridgeRequest: BrowserRuntimeRouterBridgeRequest) {
    return {
      requestId: bridgeRequest.requestId,
      missionId: bridgeRequest.missionId,
      action: bridgeRequest.action,
      target: bridgeRequest.target,
      payload: bridgeRequest.payload,
      issuedAt: bridgeRequest.issuedAt,
      riskLevel: bridgeRequest.riskLevel,
      trustTier: bridgeRequest.trustTier,
      preferredLane: bridgeRequest.preferredLane,
      hasGuardApproval: bridgeRequest.hasGuardApproval,
      linkedDeviceTrusted: bridgeRequest.linkedDeviceTrusted,
      linkedDeviceAvailable: bridgeRequest.linkedDeviceAvailable,
    };
  }

  private updateCounters(
    status: ComputerUseBrowserRuntimeRealInvocationResult["status"],
  ): void {
    if (status === "blocked") this.snapshot.blockedCount += 1;
    if (status === "dry_run_required") this.snapshot.dryRunRequiredCount += 1;
    if (status === "needs_confirmation") this.snapshot.needsConfirmationCount += 1;
    if (status === "ready_but_real_invocation_disabled") {
      this.snapshot.readyButRealInvocationDisabledCount += 1;
    }
    if (status === "invoked") this.snapshot.invokedCount += 1;
    if (status === "invoke_failed") this.snapshot.invokeFailedCount += 1;
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

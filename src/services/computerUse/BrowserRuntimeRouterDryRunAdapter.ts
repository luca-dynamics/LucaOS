import { BrowserRuntimeRouterBridgeRequest, validateBrowserRuntimeRouterBridgeRequest } from "./BrowserRuntimeRouterBridge";
import {
  ComputerUseBrowserRuntimeRouterDryRunOptions,
  ComputerUseBrowserRuntimeRouterDryRunResult,
  ComputerUseBrowserRuntimeRouterDryRunSnapshot,
} from "./types";

const DEFAULT_REASON = "BrowserRuntime router dry-run only: validated request and simulated invocation.";

export class BrowserRuntimeRouterDryRunAdapter {
  private readonly now: () => string;
  private readonly onEvent?: ComputerUseBrowserRuntimeRouterDryRunOptions["onEvent"];

  private snapshot: ComputerUseBrowserRuntimeRouterDryRunSnapshot = {
    invocationCount: 0,
    successCount: 0,
    failureCount: 0,
    lastInvocationAt: undefined,
    lastResult: undefined,
  };

  constructor(options: ComputerUseBrowserRuntimeRouterDryRunOptions = {}) {
    this.now = options.now ?? (() => new Date().toISOString());
    this.onEvent = options.onEvent;
  }

  invoke(request: BrowserRuntimeRouterBridgeRequest): ComputerUseBrowserRuntimeRouterDryRunResult {
    this.snapshot.invocationCount += 1;
    this.snapshot.lastInvocationAt = this.now();

    this.emitEvent("browser_runtime_router_dry_run_started", request);
    const validation = validateBrowserRuntimeRouterBridgeRequest(request);
    const metadata = this.buildMetadata();

    if (!validation.ok) {
      const result: ComputerUseBrowserRuntimeRouterDryRunResult = {
        ok: false,
        requestId: request?.requestId,
        action: request?.action,
        target: request?.target,
        missionId: request?.missionId,
        reason: validation.reason,
        metadata,
      };
      this.snapshot.failureCount += 1;
      this.snapshot.lastResult = result;
      this.emitEvent("browser_runtime_router_dry_run_failed", request, validation.reason);
      return result;
    }

    const result: ComputerUseBrowserRuntimeRouterDryRunResult = {
      ok: true,
      requestId: request.requestId,
      action: request.action,
      target: request.target,
      missionId: request.missionId,
      reason: DEFAULT_REASON,
      metadata,
    };
    this.snapshot.successCount += 1;
    this.snapshot.lastResult = result;
    this.emitEvent("browser_runtime_router_dry_run_completed", request, result.reason);
    return result;
  }

  getSnapshot(): ComputerUseBrowserRuntimeRouterDryRunSnapshot {
    return {
      ...this.snapshot,
      lastResult: this.snapshot.lastResult ? { ...this.snapshot.lastResult } : undefined,
    };
  }

  reset(): void {
    this.snapshot = {
      invocationCount: 0,
      successCount: 0,
      failureCount: 0,
      lastInvocationAt: undefined,
      lastResult: undefined,
    };
  }

  private buildMetadata(): ComputerUseBrowserRuntimeRouterDryRunResult["metadata"] {
    return {
      adapterKind: "browser_runtime_router_dry_run",
      dryRun: true,
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
  }

  private emitEvent(
    eventType: "browser_runtime_router_dry_run_started" | "browser_runtime_router_dry_run_completed" | "browser_runtime_router_dry_run_failed",
    request: BrowserRuntimeRouterBridgeRequest,
    reason?: string,
  ): void {
    if (!this.onEvent) return;
    try {
      this.onEvent({
        eventType,
        timestamp: this.now(),
        requestId: request?.requestId,
        missionId: request?.missionId,
        action: request?.action,
        target: request?.target,
        reason,
      });
    } catch {
      // Non-fatal by design.
    }
  }
}

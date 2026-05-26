import {
  ComputerUseBrowserRuntimeAdapter,
  ComputerUseBrowserRuntimeAdapterRequest,
  ComputerUseBrowserRuntimeAdapterResult,
  ComputerUseSandboxBrowserAdapterOptions,
  ComputerUseSandboxBrowserAdapterResult,
  ComputerUseSandboxBrowserAdapterSnapshot,
} from "./types";

const SANDBOX_LANE = "sandbox_browser" as const;
const SUPPORTED_ACTIONS = new Set(["click", "type_text", "hotkey", "scroll", "wait", "observe"]);

export class ComputerUseSandboxBrowserAdapter implements ComputerUseBrowserRuntimeAdapter {
  private executionCount = 0;
  private lastRequest?: ComputerUseBrowserRuntimeAdapterRequest;
  private lastResult?: ComputerUseSandboxBrowserAdapterResult;

  constructor(private readonly options: ComputerUseSandboxBrowserAdapterOptions = {}) {}

  canHandle(routeOrAction: ComputerUseBrowserRuntimeAdapterRequest): boolean {
    if (!this.isEnabled()) return false;
    if (!routeOrAction || typeof routeOrAction !== "object") return false;
    if (routeOrAction.lane !== SANDBOX_LANE) return false;
    return Boolean(routeOrAction.action && SUPPORTED_ACTIONS.has(routeOrAction.action.type));
  }

  async execute(routeOrAction: ComputerUseBrowserRuntimeAdapterRequest): Promise<ComputerUseSandboxBrowserAdapterResult> {
    this.lastRequest = routeOrAction;
    const recordStart = this.recordStarted(routeOrAction);
    let result: ComputerUseSandboxBrowserAdapterResult;

    if (!this.isEnabled()) {
      result = this.fail("Sandbox browser adapter requires explicit opt-in feature flags.");
    } else if (!routeOrAction || routeOrAction.lane !== SANDBOX_LANE) {
      result = this.fail("Sandbox browser adapter accepts only lane sandbox_browser.");
    } else if (!routeOrAction.action || !SUPPORTED_ACTIONS.has(routeOrAction.action.type)) {
      result = this.fail("Sandbox browser adapter requires a valid action.");
    } else {
      result = {
        status: "executed",
        action: routeOrAction.action,
        metadata: {
          reason: `Sandbox scaffold mapped action ${routeOrAction.action.type} to BrowserRuntime request shape.`,
          adapterKind: "sandbox_browser_scaffold",
          sandboxBrowserAdapterEnabled: true,
          delegatedToBrowserRuntime: false,
          simulated: true,
          browserRuntimeImported: false,
          playwrightCalled: false,
          browserApisCalled: false,
          systemApisCalled: false,
          directHostAllowed: false,
          realBrowserExecutionEnabled: false,
          requiresExplicitOptIn: true,
          mappedTargetRequest: {
            requestId: `sandbox-${this.executionCount + 1}`,
            missionId: routeOrAction.context?.missionId ?? "unknown",
            action: this.mapAction(routeOrAction.action.type),
            target: routeOrAction.action.target?.selectorHint ?? routeOrAction.action.target?.description,
            payload: {
              text: routeOrAction.action.text,
              sourceActionType: routeOrAction.action.type,
              sourceLane: routeOrAction.lane,
            },
            issuedAt: new Date().toISOString(),
            riskLevel: routeOrAction.action.requiresGuardApproval ? "sensitive" : "safe",
            trustTier: "untrusted",
            preferredLane: SANDBOX_LANE,
            hasGuardApproval: !routeOrAction.action.requiresGuardApproval,
          },
          mappedTargetResult: {
            accepted: true,
            lane: SANDBOX_LANE,
            runtime: "unknown",
            reason: "Simulated sandbox route only; real browser runtime execution remains disabled.",
          },
        },
      };
    }

    const recordEnd = this.recordResult(result, routeOrAction);
    result = {
      ...result,
      metadata: {
        ...result.metadata,
        recordingAttempted: Boolean(this.options.recording),
        recordingFailed: !recordStart.ok || !recordEnd.ok,
        recordingFailureReason: !recordStart.ok ? recordStart.reason : !recordEnd.ok ? recordEnd.reason : undefined,
      },
    };

    this.lastResult = result;
    this.executionCount += 1;
    return result;
  }

  getSnapshot(): ComputerUseSandboxBrowserAdapterSnapshot {
    return {
      featureFlags: {
        sandboxBrowserAdapterEnabled: Boolean(this.options.featureFlags?.sandboxBrowserAdapterEnabled),
        enableSandboxBrowserAdapter: Boolean(this.options.featureFlags?.enableSandboxBrowserAdapter),
      },
      executionCount: this.executionCount,
      lastRequest: this.lastRequest,
      lastResult: this.lastResult,
    };
  }

  reset(): void {
    this.executionCount = 0;
    this.lastRequest = undefined;
    this.lastResult = undefined;
  }

  private isEnabled(): boolean {
    return Boolean(this.options.featureFlags?.sandboxBrowserAdapterEnabled || this.options.featureFlags?.enableSandboxBrowserAdapter);
  }

  private mapAction(type: string): "navigate" | "click" | "type" | "extract" | "screenshot" {
    if (type === "type_text") return "type";
    if (type === "observe") return "extract";
    return "click";
  }

  private fail(reason: string): ComputerUseSandboxBrowserAdapterResult {
    return {
      status: "failed",
      metadata: {
        reason,
        adapterKind: "sandbox_browser_scaffold",
        sandboxBrowserAdapterEnabled: this.isEnabled(),
        delegatedToBrowserRuntime: false,
        simulated: true,
        browserRuntimeImported: false,
        playwrightCalled: false,
        browserApisCalled: false,
        systemApisCalled: false,
        directHostAllowed: false,
        realBrowserExecutionEnabled: false,
        requiresExplicitOptIn: true,
      },
    };
  }

  private recordStarted(routeOrAction: ComputerUseBrowserRuntimeAdapterRequest): { ok: boolean; reason?: string } {
    if (!this.options.recording) return { ok: true };
    const output = this.options.recording.eventBridge.recordBrowserAdapterStarted({
      missionId: routeOrAction.context?.missionId,
      stepId: routeOrAction.context?.stepId,
      traceId: routeOrAction.context?.traceId,
      source: routeOrAction.context?.source,
      lane: routeOrAction.lane,
      actionType: routeOrAction.action?.type,
    });
    return { ok: output.ok, reason: output.reason };
  }

  private recordResult(result: ComputerUseBrowserRuntimeAdapterResult, routeOrAction: ComputerUseBrowserRuntimeAdapterRequest): { ok: boolean; reason?: string } {
    if (!this.options.recording) return { ok: true };
    const output = this.options.recording.eventBridge.recordBrowserAdapterResult(result, routeOrAction);
    return { ok: output.ok, reason: output.reason };
  }
}

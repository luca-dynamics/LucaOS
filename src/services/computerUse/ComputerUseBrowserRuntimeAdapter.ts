import {
  ComputerUseBrowserRuntimeAdapter,
  ComputerUseBrowserRuntimeAdapterOptions,
  ComputerUseBrowserRuntimeAdapterRequest,
  ComputerUseBrowserRuntimeAdapterResult,
  ComputerUseBrowserRuntimeAdapterSnapshot,
} from "./types";

const SUPPORTED_LANES = new Set(["ghost_browser", "sandbox_browser", "authenticated_direct_host", "remote_linked_browser"]);
const SUPPORTED_ACTIONS = new Set(["click", "type_text", "hotkey", "scroll", "wait", "observe"]);

export class ComputerUseBrowserRuntimeAdapterScaffold implements ComputerUseBrowserRuntimeAdapter {
  private executionCount = 0;
  private lastRequest?: ComputerUseBrowserRuntimeAdapterRequest;
  private lastResult?: ComputerUseBrowserRuntimeAdapterResult;

  constructor(private readonly options: ComputerUseBrowserRuntimeAdapterOptions = {}) {}

  canHandle(routeOrAction: ComputerUseBrowserRuntimeAdapterRequest): boolean {
    if (!this.isOptedIn()) return false;
    if (!routeOrAction || typeof routeOrAction !== "object") return false;
    if (!routeOrAction.action || !routeOrAction.lane) return false;
    return SUPPORTED_LANES.has(routeOrAction.lane) && SUPPORTED_ACTIONS.has(routeOrAction.action.type);
  }

  async execute(routeOrAction: ComputerUseBrowserRuntimeAdapterRequest): Promise<ComputerUseBrowserRuntimeAdapterResult> {
    this.lastRequest = routeOrAction;
    let result: ComputerUseBrowserRuntimeAdapterResult;
    const recordStart = this.recordStarted(routeOrAction);

    if (!this.isOptedIn()) {
      result = this.fail("BrowserRuntime adapter requires explicit opt-in feature flags.");
    } else if (!this.isValidRequest(routeOrAction)) {
      result = this.fail("Unsupported or malformed browser runtime adapter request.");
    } else {
      result = {
        status: "executed",
        action: routeOrAction.action,
        metadata: {
          reason: `Scaffold adapter simulated delegation for lane ${routeOrAction.lane}.`,
          adapterKind: "scaffold",
          delegatedToBrowserRuntime: false,
          simulated: true,
          browserRuntimeImported: false,
          playwrightCalled: false,
          browserApisCalled: false,
          systemApisCalled: false,
          requiresExplicitOptIn: true,
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
        recordingFailureReason: !recordStart.ok
          ? recordStart.reason
          : !recordEnd.ok
            ? recordEnd.reason
            : undefined,
      },
    };

    this.lastResult = result;
    this.executionCount += 1;
    return result;
  }

  getSnapshot(): ComputerUseBrowserRuntimeAdapterSnapshot {
    return {
      featureFlags: {
        browserRuntimeEnabled: Boolean(this.options.featureFlags?.browserRuntimeEnabled),
        enableBrowserRuntimeBridge: Boolean(this.options.featureFlags?.enableBrowserRuntimeBridge),
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

  private isOptedIn(): boolean {
    return Boolean(this.options.featureFlags?.browserRuntimeEnabled || this.options.featureFlags?.enableBrowserRuntimeBridge);
  }

  private isValidRequest(routeOrAction: ComputerUseBrowserRuntimeAdapterRequest): boolean {
    return Boolean(
      routeOrAction &&
        routeOrAction.action &&
        routeOrAction.lane &&
        SUPPORTED_LANES.has(routeOrAction.lane) &&
        SUPPORTED_ACTIONS.has(routeOrAction.action.type),
    );
  }

  private fail(reason: string): ComputerUseBrowserRuntimeAdapterResult {
    return {
      status: "failed",
      metadata: {
        reason,
        adapterKind: "scaffold",
        delegatedToBrowserRuntime: false,
        simulated: true,
        browserRuntimeImported: false,
        playwrightCalled: false,
        browserApisCalled: false,
        systemApisCalled: false,
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

  private recordResult(
    result: ComputerUseBrowserRuntimeAdapterResult,
    routeOrAction: ComputerUseBrowserRuntimeAdapterRequest,
  ): { ok: boolean; reason?: string } {
    if (!this.options.recording) return { ok: true };
    const output = this.options.recording.eventBridge.recordBrowserAdapterResult(result, routeOrAction);
    return { ok: output.ok, reason: output.reason };
  }
}

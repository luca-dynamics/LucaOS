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
}

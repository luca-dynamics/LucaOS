import {
  ComputerUseBrowserRouteRequest,
  ComputerUseBrowserRouteResult,
  ComputerUseBrowserRuntimeBridgeOptions,
  ComputerUseExecutionMode,
  ComputerUsePlannedAction,
} from "./types";

const BROWSER_LIKE_ACTIONS: Array<ComputerUsePlannedAction["type"]> = ["click", "type_text", "hotkey", "scroll", "wait"];

export class ComputerUseBrowserRuntimeBridge {
  private readonly options: ComputerUseBrowserRuntimeBridgeOptions;

  constructor(options: ComputerUseBrowserRuntimeBridgeOptions = {}) {
    this.options = options;
  }

  toBrowserRouteRequest(action: ComputerUsePlannedAction, executionMode: ComputerUseExecutionMode): ComputerUseBrowserRouteRequest {
    return {
      lane: this.selectLaneFromExecutionMode(executionMode),
      action,
      metadata: {
        bridgeKind: "scaffold",
        browserRuntimeImported: false,
      },
    };
  }

  fromBrowserRouteResult(result: ComputerUseBrowserRouteResult): ComputerUseBrowserRouteResult {
    return {
      ...result,
      metadata: {
        ...result.metadata,
        bridgeKind: "scaffold",
        browserRuntimeImported: false,
      },
    };
  }

  selectLaneFromExecutionMode(executionMode: ComputerUseExecutionMode) {
    switch (executionMode) {
      case "sandbox":
        return "sandbox_browser" as const;
      case "browser_body":
        return "ghost_browser" as const;
      case "direct_host":
        return "direct_host_browser" as const;
      case "remote_linked":
        return "remote_linked_browser" as const;
      default:
        return "sandbox_browser" as const;
    }
  }

  requiresBrowserRuntime(action: ComputerUsePlannedAction): boolean {
    if (action.type === "observe") {
      return false;
    }
    if (!BROWSER_LIKE_ACTIONS.includes(action.type)) {
      return false;
    }
    const t = action.target;
    return Boolean(t?.selectorHint || t?.role || t?.label || t?.description?.toLowerCase().includes("browser"));
  }

  reset(): void {
    void this.options;
  }
}

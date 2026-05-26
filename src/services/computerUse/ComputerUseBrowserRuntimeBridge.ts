import {
  ComputerUseActionType,
  ComputerUseBrowserRouteRequest,
  ComputerUseBrowserRouteResult,
  ComputerUseBrowserRuntimeBridgeOptions,
  ComputerUseBrowserRuntimeLane,
  ComputerUseExecutionMode,
  ComputerUseExecutionResult,
  ComputerUsePlannedAction,
} from "./types";

const BROWSER_ACTIONS: ComputerUseActionType[] = ["click", "type_text", "hotkey", "scroll", "wait"];

export class ComputerUseBrowserRuntimeBridge {
  private readonly options: ComputerUseBrowserRuntimeBridgeOptions;

  constructor(options: ComputerUseBrowserRuntimeBridgeOptions = {}) {
    this.options = options;
  }

  toBrowserRouteRequest(action: ComputerUsePlannedAction, executionMode: ComputerUseExecutionMode): ComputerUseBrowserRouteRequest {
    return {
      lane: this.selectLaneFromExecutionMode(executionMode),
      action,
      executionMode,
      metadata: {
        bridgeKind: "scaffold",
        browserRuntimeImported: false,
      },
    };
  }

  fromBrowserRouteResult(result: ComputerUseBrowserRouteResult): ComputerUseExecutionResult {
    return {
      status: result.status,
      action: result.action,
      metadata: {
        reason: result.metadata.reason,
        systemApisCalled: false,
        delegatesOnly: true,
        noDirectSystemCalls: true,
        executorKind: "scaffold",
      },
    };
  }

  selectLaneFromExecutionMode(mode: ComputerUseExecutionMode): ComputerUseBrowserRuntimeLane {
    if (mode === "sandbox") return "sandbox_browser";
    if (mode === "browser_body") return "ghost_browser";
    if (mode === "direct_host") return "direct_host_browser";
    return "remote_linked_browser";
  }

  requiresBrowserRuntime(action: ComputerUsePlannedAction): boolean {
    if (action.type === "observe") return false;
    if (!BROWSER_ACTIONS.includes(action.type)) return false;

    const targetText = `${action.target?.description ?? ""} ${action.target?.label ?? ""} ${action.reason}`.toLowerCase();
    const hints = this.options.browserHints ?? ["browser", "tab", "page", "url", "web", "input", "form"];
    return hints.some((hint) => targetText.includes(hint.toLowerCase()));
  }

  reset(): void {
    void this.options;
  }
}

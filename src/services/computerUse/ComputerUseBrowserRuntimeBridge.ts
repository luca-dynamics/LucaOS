import {
  ComputerUseBrowserRouteRequest,
  ComputerUseBrowserRouteResult,
  ComputerUseBrowserRuntimeBridgeOptions,
  ComputerUseExecutionMode,
  ComputerUsePlannedAction,
} from "./types";

const BROWSER_LIKE_ACTIONS: Array<ComputerUsePlannedAction["type"]> = ["click", "type_text", "hotkey", "scroll", "wait"];
const BROWSER_KEYWORDS = ["browser", "web", "dom", "page", "tab", "url"];

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
        return "authenticated_direct_host" as const;
      case "remote_linked":
        return "remote_linked_browser" as const;
      default:
        return this.options.defaultBrowserLane ?? ("sandbox_browser" as const);
    }
  }

  requiresBrowserRuntime(action: ComputerUsePlannedAction): boolean {
    if (action.type === "observe") {
      return false;
    }
    if (!BROWSER_LIKE_ACTIONS.includes(action.type)) {
      return false;
    }

    const target = action.target;
    if (target?.selectorHint) {
      return true;
    }

    const hasBrowserTextContext = this.containsBrowserKeyword(target?.description, target?.label, action.reason);
    if (hasBrowserTextContext) {
      return true;
    }

    if (action.type === "hotkey" || action.type === "scroll" || action.type === "wait") {
      return Boolean(this.options.defaultBrowserContext || this.options.defaultBrowserLane);
    }

    return false;
  }

  reset(): void {
    void this.options;
  }

  private containsBrowserKeyword(...parts: Array<string | undefined>): boolean {
    const text = parts.filter(Boolean).join(" ").toLowerCase();
    return BROWSER_KEYWORDS.some((word) => text.includes(word));
  }
}

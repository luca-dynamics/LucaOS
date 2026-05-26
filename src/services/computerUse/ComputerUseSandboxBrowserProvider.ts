import {
  ComputerUseBrowserRouteRequest,
  ComputerUseSandboxBrowserProviderOptions,
  ComputerUseSandboxBrowserProviderResult,
} from "./types";

export class ComputerUseSandboxBrowserProvider {
  private readonly options: ComputerUseSandboxBrowserProviderOptions;

  constructor(options: ComputerUseSandboxBrowserProviderOptions = {}) {
    this.options = options;
  }

  canHandle(route: Pick<ComputerUseBrowserRouteRequest, "lane">): boolean {
    return route.lane === "sandbox_browser";
  }

  async executeRoute(route: ComputerUseBrowserRouteRequest): Promise<ComputerUseSandboxBrowserProviderResult> {
    if (!this.canHandle(route)) {
      return {
        status: "failed",
        action: route.action,
        metadata: {
          reason: `Unsupported lane: ${route.lane}`,
          providerKind: "scaffold",
          browserApisCalled: false,
          sandboxSimulated: true,
        },
      };
    }

    const action = route.action.type === "type_text" ? { ...route.action, text: route.action.text } : route.action;

    return {
      status: "executed",
      action,
      metadata: {
        reason: "Sandbox browser provider simulated route execution.",
        providerKind: "scaffold",
        browserApisCalled: false,
        sandboxSimulated: true,
      },
    };
  }

  listRoutes() {
    return ["sandbox_browser"] as const;
  }

  reset(): void {
    void this.options;
  }
}

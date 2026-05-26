import {
  ComputerUseBrowserRouteRequest,
  ComputerUseBrowserRuntimeAdapter,
  ComputerUseSandboxBrowserProviderOptions,
  ComputerUseSandboxBrowserProviderResult,
  ComputerUseSandboxBrowserRouteRecord,
} from "./types";

export class ComputerUseSandboxBrowserProvider {
  private readonly options: ComputerUseSandboxBrowserProviderOptions & { adapter?: ComputerUseBrowserRuntimeAdapter };
  private readonly routeHistory: ComputerUseSandboxBrowserRouteRecord[] = [];

  constructor(options: ComputerUseSandboxBrowserProviderOptions & { adapter?: ComputerUseBrowserRuntimeAdapter } = {}) {
    this.options = options;
  }

  canHandle(route: Pick<ComputerUseBrowserRouteRequest, "lane">): boolean {
    return route.lane === "sandbox_browser";
  }

  async executeRoute(route: ComputerUseBrowserRouteRequest): Promise<ComputerUseSandboxBrowserProviderResult> {
    let result: ComputerUseSandboxBrowserProviderResult;

    if (!this.canHandle(route)) {
      result = {
        status: "failed",
        action: route.action,
        metadata: {
          reason: `Unsupported lane: ${route.lane}`,
          providerKind: "scaffold",
          browserApisCalled: false,
          sandboxSimulated: true,
        },
      };
    } else {
      const action = route.action.type === "type_text" ? { ...route.action, text: route.action.text } : route.action;

      if (this.options.adapter?.canHandle({ lane: route.lane, action: route.action })) {
        const adapterResult = await this.options.adapter.execute({ lane: route.lane, action: route.action });
        result = {
          status: adapterResult.status,
          action: adapterResult.action ?? route.action,
          metadata: {
            reason: adapterResult.metadata.reason,
            providerKind: "scaffold",
            browserApisCalled: false,
            sandboxSimulated: true,
          },
        };
      } else {
        result = {
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
    }

    this.routeHistory.push({ route, result });
    return result;
  }

  listRoutes(): ComputerUseSandboxBrowserRouteRecord[] {
    return [...this.routeHistory];
  }

  reset(): void {
    this.routeHistory.length = 0;
    void this.options;
  }
}

import {
  ComputerUseBrowserRouteRequest,
  ComputerUseSandboxBrowserProviderOptions,
  ComputerUseSandboxBrowserProviderResult,
} from "./types";

export class ComputerUseSandboxBrowserProvider {
  private readonly options: ComputerUseSandboxBrowserProviderOptions;
  private readonly routes: ComputerUseBrowserRouteRequest[] = [];

  constructor(options: ComputerUseSandboxBrowserProviderOptions = {}) {
    this.options = options;
  }

  canHandle(request: ComputerUseBrowserRouteRequest): boolean {
    return request.lane === "sandbox_browser";
  }

  async executeRoute(request: ComputerUseBrowserRouteRequest): Promise<ComputerUseSandboxBrowserProviderResult> {
    if (!this.canHandle(request)) {
      return {
        status: "failed",
        request,
        metadata: {
          providerKind: "scaffold",
          browserApisCalled: false,
          sandboxSimulated: true,
        },
      };
    }

    const preservedRequest = request.action.type === "type_text"
      ? { ...request, action: { ...request.action, text: request.action.text } }
      : request;
    this.routes.push(preservedRequest);

    return {
      status: "executed",
      request: preservedRequest,
      metadata: {
        providerKind: "scaffold",
        browserApisCalled: false,
        sandboxSimulated: true,
      },
    };
  }

  listRoutes(): ComputerUseBrowserRouteRequest[] {
    return [...this.routes];
  }

  reset(): void {
    this.routes.length = 0;
    void this.options;
  }
}

import {
  BrowserRuntimeAdapter,
  BrowserRuntimeRequest,
  BrowserRuntimeRouteResult,
} from "./types";

export class BrowserRuntimeRouter {
  constructor(private readonly adapters: BrowserRuntimeAdapter[] = []) {}

  registerAdapter(adapter: BrowserRuntimeAdapter): void {
    this.adapters.push(adapter);
  }

  async route(request: BrowserRuntimeRequest): Promise<BrowserRuntimeRouteResult> {
    const adapter = this.adapters.find((candidate) => candidate.canHandle(request));
    if (!adapter) {
      return {
        accepted: false,
        runtime: "unknown",
        reason: "No browser runtime adapter matched request",
      };
    }

    return adapter.execute(request);
  }
}

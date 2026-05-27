import { BrowserRuntimeRouterBridgeRequest } from "./BrowserRuntimeRouterBridge";
import { BrowserRuntimeRouterDryRunAdapter } from "./BrowserRuntimeRouterDryRunAdapter";
import { ComputerUseBrowserRuntimeRouterDryRunOptions } from "./types";

export const createBrowserRuntimeRouterDryRunAdapter = (options: ComputerUseBrowserRuntimeRouterDryRunOptions = {}) => {
  const adapter = new BrowserRuntimeRouterDryRunAdapter(options);
  return {
    adapter,
    invokeDryRun: (request: BrowserRuntimeRouterBridgeRequest) => adapter.invoke(request),
    getSnapshot: () => adapter.getSnapshot(),
    reset: () => adapter.reset(),
  };
};

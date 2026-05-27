import { BrowserRuntimeRouterGuardedAdapter } from "./BrowserRuntimeRouterGuardedAdapter";
import {
  ComputerUseBrowserRuntimeRouterGuardedAdapterOptions,
  ComputerUseBrowserRuntimeRouterGuardedInvocationInput,
} from "./types";

export const createBrowserRuntimeRouterGuardedAdapter = (options: ComputerUseBrowserRuntimeRouterGuardedAdapterOptions = {}) => {
  const adapter = new BrowserRuntimeRouterGuardedAdapter(options);
  return {
    adapter,
    invokeGuarded: (input: ComputerUseBrowserRuntimeRouterGuardedInvocationInput) => adapter.invoke(input),
    getSnapshot: () => adapter.getSnapshot(),
    reset: () => adapter.reset(),
  };
};

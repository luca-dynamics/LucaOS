import { BrowserRuntimeRouterRealInvocationShell } from "./BrowserRuntimeRouterRealInvocationShell";
import {
  ComputerUseBrowserRuntimeRealInvocationInput,
  ComputerUseBrowserRuntimeRealInvocationShellOptions,
} from "./types";

/**
 * Factory for the real-invocation shell.
 * Pass `router` (e.g. from `createSandboxBrowserRuntimeRouter`) to enable real route()
 * when readiness gates pass. Without `router`, ready paths stay disabled.
 */
export const createBrowserRuntimeRouterRealInvocationShell = (
  options: ComputerUseBrowserRuntimeRealInvocationShellOptions = {},
) => {
  const shell = new BrowserRuntimeRouterRealInvocationShell(options);
  return {
    shell,
    invoke: (input: ComputerUseBrowserRuntimeRealInvocationInput) => shell.invoke(input),
    getSnapshot: () => shell.getSnapshot(),
    reset: () => shell.reset(),
  };
};

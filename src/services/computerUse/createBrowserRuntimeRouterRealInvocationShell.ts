import { BrowserRuntimeRouterRealInvocationShell } from "./BrowserRuntimeRouterRealInvocationShell";
import {
  ComputerUseBrowserRuntimeRealInvocationInput,
  ComputerUseBrowserRuntimeRealInvocationShellOptions,
} from "./types";

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

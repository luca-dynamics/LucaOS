import { ComputerUseBrowserRuntimeAdapterScaffold } from "./ComputerUseBrowserRuntimeAdapter";
import { ComputerUseBrowserRuntimeAdapterOptions } from "./types";

export const createComputerUseBrowserRuntimeAdapter = (options: ComputerUseBrowserRuntimeAdapterOptions = {}) => {
  const adapter = new ComputerUseBrowserRuntimeAdapterScaffold(options);

  return {
    adapter,
    execute: adapter.execute.bind(adapter),
    canHandle: adapter.canHandle.bind(adapter),
    getSnapshot: adapter.getSnapshot.bind(adapter),
    reset: adapter.reset.bind(adapter),
  };
};

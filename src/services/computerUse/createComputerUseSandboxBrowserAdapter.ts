import { ComputerUseInMemoryMissionTapeSink } from "./ComputerUseInMemoryMissionTapeSink";
import { ComputerUseRuntimeEventBridge } from "./ComputerUseRuntimeEventBridge";
import { ComputerUseSandboxBrowserAdapter } from "./ComputerUseSandboxBrowserAdapter";
import { ComputerUseSandboxBrowserAdapterOptions, CreateComputerUseBrowserRuntimeAdapterOptions } from "./types";

export interface CreateComputerUseSandboxBrowserAdapterOptions extends ComputerUseSandboxBrowserAdapterOptions {
  recordingEnabled?: boolean;
  tapeSink?: CreateComputerUseBrowserRuntimeAdapterOptions["tapeSink"];
  eventBridge?: CreateComputerUseBrowserRuntimeAdapterOptions["eventBridge"];
}

export const createComputerUseSandboxBrowserAdapter = (options: CreateComputerUseSandboxBrowserAdapterOptions = {}) => {
  const recordingEnabled = options.recordingEnabled ?? true;
  const tapeSink = options.tapeSink ?? (recordingEnabled ? new ComputerUseInMemoryMissionTapeSink() : undefined);
  const eventBridge = options.eventBridge ?? (tapeSink ? new ComputerUseRuntimeEventBridge({ tapeSink }) : undefined);
  const adapter = new ComputerUseSandboxBrowserAdapter({
    featureFlags: options.featureFlags,
    recording: options.recording ?? (eventBridge ? { eventBridge } : undefined),
  });

  return {
    adapter,
    tapeSink,
    eventBridge,
    execute: adapter.execute.bind(adapter),
    canHandle: adapter.canHandle.bind(adapter),
    getSnapshot: adapter.getSnapshot.bind(adapter),
    getTapeSnapshot: (missionId?: string) => eventBridge?.getSnapshot(missionId),
    reset: () => {
      adapter.reset();
      eventBridge?.reset();
    },
  };
};

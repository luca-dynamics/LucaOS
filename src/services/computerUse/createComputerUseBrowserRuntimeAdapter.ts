import { ComputerUseBrowserRuntimeAdapterScaffold } from "./ComputerUseBrowserRuntimeAdapter";
import { ComputerUseInMemoryMissionTapeSink } from "./ComputerUseInMemoryMissionTapeSink";
import { ComputerUseRuntimeEventBridge } from "./ComputerUseRuntimeEventBridge";
import { CreateComputerUseBrowserRuntimeAdapterOptions } from "./types";

export const createComputerUseBrowserRuntimeAdapter = (options: CreateComputerUseBrowserRuntimeAdapterOptions = {}) => {
  const recordingEnabled = options.recordingEnabled ?? true;
  const tapeSink = options.tapeSink ?? (recordingEnabled ? new ComputerUseInMemoryMissionTapeSink() : undefined);
  const eventBridge = options.eventBridge ?? (tapeSink ? new ComputerUseRuntimeEventBridge({ tapeSink }) : undefined);
  const adapter = new ComputerUseBrowserRuntimeAdapterScaffold({
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

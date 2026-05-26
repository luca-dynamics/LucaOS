import { ComputerUseMissionIntegrationAdapter } from "./ComputerUseMissionIntegrationAdapter";
import { ComputerUseInMemoryMissionTapeSink } from "./ComputerUseInMemoryMissionTapeSink";
import { ComputerUseRuntimeEventBridge } from "./ComputerUseRuntimeEventBridge";
import { createComputerUseMissionRuntimeDispatcher } from "./createComputerUseMissionRuntimeDispatcher";
import { ComputerUseMissionIntegrationInput } from "./types";

export function createComputerUseMissionIntegrationAdapter() {
  const missionRuntime = createComputerUseMissionRuntimeDispatcher();
  const tapeSink = new ComputerUseInMemoryMissionTapeSink();
  const eventBridge = new ComputerUseRuntimeEventBridge({ tapeSink });
  const adapter = new ComputerUseMissionIntegrationAdapter({ dispatcher: missionRuntime.dispatcher, recording: { eventBridge } });

  return {
    missionRuntime,
    adapter,
    tapeSink,
    eventBridge,
    dispatch: (input: ComputerUseMissionIntegrationInput) => adapter.dispatch(input),
    canHandle: (input: ComputerUseMissionIntegrationInput) => adapter.canHandle(input),
    getTapeSnapshot: (missionId?: string) => eventBridge.getSnapshot(missionId),
    reset: () => {
      adapter.reset();
      missionRuntime.reset();
      eventBridge.reset();
    },
  };
}

import { ComputerUseMissionIntegrationAdapter } from "./ComputerUseMissionIntegrationAdapter";
import { createComputerUseMissionRuntimeDispatcher } from "./createComputerUseMissionRuntimeDispatcher";
import { ComputerUseMissionIntegrationInput } from "./types";

export function createComputerUseMissionIntegrationAdapter() {
  const missionRuntime = createComputerUseMissionRuntimeDispatcher();
  const adapter = new ComputerUseMissionIntegrationAdapter({ dispatcher: missionRuntime.dispatcher });

  return {
    missionRuntime,
    adapter,
    dispatch: (input: ComputerUseMissionIntegrationInput) => adapter.dispatch(input),
    canHandle: (input: ComputerUseMissionIntegrationInput) => adapter.canHandle(input),
    reset: () => {
      adapter.reset();
      missionRuntime.reset();
    },
  };
}

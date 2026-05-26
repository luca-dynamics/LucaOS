import { ComputerUseMissionRuntimeDispatcher } from "./ComputerUseMissionRuntimeDispatcher";
import { ComputerUseMissionRuntimeRegistry } from "./ComputerUseMissionRuntimeRegistry";
import { createComputerUseRuntime } from "./createComputerUseRuntime";
import { ComputerUseMissionStepInput } from "./types";

export function createComputerUseMissionRuntimeDispatcher() {
  const runtime = createComputerUseRuntime();
  const registry = new ComputerUseMissionRuntimeRegistry({ runtime });
  const dispatcher = new ComputerUseMissionRuntimeDispatcher({ registry });

  return {
    runtime,
    registry,
    dispatcher,
    dispatchStep: (step: ComputerUseMissionStepInput) => dispatcher.dispatch({ step }),
    canHandle: (step: { kind: string }) => dispatcher.canHandle(step),
    reset: () => {
      dispatcher.reset();
      runtime.reset();
    },
  };
}

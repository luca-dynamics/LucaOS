import { ComputerUseMissionEngineBridge } from "./ComputerUseMissionEngineBridge";
import { ComputerUseMissionRunner } from "./ComputerUseMissionRunner";
import { ComputerUseMissionStepAdapter } from "./ComputerUseMissionStepAdapter";
import { ComputerUseMissionTapeAdapter } from "./ComputerUseMissionTapeAdapter";
import { ComputerUseRuntimeEntrypoint } from "./ComputerUseRuntimeEntrypoint";
import { createComputerUsePipeline } from "./createComputerUsePipeline";
import { ComputerUseRuntime, CreateComputerUseRuntimeOptions } from "./types";

export function createComputerUseRuntime(options: CreateComputerUseRuntimeOptions = {}): ComputerUseRuntime {
  const pipeline = createComputerUsePipeline(options.pipelineOptions);
  const missionEngineBridge = new ComputerUseMissionEngineBridge(options.missionEngineBridgeOptions);
  const missionStepAdapter = new ComputerUseMissionStepAdapter({ pipeline, missionEngineBridge });
  const runtimeEntrypoint = new ComputerUseRuntimeEntrypoint({ pipeline, missionStepAdapter });
  const missionRunner = new ComputerUseMissionRunner({
    runtimeEntrypoint,
    missionTapeCompletion: options.missionTapeCompletion,
  });
  const missionTapeAdapter = options.missionTapeAdapter ?? new ComputerUseMissionTapeAdapter();

  return {
    pipeline,
    missionEngineBridge,
    missionStepAdapter,
    runtimeEntrypoint,
    missionRunner,
    missionTapeAdapter,
    runComputerUseStep: (step) => missionStepAdapter.executeStep(step),
    runPipelineInput: (input) => runtimeEntrypoint.runPipelineInput({ pipelineInput: input }),
    runMissionSteps: (steps) => missionRunner.runSteps(steps),
    reset: () => {
      missionRunner.reset();
      missionTapeAdapter.reset();
    },
  };
}

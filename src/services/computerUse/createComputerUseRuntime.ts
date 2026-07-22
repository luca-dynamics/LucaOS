import { MissionTapeRecorderService } from "../missionTape/MissionTapeRecorder";
import { ComputerUseMissionEngineBridge } from "./ComputerUseMissionEngineBridge";
import { ComputerUseMissionRunner } from "./ComputerUseMissionRunner";
import { ComputerUseMissionStepAdapter } from "./ComputerUseMissionStepAdapter";
import { ComputerUseMissionTapeAdapter } from "./ComputerUseMissionTapeAdapter";
import { ComputerUseRuntimeEntrypoint } from "./ComputerUseRuntimeEntrypoint";
import { createComputerUsePipeline } from "./createComputerUsePipeline";
import { ComputerUseRuntime, CreateComputerUseRuntimeOptions } from "./types";

/**
 * Product default: always attach mission-tape completion unless caller opts out
 * with `missionTapeCompletion: null` (or completeAfterRun: false).
 */
export function resolveMissionTapeCompletion(
  options: CreateComputerUseRuntimeOptions,
): CreateComputerUseRuntimeOptions["missionTapeCompletion"] {
  if (options.missionTapeCompletion === null) return undefined;
  if (options.missionTapeCompletion) return options.missionTapeCompletion;
  return {
    recorder: new MissionTapeRecorderService(),
    completeAfterRun: true,
  };
}

export function createComputerUseRuntime(options: CreateComputerUseRuntimeOptions = {}): ComputerUseRuntime {
  const pipeline = createComputerUsePipeline(options.pipelineOptions);
  const missionEngineBridge = new ComputerUseMissionEngineBridge(options.missionEngineBridgeOptions);
  const missionStepAdapter = new ComputerUseMissionStepAdapter({ pipeline, missionEngineBridge });
  const runtimeEntrypoint = new ComputerUseRuntimeEntrypoint({ pipeline, missionStepAdapter });
  const missionTapeCompletion = resolveMissionTapeCompletion(options);
  const missionRunner = new ComputerUseMissionRunner({
    runtimeEntrypoint,
    missionTapeCompletion,
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

import { sharedMissionTapeRecorder } from "../missionTape/sharedMissionTapeRecorder";
import { ComputerUseMissionEngineBridge } from "./ComputerUseMissionEngineBridge";
import { ComputerUseMissionRunner } from "./ComputerUseMissionRunner";
import { ComputerUseMissionStepAdapter } from "./ComputerUseMissionStepAdapter";
import { ComputerUseMissionTapeAdapter } from "./ComputerUseMissionTapeAdapter";
import { ComputerUseRuntimeEntrypoint } from "./ComputerUseRuntimeEntrypoint";
import { createComputerUsePipeline } from "./createComputerUsePipeline";
import {
  ComputerUseMissionRunnerOptions,
  ComputerUseRuntime,
  CreateComputerUseRuntimeOptions,
} from "./types";

/**
 * Product default: always attach mission-tape completion unless caller opts out
 * with `missionTapeCompletion: null` (or completeAfterRun: false).
 * Returns runner-shaped option (null opt-out maps to undefined).
 */
export function resolveMissionTapeCompletion(
  options: CreateComputerUseRuntimeOptions,
): ComputerUseMissionRunnerOptions["missionTapeCompletion"] {
  if (options.missionTapeCompletion === null) return undefined;
  if (options.missionTapeCompletion) return options.missionTapeCompletion;
  return {
    // Shared, so a computer-use run's tape is readable by Mission Center and
    // the gated-completion path rather than stranded in a private instance.
    recorder: sharedMissionTapeRecorder,
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

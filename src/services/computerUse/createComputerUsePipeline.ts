import { ComputerUseActionPlanner } from "./ComputerUseActionPlanner";
import { ComputerUseExecutor } from "./ComputerUseExecutor";
import { ComputerUseFocusContextBuilder } from "./ComputerUseFocusContext";
import { ComputerUseGuardBridge } from "./ComputerUseGuardBridge";
import { ComputerUseMissionTapeBridge } from "./ComputerUseMissionTapeBridge";
import { ComputerUsePipeline } from "./ComputerUsePipeline";
import { ComputerUseRecovery } from "./ComputerUseRecovery";
import { ComputerUseSandboxExecutorAdapter } from "./ComputerUseSandboxExecutorAdapter";
import { ComputerUseVerifier } from "./ComputerUseVerifier";
import { CreateComputerUsePipelineOptions } from "./types";

export function createComputerUsePipeline(options: CreateComputerUsePipelineOptions = {}): ComputerUsePipeline {
  const focusContextBuilder = new ComputerUseFocusContextBuilder(options.focusContextBuilderOptions);
  const actionPlanner = new ComputerUseActionPlanner();
  const executor = new ComputerUseExecutor(options.executorOptions);
  const guardBridge = new ComputerUseGuardBridge(options.guardBridgeOptions);
  const verifier = new ComputerUseVerifier(options.verifierOptions);
  const recovery = new ComputerUseRecovery(options.recoveryOptions);
  const tapeBridge = new ComputerUseMissionTapeBridge(options.missionTapeBridgeOptions);

  if (!options.disableDefaultSandboxAdapter) {
    executor.registerAdapter(new ComputerUseSandboxExecutorAdapter(options.sandboxAdapterOptions));
  }

  return new ComputerUsePipeline({
    focusContextBuilder,
    actionPlanner,
    executor,
    guardBridge,
    verifier,
    recovery,
    tapeBridge,
  });
}

import { ComputerUseActionPlanner } from "./ComputerUseActionPlanner";
import { ComputerUseExecutor } from "./ComputerUseExecutor";
import { ComputerUseFocusContextBuilder } from "./ComputerUseFocusContext";
import { ComputerUseGuardBridge } from "./ComputerUseGuardBridge";
import { ComputerUseMissionTapeBridge } from "./ComputerUseMissionTapeBridge";
import { ComputerUsePipeline } from "./ComputerUsePipeline";
import { ComputerUseRecovery } from "./ComputerUseRecovery";
import { ComputerUseSandboxExecutorAdapter } from "./ComputerUseSandboxExecutorAdapter";
import { ComputerUseVerifier } from "./ComputerUseVerifier";

export interface CreateComputerUsePipelineOptions {
  registerDefaultSandboxAdapter?: boolean;
  riskLevel?: "safe" | "sensitive" | "dangerous";
}

export function createComputerUsePipeline(options: CreateComputerUsePipelineOptions = {}): ComputerUsePipeline {
  const focusContextBuilder = new ComputerUseFocusContextBuilder({ riskLevel: options.riskLevel });
  const actionPlanner = new ComputerUseActionPlanner();
  const executor = new ComputerUseExecutor();
  const guardBridge = new ComputerUseGuardBridge();
  const verifier = new ComputerUseVerifier();
  const recovery = new ComputerUseRecovery();
  const tapeBridge = new ComputerUseMissionTapeBridge();

  if (options.registerDefaultSandboxAdapter !== false) {
    executor.registerAdapter(new ComputerUseSandboxExecutorAdapter());
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

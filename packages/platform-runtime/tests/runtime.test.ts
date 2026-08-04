import { createLucaRuntime } from "../src/RuntimeBuilder";
import { LucaRuntimeProcess } from "../src/LucaRuntimeProcess";

export async function runPlatformRuntimeTest(): Promise<void> {
  const runtime = createLucaRuntime();
  await runtime.start();

  const vm = runtime.getVoiceHudViewModel();
  if (vm.interactionState !== "idle") {
    throw new Error(`Expected initial state 'idle', got '${vm.interactionState}'`);
  }

  const health = runtime.getHealth();
  if (health.overall !== "healthy") {
    throw new Error(`Expected health 'healthy', got '${health.overall}'`);
  }

  await runtime.stop();

  // Test Phase F: LucaRuntimeProcess Single Process Integration
  const process = new LucaRuntimeProcess();
  await process.startProcess();
  const processVm = process.getViewModel();
  if (!processVm) throw new Error("LucaRuntimeProcess failed to project view model");
  process.stopProcess();

  console.log("✅ Platform Composition Root & LucaRuntimeProcess Phase F Test Passed Successfully!");
}

runPlatformRuntimeTest();

import { RuntimeKernel } from "../../../packages/platform-runtime/src";

export async function runKernelDemo(): Promise<void> {
  console.log("🌌 ====================================================== 🌌");
  console.log("🏆 STARTING LUCAOS RUNTIME KERNEL COMPOSITION ROOT DEMO 🏆");
  console.log("🌌 ====================================================== 🌌\n");

  // Single Composition Root Instantiation
  const kernel = new RuntimeKernel({ surface: "desktop", sessionId: "sess_gold_kernel" });
  await kernel.start();

  console.log("✅ RuntimeKernel Subsystems Verified:");
  console.log(`   • Runtime FSM State: ${kernel.runtimeProcess.currentState}`);
  console.log(`   • EventBus Active: ${!!kernel.eventBus}`);
  console.log(`   • MemoryCoordinator Gateway Active: ${!!kernel.memoryCoordinator}`);
  console.log(`   • TurnCoordinator Active: ${!!kernel.turnCoordinator}`);
  console.log(`   • WorkerScheduler Active: ${!!kernel.workerScheduler}`);

  kernel.stop();
  console.log("\n🌌 ====================================================== 🌌");
  console.log("✅ LUCAOS RUNTIME KERNEL COMPOSITION DEMO COMPLETED!");
  console.log("🌌 ====================================================== 🌌\n");
}

runKernelDemo();

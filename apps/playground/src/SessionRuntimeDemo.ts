import { RuntimeKernel } from "../../../packages/platform-runtime/src";

export async function runSessionRuntimeDemo(): Promise<void> {
  console.log("🔄 ====================================================== 🔄");
  console.log("🏆 STARTING LUCAOS SPRINT 3 PHASE 1: CONVERSATION RUNTIME 🏆");
  console.log("🔄 ====================================================== 🔄\n");

  const kernel = new RuntimeKernel({ surface: "desktop", sessionId: "sess_persistent_actor" });
  await kernel.start();

  // 1. Create Active ConversationRuntime Actor
  const sessionActor = kernel.sessionManager.createSession("sess_actor_1", "conv_main_1");
  console.log(`📌 Created Session Actor #${sessionActor.sessionId}`);

  // 2. Perform Turns & Checkpoints
  sessionActor.checkpoint("initial_start");
  sessionActor.suspend();
  console.log(`⏸️ Is Suspended: ${sessionActor.isSuspended}`);

  // 3. Resume Session Actor
  sessionActor.resume();
  console.log(`▶️ Is Suspended: ${sessionActor.isSuspended}`);

  // 4. Recover Session Actor from Store Checkpoint
  const recovered = sessionActor.recover();
  console.log(`🔄 Recover Result: ${recovered ? "SUCCESS" : "FAILED"}`);

  kernel.stop();
  console.log("\n🔄 ====================================================== 🔄");
  console.log("✅ LUCAOS CONVERSATION RUNTIME ACTOR DEMO COMPLETED!");
  console.log("🔄 ====================================================== 🔄\n");
}

runSessionRuntimeDemo();

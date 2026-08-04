import { RuntimeKernel } from "../../../packages/platform-runtime/src";

export async function runEventStoreDemo(): Promise<void> {
  console.log("📜 ====================================================== 📜");
  console.log("🏆 STARTING LUCAOS SPRINT 3 PHASE 2: IMMUTABLE EVENT STORE 🏆");
  console.log("📜 ====================================================== 📜\n");

  const kernel = new RuntimeKernel({ surface: "desktop", sessionId: "sess_event_sourcing" });
  await kernel.start();

  // 1. Create Active ConversationRuntime Actor
  const actor = kernel.sessionManager.createSession("sess_actor_event_1", "conv_main_2");
  actor.eventStore = kernel.eventStore;

  // 2. Post Messages to Actor Mailbox
  console.log("📬 Posting messages to Session Actor Mailbox...");
  actor.post({ type: "USER_PROMPT", payload: { text: "Book me a flight to Abuja tomorrow" } });
  actor.post({ type: "WORKER_COMPLETED", payload: { workerId: "wrk_1", result: "AST analysis clean" } });

  // 3. Suspend and Resume Actor to Append Domain Events
  actor.suspend();
  actor.resume();

  // 4. Stream Event Log from EventStore
  const events = kernel.eventStore.stream("sess_actor_event_1");
  console.log(`\n📜 IMMUTABLE EVENT STREAM FOR SESSION #${actor.sessionId} (${events.length} Events):`);
  for (const e of events) {
    console.log(`   [Seq #${e.sequence}] Domain: ${e.domain.padEnd(8, " ")} | Type: ${e.type.padEnd(18, " ")} | ID: ${e.id}`);
  }

  kernel.stop();
  console.log("\n📜 ====================================================== 📜");
  console.log("✅ LUCAOS IMMUTABLE EVENT STORE DEMO COMPLETED SUCCESSFULLY!");
  console.log("📜 ====================================================== 📜\n");
}

runEventStoreDemo();

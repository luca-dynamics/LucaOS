import { LucaRuntimeProcess } from "../../../packages/platform-runtime/src";
import { OpenAIProviderAdapter } from "../../../packages/conversation-engine/src";

export async function runMemoryDemo(): Promise<void> {
  console.log("🧠 ====================================================== 🧠");
  console.log("🏆 STARTING LUCAOS SPRINT 2 PHASE 3: COGNITIVE MEMORY 🏆");
  console.log("🧠 ====================================================== 🧠\n");

  const process = new LucaRuntimeProcess();
  
  // Register default OpenAI provider adapter into ModelRouter registry
  const openaiAdapter = new OpenAIProviderAdapter();
  process.conversationSession.router.registry.register(openaiAdapter);

  await process.startProcess();

  // 1. Seed Semantic Memory with User Preference Fact
  process.conversationSession.memory.semanticMemory.setFact(
    "Preferred Meeting Day",
    "User prefers meetings on Friday afternoons.",
    "preference"
  );

  process.beginListening();
  process.beginUnderstanding();
  process.beginThinking();

  // 2. Execute Turn with Live Memory Context Injection
  console.log("🎙️ User Prompt: \"Luca, what day should I reschedule my meeting?\"");
  const response = await process.conversationSession.executeTurn(
    "Luca, what day should I reschedule my meeting?",
    {
      onPartialToken: (tok) => { globalThis.process.stdout?.write?.(tok); },
      onSentenceComplete: (s) => console.log(`\n💬 Sentence Streamed to TTS: "${s}"`),
      onCompleted: (full) => console.log(`\n🎉 Final Answer: "${full}"`),
      onError: console.error,
    }
  );

  process.beginSpeaking();
  process.finishTurn();

  // 3. Verify Decision Graph Output
  const decisionGraph = process.conversationSession.lastDecisionGraph;
  console.log("\n📊 TURN DECISION GRAPH NODES:");
  if (decisionGraph) {
    for (const node of decisionGraph.nodes) {
      console.log(`   [${node.stage}] -> Provider: ${node.provider} | Decision: ${node.decision} (${node.outputSummary})`);
    }
  }

  process.stopProcess();
  console.log("\n🧠 ====================================================== 🧠");
  console.log("✅ LUCAOS COGNITIVE MEMORY INTEGRATION COMPLETED SUCCESSFULLY!");
  console.log("🧠 ====================================================== 🧠\n");
}

runMemoryDemo();

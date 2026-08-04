import { RuntimeKernel } from "../../../packages/platform-runtime/src";
import { OpenAIProviderAdapter } from "../../../packages/conversation-engine/src";

export async function runStreamingDemo(): Promise<void> {
  console.log("⚡ ====================================================== ⚡");
  console.log("🏆 STARTING LUCAOS SPRINT 3 PHASE 3: STREAMING PIPELINE  🏆");
  console.log("⚡ ====================================================== ⚡\n");

  const kernel = new RuntimeKernel({ surface: "desktop", sessionId: "sess_streaming_engine" });
  kernel.providerRegistry.register(new OpenAIProviderAdapter());
  await kernel.start();

  console.log("🎙️ Partial STT Stream: \"What is the weather in Abuja tomorrow?\"");
  console.log("🚀 Executing Overlapped Streaming Pipeline (Partial STT ➔ Incremental Reasoning ➔ Sentence Queue ➔ TTS)\n");

  let sentenceCount = 0;
  const response = await kernel.turnCoordinator.executeStreamingTurnPlan(
    "What is the weather in Abuja tomorrow?",
    {
      onPartialToken: (tok) => { globalThis.process.stdout?.write?.(tok); },
      onSentenceComplete: (s) => {
        sentenceCount++;
        console.log(`\n💬 [Sentence #${sentenceCount} Streamed to TTS]: "${s}"`);
      },
      onCompleted: (full) => {
        console.log(`\n🎉 [Final Stream Response]: "${full}"`);
      },
      onError: console.error,
    },
    (metrics) => {
      console.log("\n📊 STREAMING PIPELINE LATENCY BREAKDOWN:");
      console.log(`   • Partial STT Latency: ${metrics.sttPartialMs}ms`);
      console.log(`   • LLM Time-to-First-Token (TTFT): ${metrics.llmFirstTokenMs}ms`);
      console.log(`   • First Sentence TTS Queue: ${metrics.firstSentenceTtsMs}ms`);
      console.log(`   • Total Overlapped Turn Duration: ${metrics.totalTurnMs}ms`);
    }
  );

  kernel.stop();
  console.log("\n⚡ ====================================================== ⚡");
  console.log("✅ LUCAOS OVERLAPPED STREAMING CONVERSATION DEMO COMPLETED!");
  console.log("⚡ ====================================================== ⚡\n");
}

runStreamingDemo();

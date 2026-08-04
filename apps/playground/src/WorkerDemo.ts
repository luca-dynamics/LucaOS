import { LucaRuntimeProcess } from "../../../packages/platform-runtime/src";

export async function runWorkerDemo(): Promise<void> {
  console.log("⚙️ ====================================================== ⚙️");
  console.log("🏆 STARTING LUCAOS SPRINT 2 PHASE 4: WORKER RUNTIME 🏆");
  console.log("⚙️ ====================================================== ⚙️\n");

  const process = new LucaRuntimeProcess();
  await process.startProcess();

  // 1. Register Background Code Analysis Worker Handler
  process.workerScheduler.registry.register({
    taskType: "code_analysis",
    name: "Static AST Codebase Analyzer",
    execute: async (payload) => {
      console.log(`💻 [WorkerHandler] Analyzing repo target: ${payload.targetDir}...`);
      await new Promise((r) => setTimeout(r, 60));
      return { linesOfCode: 14820, securityVulnerabilities: 0, architectureScore: 9.8 };
    },
  });

  // 2. Schedule Background Task
  console.log("🚀 Scheduling background codebase analysis job...");
  const job = await process.workerScheduler.scheduleJob("code_analysis", { targetDir: "C:/Users/HP/Documents/LucaOS" });
  console.log(`📋 Job #${job.jobId} submitted to WorkerQueue.`);

  // 3. Demonstrate Non-Blocking Active Conversation Loop
  process.beginListening();
  process.beginUnderstanding();
  process.beginThinking();
  process.beginSpeaking();
  process.finishTurn();

  await new Promise((r) => setTimeout(r, 100));

  process.stopProcess();
  console.log("\n⚙️ ====================================================== ⚙️");
  console.log("✅ LUCAOS BACKGROUND WORKER RUNTIME DEMO COMPLETED SUCCESSFULLY!");
  console.log("⚙️ ====================================================== ⚙️\n");
}

runWorkerDemo();

import { RuntimeKernel, ResearchAgentWorker, CalendarAgentWorker } from "../../../packages/platform-runtime/src";
import { TaskPlanner } from "../../../packages/conversation-engine/src";

export async function runAgentDAGDemo(): Promise<void> {
  console.log("🕸️ ====================================================== 🕸️");
  console.log("🏆 STARTING LUCAOS SPRINT 3 TASK PLANNER DAG & AGENTS  🏆");
  console.log("🕸️ ====================================================== 🕸️\n");

  const kernel = new RuntimeKernel({ surface: "desktop", sessionId: "sess_agent_dag" });
  await kernel.start();

  // 1. Register Autonomous Agent Workers in WorkerRegistry
  kernel.workerScheduler.registry.register(new ResearchAgentWorker());
  kernel.workerScheduler.registry.register(new CalendarAgentWorker());

  // 2. Decompose User Intent into Execution Plan DAG & Budget
  console.log("🎙️ User Intent: \"Research LucaOS architecture and schedule a team sync tomorrow.\"");
  const plan = TaskPlanner.decomposeUserIntent("Research LucaOS architecture and schedule a team sync tomorrow.");

  console.log("\n📋 EXECUTION BUDGET CONSTRAINTS:");
  console.log(`   Max Latency: ${plan.budget.maxLatencyMs}ms | Max Workers: ${plan.budget.maxWorkers} | Priority: ${plan.budget.priority.toUpperCase()}`);

  console.log("\n🕸️ EXECUTION PLAN DAG NODES:");
  for (const step of plan.dag) {
    const deps = step.dependsOn.length ? `(Depends on: ${step.dependsOn.join(", ")})` : "(Root Step)";
    console.log(`   [${step.stepId}] ${step.stepName.padEnd(22, " ")} ${deps}`);
  }

  // 3. Schedule Autonomous Agent Jobs Concurrently
  console.log("\n🚀 Dispatching Autonomous Agent Workers to WorkerScheduler...");
  const job1 = await kernel.workerScheduler.scheduleJob("research_agent", { query: "LucaOS Architecture" });
  const job2 = await kernel.workerScheduler.scheduleJob("calendar_agent", { eventTitle: "Team Sync" });

  await new Promise((r) => setTimeout(r, 120));

  kernel.stop();
  console.log("\n🕸️ ====================================================== 🕸️");
  console.log("✅ LUCAOS TASK PLANNER DAG & AUTONOMOUS AGENTS COMPLETED!");
  console.log("🕸️ ====================================================== 🕸️\n");
}

runAgentDAGDemo();

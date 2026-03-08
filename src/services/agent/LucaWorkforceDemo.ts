/**
 * Luca Workforce Demo & Testing
 *
 * Test the multi-persona workforce system
 * Shows Luca's different capabilities working in parallel
 */

import { lucaWorkforce } from "./LucaWorkforce";
import { agentService } from "./AgentService";

/**
 * Demo 1: Simple Workflow
 * Shows basic parallel execution
 */
export async function demoSimpleWorkflow() {
  console.log("=".repeat(60));
  console.log("DEMO 1: Simple Multi-Persona Workflow");
  console.log("=".repeat(60));

  const workflowId = await lucaWorkforce.startWorkflow(
    "Build a simple authentication system with login and logout",
    "/workspace/demo"
  );

  console.log(`\nWorkflow started: ${workflowId}`);
  console.log(
    "Watch the logs to see different Luca personas working in parallel!\n"
  );

  // Wait a bit to see results
  await new Promise((resolve) => setTimeout(resolve, 5000));

  const status = lucaWorkforce.getWorkflowStatus(workflowId);
  if (status) {
    console.log("\n--- Workflow Status ---");
    console.log(`Total Tasks: ${status.tasks.length}`);
    console.log(
      `Completed: ${status.tasks.filter((t) => t.status === "complete").length}`
    );
    console.log(
      `In Progress: ${
        status.tasks.filter((t) => t.status === "in-progress").length
      }`
    );
    console.log(
      `Pending: ${status.tasks.filter((t) => t.status === "pending").length}`
    );

    console.log("\n--- Task Breakdown ---");
    status.tasks.forEach((task) => {
      const icon =
        task.status === "complete"
          ? "✅"
          : task.status === "in-progress"
          ? "🔄"
          : task.status === "failed"
          ? "❌"
          : "⏳";
      console.log(`${icon} ${task.persona} Luca: ${task.description}`);
    });
  }
}

/**
 * Demo 2: Complex Workflow
 * Shows workforce handling complex goal with dependencies
 */
export async function demoComplexWorkflow() {
  console.log("\n" + "=".repeat(60));
  console.log("DEMO 2: Complex Multi-Persona Workflow");
  console.log("=".repeat(60));

  const workflowId = await lucaWorkforce.startWorkflow(
    "Create a secure user management API with authentication, authorization, input validation, SQL injection prevention, and comprehensive tests",
    "/workspace/complex-demo"
  );

  console.log(`\nComplex workflow started: ${workflowId}`);
  console.log("This will involve:");
  console.log("- Engineer Luca: Writing code");
  console.log("- Hacker Luca: Security scanning");
  console.log("- Assistant Luca: Documentation\n");

  // Monitor progress
  const checkInterval = setInterval(() => {
    const status = lucaWorkforce.getWorkflowStatus(workflowId);
    if (status) {
      const completed = status.tasks.filter(
        (t) => t.status === "complete"
      ).length;
      const total = status.tasks.length;
      const percent = Math.round((completed / total) * 100);

      console.log(`Progress: ${completed}/${total} tasks (${percent}%)`);

      if (completed === total) {
        clearInterval(checkInterval);
        console.log("\n✅ Complex workflow complete!");
      }
    }
  }, 1000);

  // Stop monitoring after 10 seconds
  setTimeout(() => clearInterval(checkInterval), 10000);
}

/**
 * Demo 3: Workforce vs Single-Agent Comparison
 * Shows speed difference
 */
export async function demoWorkforceVsSingleAgent() {
  console.log("\n" + "=".repeat(60));
  console.log("DEMO 3: Workforce vs Single-Agent Speed Comparison");
  console.log("=".repeat(60));

  const goal =
    "Implement user authentication, write tests, scan for vulnerabilities, and document the API";

  // Test 1: Single-agent mode
  console.log("\n[Test 1] Single-Agent Mode (sequential)...");
  const singleStart = Date.now();
  await agentService.startTask(goal, "/workspace/single", undefined, false);
  await new Promise((resolve) => setTimeout(resolve, 3000));
  const singleDuration = Date.now() - singleStart;
  console.log(`Single-Agent completed in: ${singleDuration}ms`);

  // Test 2: Workforce mode
  console.log("\n[Test 2] Workforce Mode (parallel)...");
  const workforceStart = Date.now();
  await lucaWorkforce.startWorkflow(goal, "/workspace/workforce");
  await new Promise((resolve) => setTimeout(resolve, 3000));
  const workforceDuration = Date.now() - workforceStart;
  console.log(`Workforce completed in: ${workforceDuration}ms`);

  // Comparison
  console.log("\n--- Results ---");
  console.log(`Single-Agent: ${singleDuration}ms`);
  console.log(`Workforce: ${workforceDuration}ms`);
  const speedup = (singleDuration / workforceDuration).toFixed(2);
  console.log(`Speedup: ${speedup}x faster with workforce!`);
}

/**
 * Run all demos
 */
export async function runAllDemos() {
  try {
    await demoSimpleWorkflow();
    await new Promise((resolve) => setTimeout(resolve, 2000));

    await demoComplexWorkflow();
    await new Promise((resolve) => setTimeout(resolve, 2000));

    await demoWorkforceVsSingleAgent();

    console.log("\n" + "=".repeat(60));
    console.log("ALL DEMOS COMPLETE!");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("Demo error:", error);
  }
}

// Export for console testing
if (typeof window !== "undefined") {
  (window as any).lucaWorkforceDemo = {
    simple: demoSimpleWorkflow,
    complex: demoComplexWorkflow,
    comparison: demoWorkforceVsSingleAgent,
    all: runAllDemos,
    workforce: lucaWorkforce,
  };

  console.log("🎯 Luca Workforce Demo loaded!");
  console.log("Try: window.lucaWorkforceDemo.simple()");
  console.log("Or:  window.lucaWorkforceDemo.all()");
}

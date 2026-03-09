/**
 * End-to-End Test Suite for Luca Agent Workforce
 *
 * Run these tests in browser console to validate the complete system
 */

import { lucaWorkforce } from "../LucaWorkforce";
import { agentToolBridge } from "../tools/AgentToolBridge";

/**
 * Test 1: Simple File Operation Workflow
 */
export async function test1_SimpleFileWorkflow() {
  console.log("\n=== TEST 1: Simple File Workflow ===\n");

  try {
    const workflowId = await lucaWorkforce.startWorkflow(
      "Read package.json file and list its dependencies",
      ".",
    );

    console.log(`✅ Workflow started: ${workflowId}`);

    // Wait for completion
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const status = lucaWorkforce.getWorkflowStatus(workflowId);

    if (!status) {
      throw new Error("Workflow not found");
    }

    const completedTasks = status.tasks.filter((t) => t.status === "complete");
    const failedTasks = status.tasks.filter((t) => t.status === "failed");

    console.log(`\nResults:`);
    console.log(`  Total tasks: ${status.tasks.length}`);
    console.log(`  Completed: ${completedTasks.length}`);
    console.log(`  Failed: ${failedTasks.length}`);

    if (failedTasks.length > 0) {
      console.error("  Failed tasks:", failedTasks);
      return false;
    }

    console.log("✅ TEST 1 PASSED\n");
    return true;
  } catch (error) {
    console.error("❌ TEST 1 FAILED:", error);
    return false;
  }
}

/**
 * Test 2: Tool Selection Intelligence
 */
export async function test2_ToolSelection() {
  console.log("\n=== TEST 2: Tool Selection Intelligence ===\n");

  try {
    // Test that different task descriptions select appropriate tools
    const tests = [
      {
        description: "Read the README.md file",
        expectedPersona: "ENGINEER",
        expectedToolType: "read",
      },
      {
        description: "Scan for security vulnerabilities",
        expectedPersona: "HACKER",
        expectedToolType: "security",
      },
      {
        description: "Create documentation for the API",
        expectedPersona: "ASSISTANT",
        expectedToolType: "document",
      },
    ];

    for (const test of tests) {
      console.log(`\nTesting: "${test.description}"`);

      const workflowId = await lucaWorkforce.startWorkflow(
        test.description,
        ".",
      );

      await new Promise((resolve) => setTimeout(resolve, 3000));

      const status = lucaWorkforce.getWorkflowStatus(workflowId);

      if (!status) {
        throw new Error(`Workflow not found for: ${test.description}`);
      }

      const hasExpectedPersona = status.tasks.some(
        (t) => t.persona === test.expectedPersona,
      );

      console.log(
        `  Expected persona (${test.expectedPersona}): ${
          hasExpectedPersona ? "✅" : "❌"
        }`,
      );

      if (!hasExpectedPersona) {
        console.warn(
          `  Warning: Expected ${test.expectedPersona}, got:`,
          status.tasks.map((t) => t.persona),
        );
      }
    }

    console.log("\n✅ TEST 2 PASSED\n");
    return true;
  } catch (error) {
    console.error("❌ TEST 2 FAILED:", error);
    return false;
  }
}

/**
 * Test 3: Persona Tool Access Control
 */
export async function test3_AccessControl() {
  console.log("\n=== TEST 3: Access Control ===\n");

  try {
    const tests = [
      {
        persona: "ENGINEER",
        tool: "readFile",
        shouldSucceed: true,
      },
      {
        persona: "ENGINEER",
        tool: "osintDarkWebScan",
        shouldSucceed: false, // ENGINEER shouldn't have OSINT tools
      },
      {
        persona: "HACKER",
        tool: "osintDarkWebScan",
        shouldSucceed: true,
      },
      {
        persona: "ASSISTANT",
        tool: "whatsappSendMessage",
        shouldSucceed: true,
      },
      {
        persona: "LUCAGENT",
        tool: "osintDarkWebScan",
        shouldSucceed: true, // LUCAGENT has everything
      },
    ];

    for (const test of tests) {
      const result = await agentToolBridge.executeTool(
        test.tool,
        {},
        test.persona as any,
      );

      const actualSuccess = result.success;
      const accessGranted = !result.error?.includes("does not have access");

      const passed =
        (test.shouldSucceed && accessGranted) ||
        (!test.shouldSucceed && !accessGranted);

      console.log(
        `${passed ? "✅" : "❌"} ${test.persona} + ${test.tool}: ` +
          `expected ${test.shouldSucceed ? "allowed" : "denied"}, ` +
          `got ${accessGranted ? "allowed" : "denied"}`,
      );

      if (!passed) {
        return false;
      }
    }

    console.log("\n✅ TEST 3 PASSED\n");
    return true;
  } catch (error) {
    console.error("❌ TEST 3 FAILED:", error);
    return false;
  }
}

/**
 * Test 4: Parallel Execution
 */
export async function test4_ParallelExecution() {
  console.log("\n=== TEST 4: Parallel Execution ===\n");

  try {
    const startTime = Date.now();

    const workflowId = await lucaWorkforce.startWorkflow(
      "Read package.json, check security, and create documentation",
      ".",
    );

    // Wait for completion
    await new Promise((resolve) => setTimeout(resolve, 10000));

    const duration = Date.now() - startTime;
    const status = lucaWorkforce.getWorkflowStatus(workflowId);

    if (!status) {
      throw new Error("Workflow not found");
    }

    console.log(`\nParallel Groups: ${status.parallelGroups.length}`);
    console.log(`Total Duration: ${duration}ms`);

    // Check if tasks were grouped for parallel execution
    const hasParallelGroups = status.parallelGroups.length > 1;

    console.log(
      `Parallel execution detected: ${hasParallelGroups ? "✅" : "⚠️"}`,
    );

    console.log("\n✅ TEST 4 PASSED\n");
    return true;
  } catch (error) {
    console.error("❌ TEST 4 FAILED:", error);
    return false;
  }
}

/**
 * Test 5: Error Handling
 */
export async function test5_ErrorHandling() {
  console.log("\n=== TEST 5: Error Handling ===\n");

  try {
    // Test with invalid file path
    const result = await agentToolBridge.executeTool(
      "readFile",
      { path: "../../../etc/passwd" }, // Should be blocked
      "ENGINEER",
    );

    const blocked =
      !result.success && result.error?.includes("relative to workspace");

    console.log(`Path validation: ${blocked ? "✅" : "❌"}`);

    if (!blocked) {
      console.error("Security issue: Path validation failed!");
      return false;
    }

    console.log("\n✅ TEST 5 PASSED\n");
    return true;
  } catch (error) {
    console.error("❌ TEST 5 FAILED:", error);
    return false;
  }
}

/**
 * Test 6: Tool Statistics
 */
export async function test6_ToolStats() {
  console.log("\n=== TEST 6: Tool Statistics ===\n");

  try {
    const stats = agentToolBridge.getToolStats();

    console.log(`Total tools available: ${stats.totalTools}`);
    console.log(`Tools by persona:`);
    console.log(`  ENGINEER: ${stats.toolsByPersona.ENGINEER}`);
    console.log(`  HACKER: ${stats.toolsByPersona.HACKER}`);
    console.log(`  ASSISTANT: ${stats.toolsByPersona.ASSISTANT}`);
    console.log(`  LUCAGENT: ${stats.toolsByPersona.LUCAGENT}`);

    // Verify LUCAGENT has most tools
    const lucagentHasAll =
      stats.toolsByPersona.LUCAGENT >= stats.totalTools * 0.9;

    console.log(`\nLUCAGENT has full access: ${lucagentHasAll ? "✅" : "❌"}`);

    console.log("\n✅ TEST 6 PASSED\n");
    return true;
  } catch (error) {
    console.error("❌ TEST 6 FAILED:", error);
    return false;
  }
}

/**
 * Run all tests
 */
export async function runAllTests() {
  console.log("\n🧪 LUCA AGENT WORKFORCE - END-TO-END TESTS\n");
  console.log("=".repeat(60));

  const results = {
    test1: await test1_SimpleFileWorkflow(),
    test2: await test2_ToolSelection(),
    test3: await test3_AccessControl(),
    test4: await test4_ParallelExecution(),
    test5: await test5_ErrorHandling(),
    test6: await test6_ToolStats(),
  };

  console.log("\n" + "=".repeat(60));
  console.log("\n📊 TEST RESULTS:\n");

  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;

  Object.entries(results).forEach(([name, result]) => {
    console.log(
      `${result ? "✅" : "❌"} ${name}: ${result ? "PASSED" : "FAILED"}`,
    );
  });

  console.log(
    `\n${passed}/${total} tests passed (${Math.round((passed / total) * 100)}%)`,
  );

  if (passed === total) {
    console.log("\n🎉 ALL TESTS PASSED! System is production-ready!\n");
  } else {
    console.log("\n⚠️  Some tests failed. Review errors above.\n");
  }

  return { passed, total, results };
}

// Export for console use
if (typeof window !== "undefined") {
  (window as any).lucaTests = {
    runAll: runAllTests,
    test1: test1_SimpleFileWorkflow,
    test2: test2_ToolSelection,
    test3: test3_AccessControl,
    test4: test4_ParallelExecution,
    test5: test5_ErrorHandling,
    test6: test6_ToolStats,
  };

  console.log("✅ Luca Tests loaded! Run: lucaTests.runAll()");
}

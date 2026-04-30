/**
 * Luca Multi-Agent Workforce System
 *
 * Enables parallel execution of Luca's specialized personas
 * Based on Luca's existing persona system + Eigent's orchestration patterns
 *
 * KEY CONCEPT: ONE Luca, Multiple Capabilities Working in Parallel
 * - Not multiple AIs - different aspects of ONE Luca
 * - Same personality, memory, and relationship
 * - Just activating multiple personas simultaneously
 */

import type { PersonaType } from "../../config/personaConfig";
import type { AgentStep } from "./types";
import { agentPlanner } from "./AgentPlanner";
import { resourceLockManager } from "./LucaResourceLock";
import { AgentTrace } from "./LucaTracing";
import { personalityService } from "../personalityService";
import { AgentToolBridge } from "./tools/AgentToolBridge";
import { llmToolSelector } from "./tools/LLMToolSelector";
import { CORTEX_URL } from "../../config/api";
import { pentestSessionStore } from "./PentestSessionStore";
import type { PentestPhase } from "./pentestTypes";
import { missionControlService } from "./MissionControlService";
import { ProviderFactory } from "../llm/ProviderFactory";
import { thoughtStreamService } from "../thoughtStreamService";
import { settingsService } from "../settingsService";
import { cognitiveDeliberator } from "../cognitiveDeliberator";
import { IS_ORIGIN } from "../../config/buildConfig";

export interface WorkflowTask {
  id: string;
  persona: PersonaType;
  description: string;
  estimatedComplexity: number;
  dependencies: string[]; // IDs of tasks that must complete first
  status: "pending" | "in-progress" | "complete" | "failed";
  result?: any;
  error?: string;
  snapshot?: {
    terminal?: string[];
    browserScreenshot?: string;
  };
}

export interface WorkflowPlan {
  workflowId: string;
  goal: string;
  tasks: WorkflowTask[];
  parallelGroups: WorkflowTask[][]; // Tasks grouped by parallel execution
}

/**
 * Luca Workforce Orchestrator
 * Coordinates multiple personas working in parallel
 */
export class LucaWorkforce {
  private activeWorkflows: Map<string, WorkflowPlan> = new Map();
  private trace?: AgentTrace;

  /**
   * Start a multi-persona workflow
   * Central Luca analyzes goal and delegates to specialists
   */
  async startWorkflow(goal: string, workspace: string): Promise<string> {
    const workflowId = `workflow_${Date.now()}`;

    // Start trace
    this.trace = new AgentTrace(workflowId, "luca-workforce");
    this.trace.log("workflow_started", { goal, workspace });

    console.log("[LucaWorkforce] Central Luca analyzing goal...");
    console.log(`  Goal: ${goal}`);

    // Step 1: Get Luca's personality context
    const personality = personalityService.getPersonality();
    const warmth = personality.traits.warmth;

    console.log(`[LucaWorkforce] Using personality (warmth: ${warmth}/100)`);

    // Phase 3: Check for existing active pentest session to resume
    let activeSessionId = workflowId;
    if (this.isSecurityGoal(goal)) {
      const activeSessions = await pentestSessionStore.getActiveSessions();
      const existing = activeSessions.find((s) => s.targetUrl === workspace);
      if (existing) {
        console.log(
          `[LucaWorkforce] 🔄 Found existing active session for ${workspace}: ${existing.id}. Resuming...`,
        );
        activeSessionId = existing.id;
        // In a real scenario, we might want to skip some planning steps here
      }
    }

    // Step 2: Break down into persona-specific tasks
    const plan = await this.createWorkflowPlan(goal, workspace, workflowId);
    this.activeWorkflows.set(workflowId, plan);

    this.trace.log("plan_created", {
      totalTasks: plan.tasks.length,
      parallelGroups: plan.parallelGroups.length,
    });

    // Step 3: Execute in parallel groups
    console.log("[LucaWorkforce] Delegating to specialized capabilities:");
    plan.tasks.forEach((task) => {
      console.log(`  - ${task.persona} Luca: ${task.description}`);
    });

    // Execute workflow (non-blocking)
    this.executeWorkflow(workflowId).catch((error) => {
      console.error("[LucaWorkforce] Workflow error:", error);
      if (this.trace) this.trace.error("workflow_error", error);
    });

    // Phase 2/3: Automatically start or resume a pentest session if goal is security-related
    if (this.isSecurityGoal(goal)) {
      await pentestSessionStore.startSession({
        id: activeSessionId,
        projectName: workspace.split("/").pop() || "Security Project",
        targetUrl: workspace,
        currentPhase: "recon",
      });
      console.log(
        `[LucaWorkforce] 🛡️ Persistent pentest session active: ${activeSessionId}`,
      );
    }

    return activeSessionId;
  }

  /**
   * Check if a goal is security-related
   */
  private isSecurityGoal(goal: string): boolean {
    const lowerGoal = goal.toLowerCase();
    return (
      lowerGoal.includes("security") ||
      lowerGoal.includes("pentest") ||
      lowerGoal.includes("vulnerability") ||
      lowerGoal.includes("audit")
    );
  }

  /**
   * Create a workflow plan by analyzing the goal
   */
  private async createWorkflowPlan(
    goal: string,
    workspace: string,
    workflowId: string,
  ): Promise<WorkflowPlan> {
    console.log("[LucaWorkforce] Creating workflow plan...");

    // Use AgentPlanner to break down goal into steps
    const steps = await agentPlanner.createPlan(goal);

    // Convert steps to persona-specific tasks
    const tasks: WorkflowTask[] = steps.map((step, index) => ({
      id: `task_${index}`,
      persona: this.selectPersonaForStep(step),
      description: step.description,
      estimatedComplexity: step.estimatedComplexity,
      dependencies: this.determineDependencies(step, steps),
      status: "pending" as const,
    }));

    // Group tasks by parallel execution potential
    const parallelGroups = this.createParallelGroups(tasks);

    console.log(
      `[LucaWorkforce] Plan created: ${tasks.length} tasks in ${parallelGroups.length} groups`,
    );

    return {
      workflowId,
      goal,
      tasks,
      parallelGroups,
    };
  }

  /**
   * Select best persona for a step
   */
  private selectPersonaForStep(step: AgentStep): PersonaType {
    const desc = step.description.toLowerCase();

    // Check for persona-specific keywords
    if (
      desc.includes("code") ||
      desc.includes("implement") ||
      desc.includes("write")
    ) {
      return "ENGINEER";
    }
    if (
      desc.includes("security") ||
      desc.includes("scan") ||
      desc.includes("vulnerability")
    ) {
      return "HACKER";
    }
    if (
      desc.includes("test") ||
      desc.includes("verify") ||
      desc.includes("check")
    ) {
      return "ENGINEER"; // Testing is part of engineering
    }
    if (
      desc.includes("audit") ||
      desc.includes("configuration") ||
      desc.includes("settings")
    ) {
      return "AUDITOR";
    }
    if (
      desc.includes("document") ||
      desc.includes("explain") ||
      desc.includes("write")
    ) {
      return "ASSISTANT";
    }

    // Default to LUCAGENT for general tasks
    return "LUCAGENT";
  }

  /**
   * Determine task dependencies
   */
  private determineDependencies(
    step: AgentStep,
    allSteps: AgentStep[],
  ): string[] {
    // Simple dependency: current step depends on previous step
    // Phase 7B: Basic implementation
    // Phase 8: Smarter dependency detection

    const currentIndex = allSteps.indexOf(step);
    if (currentIndex === 0) return [];

    // Depend on immediate previous step
    return [`task_${currentIndex - 1}`];
  }

  /**
   * Group tasks that can run in parallel
   */
  private createParallelGroups(tasks: WorkflowTask[]): WorkflowTask[][] {
    const groups: WorkflowTask[][] = [];
    const processed = new Set<string>();

    for (const task of tasks) {
      if (processed.has(task.id)) continue;

      // Find all tasks with same dependencies (can run in parallel)
      const parallelTasks = tasks.filter(
        (t) =>
          !processed.has(t.id) &&
          JSON.stringify(t.dependencies) === JSON.stringify(task.dependencies),
      );

      groups.push(parallelTasks);
      parallelTasks.forEach((t) => processed.add(t.id));
    }

    console.log(
      `[LucaWorkforce] Created ${groups.length} parallel execution groups`,
    );
    groups.forEach((group, i) => {
      console.log(
        `  Group ${i + 1}: ${group.length} tasks (${group
          .map((t) => t.persona)
          .join(", ")})`,
      );
    });

    return groups;
  }

  /**
   * Execute workflow in parallel groups
   */
  private async executeWorkflow(workflowId: string): Promise<void> {
    const plan = this.activeWorkflows.get(workflowId);
    if (!plan) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    console.log("[LucaWorkforce] === WORKFLOW EXECUTION STARTED ===");

    // PHASE 2: Default to Sequential for complex goals (High Fidelity)
    const isHighFidelity =
      plan.tasks.length > 3 ||
      plan.goal.toLowerCase().includes("implement") ||
      plan.goal.toLowerCase().includes("build");

    if (isHighFidelity) {
      return this.executeSequentialPipeline(workflowId);
    }

    try {
      // Execute each parallel group sequentially
      for (
        let groupIndex = 0;
        groupIndex < plan.parallelGroups.length;
        groupIndex++
      ) {
        const group = plan.parallelGroups[groupIndex];

        console.log(
          `[LucaWorkforce] Executing group ${groupIndex + 1}/${
            plan.parallelGroups.length
          } (${group.length} tasks in parallel)...`,
        );

        if (this.trace) {
          this.trace.log("group_started", {
            groupIndex,
            taskCount: group.length,
            personas: group.map((t) => t.persona),
          });
        }

        // Execute all tasks in group IN PARALLEL
        const promises = group.map((task) => this.executeTask(task));
        const results = await Promise.allSettled(promises);

        // Check for failures
        const failures = results.filter((r) => r.status === "rejected");
        if (failures.length > 0) {
          console.error(
            `[LucaWorkforce] ${failures.length} tasks failed in group ${
              groupIndex + 1
            }`,
          );

          if (this.trace) {
            this.trace.error(
              "group_failed",
              new Error(`${failures.length} tasks failed`),
            );
          }

          throw new Error(`Workflow group ${groupIndex + 1} failed`);
        }

        console.log(`[LucaWorkforce] ✅ Group ${groupIndex + 1} complete`);
      }

      console.log("[LucaWorkforce] === WORKFLOW COMPLETE ===");

      if (this.trace) {
        this.trace.log("workflow_complete", {
          totalTasks: plan.tasks.length,
          successfulTasks: plan.tasks.filter((t) => t.status === "complete")
            .length,
        });
        this.trace.end();
      }
    } catch (error) {
      console.error("[LucaWorkforce] Workflow failed:", error);

      if (this.trace) {
        this.trace.error("workflow_failed", error as Error);
        this.trace.end();
      }

      throw error;
    }
  }

  /**
   * Execute a single task with a specific persona
   */
  private async executeTask(task: WorkflowTask): Promise<void> {
    const startTime = Date.now();

    // PHASE 3: Cognitive Lockdown - Ensure mission integrity before launching persona
    const check = await cognitiveDeliberator.checkBeliefViolations();
    if (check.violated) {
      const category = check.category || "CORE_BELIEF";
      task.status = "failed";
      task.error = `[${category}_VIOLATION]: ${check.reason}`;
      throw new Error(`COGNITIVE_SAFEGUARD: Activity suspended. Category: ${category}. Reason: ${check.reason}`);
    }

    task.status = "in-progress";

    console.log(`[${task.persona} Luca] Starting: ${task.description}`);

    if (this.trace) {
      this.trace.log("task_started", {
        taskId: task.id,
        persona: task.persona,
        description: task.description,
      });
    }

    try {
      // Acquire resource lock (prevent conflicts)
      const lockKey = `task_${task.id}`;
      const release = await resourceLockManager.acquireLock(
        lockKey,
        `${task.persona}-luca`,
        task.description,
      );

      try {
        // PHASE 8B: Real tool execution!
        await this.executePersonaWork(task);

        task.status = "complete";

        const duration = Date.now() - startTime;
        console.log(
          `[${task.persona} Luca] ✅ Completed: ${task.description} (${duration}ms)`,
        );

        if (this.trace) {
          this.trace.log(
            "task_completed",
            {
              taskId: task.id,
              persona: task.persona,
            },
            duration,
          );
        }
      } finally {
        release(); // Always release lock
      }
    } catch (error) {
      task.status = "failed";
      task.error = error instanceof Error ? error.message : "Unknown error";

      console.error(
        `[${task.persona} Luca] ❌ Failed: ${task.description}`,
        error,
      );

      if (this.trace) {
        this.trace.error("task_failed", error as Error);
      }

      throw error;
    }
  }

  /**
   * Execute task with real tools (PHASE 8B)
   */
  private async executePersonaWork(task: WorkflowTask): Promise<void> {
    // Phase 2: Specialized Security Handling
    if (task.persona === "HACKER") {
      await this.handleSpecializedSecurityTask(task);
    }

    // Phase 4: Security Context Injection for Engineer
    if (task.persona === "ENGINEER" && this.isSecurityFixTask(task)) {
      await this.injectSecurityContext(task);
    }

    console.log(`[${task.persona} Luca] Selecting tool for task...`);

    // Create tool bridge with trace ID
    const toolBridge = new AgentToolBridge(this.trace?.getTraceId());

    // Get available tools for this persona
    const availableTools = toolBridge.getToolsForPersona(task.persona);

    console.log(
      `[${task.persona} Luca] ${availableTools.length} tools available`,
    );

    if (this.trace) {
      this.trace.log("tools_available", {
        persona: task.persona,
        toolCount: availableTools.length,
      });
    }

    // Use LLM to select best tool
    const selection = await llmToolSelector.selectTool(task, availableTools);

    if (!selection) {
      // PHASE 8C: Self-Replication (ORIGIN ONLY)
      if (IS_ORIGIN) {
        console.log(
          `[${task.persona} Luca] 🔧 No suitable tool found, attempting to create one...`,
        );

        if (this.trace) {
          this.trace.log("attempting_tool_creation", {
            task: task.description,
            persona: task.persona,
            availableToolCount: availableTools.length,
          });
        }

        const createdTool = await this.createMissingTool(task, toolBridge);

        if (createdTool) {
          console.log(
            `[${task.persona} Luca] ✨ Created new tool: ${createdTool.name}`,
          );

          // Retry tool selection with newly created tool
          const retrySelection = await llmToolSelector.selectTool(task, [
            ...availableTools,
            createdTool.name,
          ]);

          if (retrySelection) {
            // Execute with newly created tool!
            const result = await toolBridge.executeTool(
              retrySelection.toolName,
              retrySelection.params,
              task.persona,
            );

            if (result.success) {
              task.result = result;
              console.log(
                `[${task.persona} Luca] ✅ Tool executed successfully (using new tool!)`,
              );
              return;
            }
          }
        }
      }

      // If not Origin or creation failed
      const errorMsg = `No suitable tool found for task: "${task.description}"`;
      console.error(`[${task.persona} Luca] ❌ ${errorMsg}`);

      if (this.trace) {
        this.trace.error("tool_selection_failed", new Error(errorMsg));
      }

      throw new Error(errorMsg);
    }

    console.log(
      `[${task.persona} Luca] ✨ Selected tool: ${selection.toolName} (confidence: ${selection.confidence})`,
    );

    if (selection.reasoning) {
      console.log(`  💡 Reasoning: ${selection.reasoning}`);
    }

    if (this.trace) {
      this.trace.log("tool_selected", {
        tool: selection.toolName,
        confidence: selection.confidence,
        reasoning: selection.reasoning,
      });
    }

    // Execute the tool!
    const result = await toolBridge.executeTool(
      selection.toolName,
      selection.params,
      task.persona,
    );

    if (result.success) {
      task.result = result;
      console.log(`[${task.persona} Luca] ✅ Tool executed successfully`);

      // Phase 2: Checkpoint progress for security tasks
      if (task.persona === "HACKER") {
        await this.checkpointSecurityProgress(task, result);
      }

      if (this.trace) {
        this.trace.log("tool_executed", {
          tool: selection.toolName,
          success: true,
        });
      }
    } else {
      throw new Error(result.error || "Tool execution failed");
    }
  }

  /**
   * Handle specialized security task logic (Phase 2)
   */
  private async handleSpecializedSecurityTask(
    task: WorkflowTask,
  ): Promise<void> {
    const desc = task.description.toLowerCase();

    // Determine specialty
    let subSpecialty = "General";
    if (desc.includes("sql") || desc.includes("database"))
      subSpecialty = "Injection";
    else if (desc.includes("xss") || desc.includes("script"))
      subSpecialty = "XSS";
    else if (desc.includes("auth") || desc.includes("login"))
      subSpecialty = "Auth";
    else if (desc.includes("ssrf") || desc.includes("request"))
      subSpecialty = "SSRF";

    console.log(
      `[Hacker Luca] 🕵️ Activating specialized capability: ${subSpecialty} Specialist`,
    );

    // Update session phase if relevant
    const workflowId = this.findWorkflowForTask(task.id);
    if (workflowId) {
      let phase: PentestPhase = "analysis";
      if (
        desc.includes("scan") ||
        desc.includes("find") ||
        desc.includes("recon")
      )
        phase = "recon";
      else if (
        desc.includes("verify") ||
        desc.includes("exploit") ||
        desc.includes("confirm")
      )
        phase = "verification";
      else if (desc.includes("report") || desc.includes("document"))
        phase = "reporting";

      pentestSessionStore.updateSession(workflowId, { currentPhase: phase });
    }
  }

  /**
   * Checkpoint security progress for HACKER tasks (Phase 2)
   */
  private async checkpointSecurityProgress(
    task: WorkflowTask,
    result: any,
  ): Promise<void> {
    const workflowId = this.findWorkflowForTask(task.id);
    if (!workflowId) return;

    const session = pentestSessionStore.getSession(workflowId);
    if (!session) return;

    // If result contains verified findings, save them
    if (result.output && result.output.findings) {
      for (const f of result.output.findings) {
        pentestSessionStore.saveFinding({
          id:
            f.id ||
            `f_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          sessionId: workflowId,
          vulnerabilityType: f.type || "Unknown",
          severity: f.severity || "high",
          confidence: f.confidence || 0.5,
          sinkPath: f.path || "Unknown",
          proofOfConcept: f.poc,
          evidence: f.evidence,
          status: f.verified ? "verified" : "potential",
          createdAt: Date.now(),
        });
      }
      console.log(
        `[Hacker Luca] 💾 Checkpointed ${result.output.findings.length} findings to session store.`,
      );
    }
  }

  /**
   * Helper to find workflow ID for a given task ID
   */
  private findWorkflowForTask(taskId: string): string | null {
    for (const [workflowId, plan] of this.activeWorkflows.entries()) {
      if (plan.tasks.some((t) => t.id === taskId)) return workflowId;
    }
    return null;
  }

  /**
   * Check if a task is a security fix task (Phase 4)
   */
  private isSecurityFixTask(task: WorkflowTask): boolean {
    const desc = task.description.toLowerCase();
    return (
      desc.includes("security") ||
      desc.includes("vulnerability") ||
      desc.includes("fix")
    );
  }

  /**
   * Inject security findings into task description for context (Phase 4)
   */
  private async injectSecurityContext(task: WorkflowTask): Promise<void> {
    const workflowId = this.findWorkflowForTask(task.id);
    if (!workflowId) return;

    const findings = await pentestSessionStore.getFindings(workflowId);
    const verifiedFindings = findings.filter((f) => f.status === "verified");

    if (verifiedFindings.length > 0) {
      const evidenceStr = verifiedFindings
        .map(
          (f) =>
            `- ${f.vulnerabilityType} at ${f.sinkPath}\n  PoC: ${f.proofOfConcept}\n  Severity: ${f.severity}`,
        )
        .join("\n");

      task.description = `${task.description}\n\n[SECURITY CONTEXT]\nLuca has verified the following vulnerabilities that need fixing:\n${evidenceStr}`;
      console.log(
        `[Engineer Luca] 🛠️ Injected ${verifiedFindings.length} verified findings into engineering context.`,
      );
    }
  }

  /**
   * Create a missing tool dynamically (PHASE 8C: Self-Replication)
   * UPGRADED: Parallel Discovery & Verified Implementation
   */
  private async createMissingTool(
    task: WorkflowTask,
    toolBridge: AgentToolBridge,
  ): Promise<{ name: string; description: string } | null> {
    console.log(
      `[${task.persona} Luca] 🧬 Self-replication: Creating tool for "${task.description}"`,
    );

    try {
      // 1. Parallel Search Strategy (Unified discovery)
      const strategies = [
        this.shouldTryMCPIngestion(task)
          ? this.tryIngestMCPTool(task, toolBridge)
          : Promise.resolve(null),
        this.tryCreateCustomSkill(task, toolBridge),
      ];

      // Win with whichever is ready first and successful
      const results = await Promise.all(strategies);
      const successfulCandidate = results.find((r) => r !== null);

      if (successfulCandidate) {
        if (this.trace) {
          this.trace.log("tool_replication_success", {
            tool: successfulCandidate.name,
            method: successfulCandidate.description.includes("MCP")
              ? "MCP"
              : "CustomScript",
          });
        }
        return successfulCandidate;
      }

      return null;
    } catch (error) {
      console.error(`[${task.persona} Luca] ❌ Tool creation failed:`, error);
      return null;
    }
  }

  /**
   * Check if task is suitable for MCP ingestion
   */
  private shouldTryMCPIngestion(task: WorkflowTask): boolean {
    const desc = task.description.toLowerCase();

    // Tasks that might have existing MCP servers
    return (
      desc.includes("api") ||
      desc.includes("database") ||
      desc.includes("cloud") ||
      desc.includes("aws") ||
      desc.includes("github") ||
      desc.includes("slack") ||
      desc.includes("notion")
    );
  }

  /**
   * Try to ingest an MCP server for the task
   */
  private async tryIngestMCPTool(
    task: WorkflowTask,
    toolBridge: AgentToolBridge,
  ): Promise<{ name: string; description: string } | null> {
    console.log(`[${task.persona} Luca] 🔍 Searching for MCP server...`);

    try {
      // Use searchAndInstallTools to find relevant MCP server
      const searchResult = await toolBridge.executeTool(
        "searchAndInstallTools",
        { query: task.description },
        task.persona,
      );

      if (searchResult.success && searchResult.output) {
        // Found potential MCP server - try to ingest it
        console.log(`[${task.persona} Luca] 📥 Ingesting MCP server...`);

        const ingestResult = await toolBridge.executeTool(
          "ingestMCPServer",
          { repoUrl: searchResult.output.repoUrl },
          task.persona,
        );

        if (ingestResult.success) {
          console.log(
            `[${task.persona} Luca] ✅ MCP server ingested successfully!`,
          );
          return {
            name: ingestResult.output.toolName || "newTool",
            description: ingestResult.output.description || "Ingested tool",
          };
        }
      }

      return null;
    } catch {
      console.log(
        `[${task.persona} Luca] MCP ingestion failed, trying custom skill...`,
      );
      return null;
    }
  }

  /**
   * Create a custom skill for the task
   * UPGRADED: Verified Loop
   */
  private async tryCreateCustomSkill(
    task: WorkflowTask,
    toolBridge: AgentToolBridge,
  ): Promise<{ name: string; description: string } | null> {
    console.log(`[${task.persona} Luca] 🛠️  Generating custom skill...`);

    try {
      const skillName = this.generateSkillName(task.description);

      // Phase 1: Generate & Iteratively Debug
      const finalScript = await this.generateAndVerifySkill(
        task,
        toolBridge,
        skillName,
      );
      if (!finalScript) return null;

      // Phase 2: Final Registration
      const createResult = await toolBridge.executeTool(
        "createCustomSkill",
        {
          name: skillName,
          description: `Verified auto-generated skill for: ${task.description}`,
          script: finalScript,
          language: "python",
        },
        task.persona,
      );

      if (createResult.success) {
        console.log(
          `[${task.persona} Luca] ✨ Verified custom skill registered: ${skillName}`,
        );
        return {
          name: skillName,
          description: `Custom verified skill for ${task.description}`,
        };
      }

      return null;
    } catch (error) {
      console.error(
        `[${task.persona} Luca] Custom skill creation failed:`,
        error,
      );
      return null;
    }
  }

  /**
   * Iterative "Simulate-Debug-Verify" Loop
   */
  private async generateAndVerifySkill(
    task: WorkflowTask,
    toolBridge: AgentToolBridge,
    skillName: string,
  ): Promise<string | null> {
    let currentScript = await this.generateSkillScript(task);
    if (!currentScript) return null;

    const MAX_DEBUG_ITERATIONS = 3;
    let iteration = 1;

    console.log(
      `[${task.persona} Luca] 🧪 Starting verification loop for ${skillName}...`,
    );

    while (iteration <= MAX_DEBUG_ITERATIONS) {
      console.log(
        `  Iter ${iteration}/${MAX_DEBUG_ITERATIONS}: Testing in sandbox...`,
      );

      // 1. Dry run in sandbox (temporary skill registration)
      // Note: In a real impl, we'd use a dedicated /test endpoint
      const testResult = await toolBridge.executeTool(
        "runPythonScript",
        {
          script: currentScript,
          params: {}, // Empty test params
        },
        task.persona,
      );

      if (testResult.success) {
        console.log(`  ✅ Verification successful on iteration ${iteration}!`);
        return currentScript;
      }

      // 2. Self-Debug: Feed error back to LLM
      console.log(
        `  ❌ Verification failed: ${testResult.error || "Execution error"}`,
      );

      if (iteration < MAX_DEBUG_ITERATIONS) {
        console.log(`  🧬 Attempting self-repair (debug loop)...`);
        currentScript = await this.generateSkillScript(
          task,
          currentScript,
          testResult.error,
        );
        if (!currentScript) return null;
      }

      iteration++;
    }

    console.error(
      `[${task.persona} Luca] 🏁 Max debugging iterations reached for ${skillName}. Aborting.`,
    );
    return null;
  }

  /**
   * Generate skill name from task description
   */
  private generateSkillName(description: string): string {
    // Convert "Read configuration file" → "readConfigurationFile"
    return description
      .split(" ")
      .map((word, i) =>
        i === 0
          ? word.toLowerCase()
          : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
      )
      .join("")
      .replace(/[^a-zA-Z0-9]/g, "");
  }

  /**
   * Generate script for custom skill using LLM
   * UPGRADED: Environment Aware & Error Feedback
   */
  private async generateSkillScript(
    task: WorkflowTask,
    previousAttempt?: string,
    errorLog?: string,
  ): Promise<string | null> {
    try {
      // 1. Inject Environment Context
      const envContext = `The environment has the following pre-installed libraries: [requests, beautifulsoup4, numpy, pandas, ethers, playwright, yfinance, pillow].
Avoid installing new dependencies. Use native Python where possible.`;

      // 2. Construct Debugging Prompt if needed
      let prompt = `Generate a Python script to accomplish this task:
"${task.description}"

${envContext}

The script should:
- Be a single function
- Print output to stdout
- Handle errors gracefully

Return only the Python code, no explanations.`;

      if (previousAttempt && errorLog) {
        prompt = `The previous Python script draft failed with the following error:
---
${errorLog}
---
SCRIPT DRAFT:
\`\`\`python
${previousAttempt}
\`\`\`

Analyze the error and provide a FIXED version of the script. 
Return only the Python code, no explanations.`;
      }

      const response = await fetch(`${CORTEX_URL}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", parts: [{ text: prompt }] }],
          streamResponse: false,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const script = data.response || data.text || "";

        const codeMatch = script.match(/```python\n([\s\S]*?)\n```/);
        return codeMatch ? codeMatch[1] : script;
      }

      return null;
    } catch (error) {
      console.error("Script generation failed:", error);
      return null;
    }
  }

  /**
   * Get workflow status
   */
  getWorkflowStatus(workflowId: string): WorkflowPlan | null {
    return this.activeWorkflows.get(workflowId) || null;
  }

  /**
   * Clear all active workflows
   */
  clearAllWorkflows(): void {
    console.log("[LucaWorkforce] 🧹 Clearing all workflow data...");
    this.activeWorkflows.clear();
  }

  /**
   * Get all active workflows
   */
  getActiveWorkflows(): WorkflowPlan[] {
    return Array.from(this.activeWorkflows.values());
  }

  /**
   * Get React Flow compatible data for a workflow
   */
  getGraphData(workflowId: string) {
    const plan = this.activeWorkflows.get(workflowId);
    if (!plan) return { nodes: [], edges: [] };

    const nodes: any[] = [];
    const edges: any[] = [];

    // 1. Goal Node
    nodes.push({
      id: "goal",
      type: "goalNode", // Using custom node type
      position: { x: 0, y: 0 },
      data: {
        label: plan.goal,
        status: plan.tasks.every((t) => t.status === "complete")
          ? "complete"
          : "in-progress",
      },
    });

    // 2. Persona/Agent Nodes
    const personas = Array.from(new Set(plan.tasks.map((t) => t.persona)));
    personas.forEach((persona, index) => {
      const personaNodeId = `agent_${persona}`;

      // Layout personas in a semi-circle or grid
      const angle = (index / personas.length) * Math.PI * 2;
      const radius = 250;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      const personaTasks = plan.tasks.filter((t) => t.persona === persona);
      const isAnyActive = personaTasks.some((t) => t.status === "in-progress");
      const isAllDone = personaTasks.every((t) => t.status === "complete");

      nodes.push({
        id: personaNodeId,
        type: "agentNode",
        position: { x, y },
        data: {
          persona,
          status: isAllDone
            ? "complete"
            : isAnyActive
              ? "in-progress"
              : "pending",
        },
      });

      edges.push({
        id: `goal-${personaNodeId}`,
        source: "goal",
        target: personaNodeId,
        animated: isAnyActive,
        style: { stroke: isAllDone ? "#22c55e" : "#3b82f6" },
      });

      // 3. Task Nodes
      personaTasks.forEach((task, tIndex) => {
        const tAngle = angle + (tIndex - (personaTasks.length - 1) / 2) * 0.4;
        const tDist = radius + 200;
        const tx = Math.cos(tAngle) * tDist;
        const ty = Math.sin(tAngle) * tDist;

        nodes.push({
          id: task.id,
          type: "taskNode",
          position: { x: tx, y: ty },
          data: {
            task,
            status: task.status,
            persona: task.persona,
          },
        });

        edges.push({
          id: `${personaNodeId}-${task.id}`,
          source: personaNodeId,
          target: task.id,
          animated: task.status === "in-progress",
          style: { stroke: task.status === "complete" ? "#22c55e" : "#3b82f6" },
        });

        // Dependencies
        task.dependencies.forEach((depId) => {
          edges.push({
            id: `dep-${depId}-${task.id}`,
            source: depId,
            target: task.id,
            style: { strokeDasharray: "5,5", opacity: 0.5 },
          });
        });
      });
    });

    return { nodes, edges };
  }

  /**
   * Execute workflow as a Sequential Pipeline (PHASE 2 - Sovereign High Fidelity)
   * This mode ensures each task inherits synthesized context from the previous step.
   */
  private async executeSequentialPipeline(workflowId: string): Promise<void> {
    const plan = this.activeWorkflows.get(workflowId);
    if (!plan) return;

    console.log(
      "[LucaWorkforce] ⛓️  Starting High-Fidelity Sequential Pipeline...",
    );
    let accumulatedContext = "";

    try {
      for (let i = 0; i < plan.tasks.length; i++) {
        const task = plan.tasks[i];

        // 0. COGNITIVE SAFEGUARD: Check for belief violations before proceeding to next tactical stage
        const check = await cognitiveDeliberator.checkBeliefViolations();
        if (check.violated) {
          const category = check.category || "CORE_BELIEF";
          throw new Error(`PIPELINE_SUSPENDED [${category}]: ${check.reason}`);
        }

        // 1. Synthesize Hand-over Report (if not the first task)
        if (i > 0) {
          const previousTask = plan.tasks[i - 1];
          const handover = await this.synthesizeHandoverReport(
            previousTask,
            task,
          );
          accumulatedContext += `\n--- HANDOVER [${previousTask.persona} -> ${task.persona}] ---\n${handover}\n`;

          // Log visible report to student/terminal
          this.logStrategicReport(previousTask.persona, task.persona, handover);
        }

        // 2. Inject accumulated context into task description
        if (accumulatedContext) {
          task.description = `${task.description}\n\n[PIPELINE_CONTEXT]\n${accumulatedContext}`;
        }

        // 3. Execute Task
        await this.executeTask(task);

        // 4. Mission Sync
        await missionControlService.updateGoalStatus(
          i + 1,
          task.status === "complete" ? "COMPLETED" : "FAILED",
        );
      }

      console.log("[LucaWorkforce] 🏁 Sequential Pipeline Complete.");
    } catch (error) {
      console.error("[LucaWorkforce] Pipeline failed:", error);
      throw error;
    }
  }

  /**
   * Synthesize a Strategic Hand-over Report using an LLM.
   */
  private async synthesizeHandoverReport(
    previous: WorkflowTask,
    next: WorkflowTask,
  ): Promise<string> {
    const prompt = `
### PREVIOUS_TASK: ${previous.persona} Luca executed: "${previous.description}"
### OUTCOME: ${JSON.stringify(previous.result || "Action Complete")}

### NEXT_TASK: ${next.persona} Luca will execute: "${next.description}"

---
TASK: Synthesize a "Strategic Hand-over Report". 
1. Summarize key findings or artifacts created in the previous step.
2. Identify dependencies or specific data points the next agent needs.
3. Call out any mission-critical risks discovered.
Keep it concise but highly tactical.
`;

    try {
      const provider = ProviderFactory.createProvider(
        settingsService.get("brain"),
        "LUCAGENT",
      );
      const response = await provider.chat(
        [{ role: "user", content: prompt }],
        undefined,
        "You are a Strategic Architect summarizing agentic progress.",
      );
      return (
        response.text ||
        "Previous stage complete. Proceeding to next objective."
      );
    } catch {
      return `Hand-over synthesized: Previous action by ${previous.persona} complete. Next up: ${next.persona}.`;
    }
  }

  /**
   * Log the Strategic Hand-over Report to the terminal context.
   */
  private logStrategicReport(from: string, to: string, report: string): void {
    const formattedReport = `
╔══════════════════════════════════════════════════════════════════════════════
║ 🛡️  STRATEGIC HAND-OVER REPORT [${from} ➜ ${to}]
╟──────────────────────────────────────────────────────────────────────────────
${report
  .split("\n")
  .map((line) => `║ ${line}`)
  .join("\n")}
╚══════════════════════════════════════════════════════════════════════════════
`;
    console.log(formattedReport);
    thoughtStreamService.pushThought("AGI_SYNTHESIS", formattedReport);
  }
}

// Singleton instance
export const lucaWorkforce = new LucaWorkforce();

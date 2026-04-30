/**
 * Agent Service - Core Autonomous Loop (Phase 5 + PHASE 7B WORKFORCE)
 *
 * The brain of the autonomous agent system
 * Implements: Planning → Execution → Verification → Learning loop
 *
 * PHASE 7 ENHANCEMENTS:
 * - Resource locking for parallel agent safety (Eigent)
 * - Graceful shutdown with state preservation (Eigent)
 * - Distributed tracing for debugging (Eigent)
 * - Multi-persona workforce for parallel execution (NEW!)
 */

import type {
  AgentTask,
  AgentStatus,
  AgentLimits,
  AgentStep,
  AgentEvent,
} from "./types";
import { agentMemory } from "./AgentMemory";
import { agentPlanner } from "./AgentPlanner";
import { agentQuality } from "./AgentQuality";
import { lucaWorkforce } from "./LucaWorkforce";

// PHASE 7: Stolen patterns from Eigent
import { resourceLockManager } from "./LucaResourceLock";
import { shutdownManager, AgentServiceShutdownHandler } from "./LucaShutdown";
import { AgentTrace } from "./LucaTracing";

// PHASE 10: Cognitive Services (ALL ACTIVE)
import { CheckpointManager } from "./cognitive/CheckpointManager";
import { WorkflowMemory } from "./cognitive/WorkflowMemory";
import { LearningEngine } from "./cognitive/LearningEngine";
import { HumanInputOrchestrator } from "./cognitive/HumanInputOrchestrator";

const DEFAULT_LIMITS: AgentLimits = {
  maxIterations: 50,
  maxDuration: 30 * 60 * 1000, // 30 minutes
  maxTokens: 500000,
  maxCost: 5, // $5 USD
};

const CHECKPOINT_INTERVAL = 10;
const MAX_RETRIES = 3;

export class AgentService {
  private currentTask: AgentTask | null = null;
  private stopRequested: boolean = false;
  private isPaused: boolean = false;
  private listeners: Set<(event: AgentEvent) => void> = new Set();
  private iterationCount: number = 0;
  private startTime: number = 0;
  private tokenCount: number = 0;
  private estimatedCost: number = 0;
  private steps: AgentStep[] = [];

  // PHASE 7: Enhancement fields
  private activeTasks: Map<string, AgentTask> = new Map();
  private trace?: AgentTrace;
  private isShuttingDown: boolean = false;

  // PHASE 10: Cognitive Services (ACTIVE)
  private checkpointManager: CheckpointManager;
  private workflowMemory: WorkflowMemory;
  private learningEngine: LearningEngine;
  private humanInput: HumanInputOrchestrator;

  constructor() {
    // Register shutdown handler
    const shutdownHandler = new AgentServiceShutdownHandler(
      () => this.activeTasks,
      (taskId) => this.saveTaskCheckpoint(taskId)
    );
    shutdownManager.registerHandler(shutdownHandler);

    // PHASE 10: Initialize cognitive services
    this.checkpointManager = new CheckpointManager();
    this.workflowMemory = new WorkflowMemory();
    this.learningEngine = new LearningEngine();
    this.humanInput = new HumanInputOrchestrator();

    console.log("[AgentService] Initialized with Phase 10 cognitive services");
  }

  /**
   * Start a new autonomous agent task
   * PHASE 5: Full implementation with autonomous loop
   */
  async startTask(
    goal: string,
    workspace: string,
    limits?: Partial<AgentLimits>,
    useWorkforce: boolean = false // PHASE 7B: Enable multi-persona mode
  ): Promise<string> {
    // Check if shutting down
    if (this.isShuttingDown || shutdownManager.isShutdownInProgress()) {
      throw new Error("[AgentService] Cannot start task: shutdown in progress");
    }

    console.log("[AgentService] Starting autonomous task");
    console.log(`Goal: ${goal}`);
    console.log(`Workspace: ${workspace}`);
    console.log(
      `Mode: ${useWorkforce ? "WORKFORCE (multi-persona)" : "SINGLE-AGENT"}`
    );

    // PHASE 7B: If workforce mode, delegate to LucaWorkforce
    if (useWorkforce) {
      console.log("[AgentService] Delegating to Luca Workforce...");
      return await lucaWorkforce.startWorkflow(goal, workspace);
    }

    // Otherwise, continue with single-agent execution
    const taskId = `agent_${Date.now()}`;

    // PHASE 7: Start distributed trace
    this.trace = new AgentTrace(taskId, "agent-service");
    this.trace.log("task_started", { goal, workspace });
    const fullLimits = { ...DEFAULT_LIMITS, ...limits };

    // Load memory
    const memory = await agentMemory.loadMemory(taskId);

    this.currentTask = {
      id: taskId,
      goal,
      workspace,
      status: "planning",
      currentStep: 0,
      totalSteps: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      memory,
      limits: fullLimits,
    };

    // Reset counters
    this.stopRequested = false;
    this.isPaused = false;
    this.iterationCount = 0;
    this.startTime = Date.now();
    this.tokenCount = 0;
    this.estimatedCost = 0;

    // Save to active tasks map
    this.activeTasks.set(taskId, this.currentTask);

    // Emit started event
    this.emit({ type: "started", taskId });

    // Start autonomous loop (non-blocking)
    this.executeLoop().catch((error) => {
      console.error("[AgentService] Loop error:", error);
      if (this.trace) this.trace.error("loop_error", error);
      this.handleError(error);
    });

    return taskId;
  }

  /**
   * CORE AUTONOMOUS LOOP
   * The heart of the agent system
   */
  private async executeLoop(): Promise<void> {
    if (!this.currentTask) return;

    try {
      console.log("[AgentService] === AUTONOMOUS LOOP STARTED ===");

      // PHASE 1: PLANNING
      await this.updateStatus("planning");
      this.steps = await agentPlanner.createPlan(this.currentTask.goal);
      this.currentTask.totalSteps = this.steps.length;

      console.log(
        `[AgentService] Created plan with ${this.steps.length} steps`
      );

      // PHASE 2: EXECUTION LOOP
      await this.updateStatus("executing");

      while (!this.stopRequested && !agentPlanner.isGoalComplete(this.steps)) {
        // Check if paused
        if (this.isPaused) {
          await this.waitForResume();
          continue;
        }

        // Check limits
        this.checkLimits();

        // Create checkpoint periodically
        if (this.iterationCount % CHECKPOINT_INTERVAL === 0) {
          await this.createCheckpoint();
        }

        // Select next step
        const nextStep = agentPlanner.selectNextStep(this.steps);

        if (!nextStep) {
          console.warn("[AgentService] No executable step found");
          break;
        }

        console.log(
          `[AgentService] Executing step ${nextStep.id}: ${nextStep.description}`
        );

        // Execute step with retry
        await this.executeStepWithRetry(nextStep);

        // Update progress
        this.currentTask.currentStep = this.steps.filter(
          (s) => s.status === "complete"
        ).length;
        this.currentTask.updatedAt = Date.now();

        this.iterationCount++;
      }

      // PHASE 3: COMPLETION
      if (agentPlanner.isGoalComplete(this.steps)) {
        await this.updateStatus("complete");
        this.emit({ type: "completed", taskId: this.currentTask.id });
        console.log("[AgentService] === TASK COMPLETED ===");
      } else if (this.stopRequested) {
        await this.updateStatus("failed");
        this.emit({ type: "stopped", taskId: this.currentTask.id });
        console.log("[AgentService] === TASK STOPPED ===");
      }
    } catch (error) {
      console.error("[AgentService] Loop error:", error);
      await this.updateStatus("failed");
      this.emit({
        type: "failed",
        taskId: this.currentTask.id,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      // Save memory
      if (this.currentTask) {
        await agentMemory.saveMemory(
          this.currentTask.id,
          this.currentTask.memory
        );
      }
    }
  }

  /**
   * Execute a step with automatic retry on failure
   */
  private async executeStepWithRetry(step: AgentStep): Promise<void> {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        // Mark as in progress
        step.status = "in-progress";
        step.startedAt = Date.now();

        if (this.currentTask) {
          this.emit({
            type: "step-started",
            taskId: this.currentTask.id,
            stepId: step.id,
          });
        }

        // Execute the step
        await this.executeStep(step);

        // Verify quality
        const modifiedFiles = await this.getModifiedFiles(step);
        const qualityPassed = await agentQuality.validateStep(
          step,
          modifiedFiles
        );

        if (!qualityPassed) {
          throw new Error("Quality gates failed");
        }

        // Success!
        step.status = "complete";
        step.completedAt = Date.now();

        // Record in memory
        if (this.currentTask) {
          agentMemory.recordCompletedStep(this.currentTask.memory, step);

          this.emit({
            type: "step-completed",
            taskId: this.currentTask.id,
            stepId: step.id,
          });
        }

        console.log(`[AgentService] ✅ Step ${step.id} completed`);
        return; // Success - exit retry loop
      } catch (error) {
        console.warn(
          `[AgentService] Step ${step.id} failed (attempt ${attempt}/${MAX_RETRIES}):`,
          error
        );

        // Record failure
        if (this.currentTask) {
          const errorMsg =
            error instanceof Error ? error.message : "Unknown error";
          const learning = await this.analyzeFailure(step, errorMsg);

          agentMemory.recordFailedAttempt(this.currentTask.memory, {
            stepId: step.id,
            attemptNumber: attempt,
            error: errorMsg,
            timestamp: Date.now(),
            learning,
          });

          this.emit({
            type: "step-failed",
            taskId: this.currentTask.id,
            stepId: step.id,
            error: errorMsg,
          });
        }

        // If last attempt, mark as failed
        if (attempt === MAX_RETRIES) {
          step.status = "failed";
          step.error = error instanceof Error ? error.message : "Unknown error";
          throw error;
        }

        // Wait before retry (exponential backoff)
        await this.sleep(1000 * attempt);
      }
    }
  }

  /**
   * Execute a single step
   * PHASE 7: With resource locking for safety
   */
  private async executeStep(step: AgentStep): Promise<void> {
    console.log(`[AgentService] Executing: ${step.description}`);

    // PHASE 7: Acquire resource locks for files this step will modify
    const resourceReleases: Array<() => void> = [];

    try {
      // Lock workspace directory
      if (this.currentTask) {
        const lockKey = `workspace:${this.currentTask.workspace}`;
        const release = await resourceLockManager.acquireLock(
          lockKey,
          "agent-service",
          `Executing step: ${step.description}`
        );
        resourceReleases.push(release);

        if (this.trace) {
          this.trace.log("resource_locked", { resource: lockKey });
        }
      }

      // Phase 5: Simulate execution
      await this.sleep(1000); // Simulate work

      // Phase 6: Will call actual tools
      // e.g., await toolRegistry.execute(step.requiredTools[0], args);

      console.log(`[AgentService] Step execution complete`);

      if (this.trace) {
        this.trace.log("step_executed", { stepId: step.id });
      }
    } finally {
      // PHASE 7: Always release locks
      resourceReleases.forEach((release) => release());

      if (this.trace && resourceReleases.length > 0) {
        this.trace.log("resources_released", {
          count: resourceReleases.length,
        });
      }
    }
  }

  /**
   * Analyze failure and generate learning
   */
  private async analyzeFailure(
    step: AgentStep,
    error: string
  ): Promise<string> {
    // Phase 5: Simple analysis
    if (error.includes("Quality gates failed")) {
      return "Need to improve code quality before proceeding";
    }
    if (error.includes("not found")) {
      return "File or dependency missing, need to check requirements";
    }
    return `Step failed: ${error.substring(0, 100)}`;
  }

  /**
   * Get modified files for a step
   */
  private async getModifiedFiles(_step: AgentStep): Promise<string[]> {
    // Phase 5: Stub
    // Phase 6: Will track actual file modifications
    return [];
  }

  /**
   * Check if any limits have been exceeded
   */
  private checkLimits(): void {
    if (!this.currentTask) return;

    const limits = this.currentTask.limits;

    // Iterations
    if (this.iterationCount >= limits.maxIterations) {
      throw new Error(`Max iterations reached: ${limits.maxIterations}`);
    }

    // Duration
    const elapsed = Date.now() - this.startTime;
    if (elapsed >= limits.maxDuration) {
      throw new Error(`Max duration exceeded: ${Math.round(elapsed / 1000)}s`);
    }

    // Tokens
    if (this.tokenCount >= limits.maxTokens) {
      throw new Error(`Token limit reached: ${this.tokenCount}`);
    }

    // Cost
    if (this.estimatedCost >= limits.maxCost) {
      throw new Error(`Cost limit reached: $${this.estimatedCost}`);
    }
  }

  /**
   * Create a checkpoint for rollback
   */
  private async createCheckpoint(): Promise<void> {
    console.log(
      `[AgentService] Creating checkpoint at iteration ${this.iterationCount}`
    );

    if (this.currentTask) {
      await this.saveTaskCheckpoint(this.currentTask.id);
    }

    // Phase 6: Will create git commit
  }

  /**
   * Save checkpoint for a task (PHASE 7)
   */
  private async saveTaskCheckpoint(taskId: string): Promise<void> {
    const task = this.activeTasks.get(taskId);
    if (!task) return;

    try {
      console.log(`[AgentService] Saving checkpoint for task: ${taskId}`);

      // Save memory
      await agentMemory.saveMemory(taskId, task.memory);

      // Save task state to localStorage
      const checkpointKey = `agent_checkpoint_${taskId}`;
      localStorage.setItem(
        checkpointKey,
        JSON.stringify({
          taskId: task.id,
          goal: task.goal,
          status: task.status,
          currentStep: task.currentStep,
          totalSteps: task.totalSteps,
          timestamp: Date.now(),
        })
      );

      if (this.trace) {
        this.trace.log("checkpoint_saved", { taskId });
      }
    } catch (error) {
      console.error(`[AgentService] Failed to save checkpoint:`, error);
      if (this.trace) {
        this.trace.error("checkpoint_save_failed", error as Error);
      }
    }
  }

  /**
   * Wait for resume signal
   */
  private async waitForResume(): Promise<void> {
    while (this.isPaused && !this.stopRequested) {
      await this.sleep(100);
    }
  }

  /**
   * Update task status
   */
  private async updateStatus(status: AgentStatus): Promise<void> {
    if (!this.currentTask) return;

    this.currentTask.status = status;
    this.currentTask.updatedAt = Date.now();

    console.log(`[AgentService] Status: ${status}`);
  }

  /**
   * Handle error
   */
  private handleError(error: Error): void {
    console.error("[AgentService] Error:", error);

    if (this.currentTask) {
      this.currentTask.status = "failed";
      this.emit({
        type: "failed",
        taskId: this.currentTask.id,
        error: error.message,
      });
    }
  }

  /**
   * Get task status (public API)
   */
  getTaskStatus(taskId: string): AgentTask | null {
    if (this.currentTask?.id === taskId) {
      return this.currentTask;
    }
    return null;
  }

  /**
   * Pause execution (public API)
   */
  pause(): void {
    console.log("[AgentService] Pausing execution");
    this.isPaused = true;

    if (this.currentTask) {
      this.emit({ type: "paused", taskId: this.currentTask.id });
    }
  }

  /**
   * Resume execution (public API)
   */
  resume(): void {
    console.log("[AgentService] Resuming execution");
    this.isPaused = false;

    if (this.currentTask) {
      this.emit({ type: "resumed", taskId: this.currentTask.id });
    }
  }

  /**
   * EMERGENCY STOP (public API - always works)
   */
  emergencyStop(): void {
    console.warn("[AgentService] 🚨 EMERGENCY STOP");
    this.stopRequested = true;
    this.isPaused = false;

    if (this.currentTask) {
      this.emit({ type: "stopped", taskId: this.currentTask.id });
    }
  }

  /**
   * Subscribe to agent events (public API)
   */
  on(callback: (event: AgentEvent) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Emit event to all listeners
   */
  private emit(event: AgentEvent): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error("[AgentService] Listener error:", error);
      }
    });
  }

  /**
   * Check if agent is currently running
   */
  get isRunning(): boolean {
    return (
      this.currentTask !== null &&
      this.currentTask.status === "executing" &&
      !this.isPaused &&
      !this.stopRequested
    );
  }

  /**
   * Get current task ID
   */
  get currentTaskId(): string | null {
    return this.currentTask?.id || null;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const agentService = new AgentService();

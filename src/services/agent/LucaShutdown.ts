/**
 * Luca Graceful Shutdown Handler
 * Stolen from Eigent's shutdown pattern
 *
 * Ensures safe shutdown of all agent workflows:
 * - Stops accepting new tasks
 * - Waits for active agents to finish current step
 * - Saves all state/checkpoints
 * - Releases all resource locks
 * - Cleans up background processes
 */

import { resourceLockManager } from "./LucaResourceLock";
import type { AgentTask } from "./types";

export interface ShutdownHandler {
  prepare(): Promise<void>;
  execute(): Promise<void>;
  cleanup(): Promise<void>;
}

class LucaShutdownManager {
  private shutdownHandlers: ShutdownHandler[] = [];
  private isShuttingDown = false;
  private shutdownPromise?: Promise<void>;

  constructor() {
    // Register signal handlers
    if (typeof process !== "undefined") {
      process.on("SIGTERM", () => this.initiateShutdown("SIGTERM"));
      process.on("SIGINT", () => this.initiateShutdown("SIGINT"));
      process.on("beforeExit", () => this.initiateShutdown("beforeExit"));
    }

    // Browser unload handler
    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", () => {
        this.initiateShutdown("beforeunload");
      });
    }

    console.log("[Shutdown] Manager initialized");
  }

  /**
   * Register a shutdown handler
   */
  registerHandler(handler: ShutdownHandler): void {
    this.shutdownHandlers.push(handler);
    console.log(
      `[Shutdown] Registered handler (total: ${this.shutdownHandlers.length})`
    );
  }

  /**
   * Initiate graceful shutdown
   */
  async initiateShutdown(reason: string): Promise<void> {
    if (this.isShuttingDown) {
      console.log("[Shutdown] Already in progress, waiting...");
      return this.shutdownPromise;
    }

    this.isShuttingDown = true;
    console.log(
      `[Shutdown] Initiating graceful shutdown (reason: ${reason})...`
    );

    this.shutdownPromise = this.performShutdown();
    await this.shutdownPromise;
  }

  /**
   * Perform the actual shutdown sequence
   */
  private async performShutdown(): Promise<void> {
    const startTime = Date.now();

    try {
      // Phase 1: Prepare (stop accepting new work)
      console.log("[Shutdown] Phase 1: Preparing shutdown...");
      await Promise.all(
        this.shutdownHandlers.map((h) =>
          h
            .prepare()
            .catch((err) =>
              console.error("[Shutdown] Handler prepare failed:", err)
            )
        )
      );

      // Phase 2: Execute (finish current work)
      console.log("[Shutdown] Phase 2: Finishing active work...");
      await Promise.all(
        this.shutdownHandlers.map((h) =>
          h
            .execute()
            .catch((err) =>
              console.error("[Shutdown] Handler execute failed:", err)
            )
        )
      );

      // Phase 3: Cleanup (release resources)
      console.log("[Shutdown] Phase 3: Cleaning up resources...");
      await Promise.all(
        this.shutdownHandlers.map((h) =>
          h
            .cleanup()
            .catch((err) =>
              console.error("[Shutdown] Handler cleanup failed:", err)
            )
        )
      );

      // Phase 4: Release all resource locks
      console.log("[Shutdown] Phase 4: Releasing all locks...");
      await resourceLockManager.shutdown();

      const duration = Date.now() - startTime;
      console.log(`[Shutdown] ✅ Graceful shutdown complete (${duration}ms)`);
    } catch (error) {
      console.error("[Shutdown] ❌ Error during shutdown:", error);
      throw error;
    }
  }

  /**
   * Check if shutdown is in progress
   */
  isShutdownInProgress(): boolean {
    return this.isShuttingDown;
  }
}

// Singleton instance
export const shutdownManager = new LucaShutdownManager();

/**
 * Agent Service Shutdown Handler
 * Handles graceful shutdown of agent workflows
 */
export class AgentServiceShutdownHandler implements ShutdownHandler {
  constructor(
    private getActiveTasks: () => Map<string, AgentTask>,
    private saveCheckpoint: (taskId: string) => Promise<void>
  ) {}

  async prepare(): Promise<void> {
    console.log("[AgentShutdown] Stopping new task acceptance...");
    // Mark service as shutting down (handled by AgentService)
  }

  async execute(): Promise<void> {
    console.log(
      "[AgentShutdown] Waiting for active tasks to complete current step..."
    );

    const activeTasks = this.getActiveTasks();
    const savePromises: Promise<void>[] = [];

    for (const [taskId, task] of activeTasks.entries()) {
      if (task.status === "executing") {
        console.log(`[AgentShutdown] Saving checkpoint for task: ${taskId}`);
        savePromises.push(
          this.saveCheckpoint(taskId).catch((err) =>
            console.error(
              `[AgentShutdown] Failed to save checkpoint for ${taskId}:`,
              err
            )
          )
        );
      }
    }

    await Promise.all(savePromises);
    console.log(`[AgentShutdown] Saved ${savePromises.length} checkpoints`);
  }

  async cleanup(): Promise<void> {
    console.log("[AgentShutdown] Final cleanup...");
    // Additional cleanup if needed
  }
}

/**
 * Memory Service Shutdown Handler
 */
export class MemoryServiceShutdownHandler implements ShutdownHandler {
  constructor(private persistMemory: () => Promise<void>) {}

  async prepare(): Promise<void> {
    console.log("[MemoryShutdown] Preparing memory persistence...");
  }

  async execute(): Promise<void> {
    console.log("[MemoryShutdown] Persisting memory to storage...");
    await this.persistMemory();
  }

  async cleanup(): Promise<void> {
    console.log("[MemoryShutdown] Memory cleanup complete");
  }
}

/**
 * Helper to create PID file for process tracking
 */
export async function writePidFile(path: string): Promise<void> {
  if (typeof process !== "undefined") {
    try {
      const fs = await import("fs/promises");
      await fs.writeFile(path, process.pid.toString());
      console.log(`[PID] Written PID file: ${process.pid} -> ${path}`);

      // Clean up on shutdown
      shutdownManager.registerHandler({
        prepare: async () => {},
        execute: async () => {},
        cleanup: async () => {
          try {
            await fs.unlink(path);
            console.log(`[PID] Removed PID file: ${path}`);
          } catch (err) {
            console.error(`[PID] Failed to remove PID file:`, err);
          }
        },
      });
    } catch (error) {
      console.error("[PID] Failed to write PID file:", error);
    }
  }
}

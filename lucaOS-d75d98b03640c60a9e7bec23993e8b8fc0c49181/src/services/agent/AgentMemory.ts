/**
 * Agent Memory Service - Phase 5
 *
 * Handles persistent memory across sessions
 * Triple-tier: Session → Task → Project
 */

import type { AgentTask, AgentMemory, AgentStep, AgentAttempt } from "./types";

export class AgentMemoryService {
  private sessionMemory: Map<string, any> = new Map();

  /**
   * Load memory for a task (from localStorage + .luca folder)
   */
  async loadMemory(taskId: string): Promise<AgentMemory> {
    // Try localStorage first
    const stored = localStorage.getItem(`agent_memory_${taskId}`);

    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (error) {
        console.error("[AgentMemory] Failed to parse stored memory:", error);
      }
    }

    // Return empty memory
    return {
      context: "",
      learnings: [],
      completedSteps: [],
      failedAttempts: [],
    };
  }

  /**
   * Save memory to localStorage
   */
  async saveMemory(taskId: string, memory: AgentMemory): Promise<void> {
    try {
      localStorage.setItem(`agent_memory_${taskId}`, JSON.stringify(memory));
      console.log(`[AgentMemory] Saved memory for task ${taskId}`);
    } catch (error) {
      console.error("[AgentMemory] Failed to save memory:", error);
    }
  }

  /**
   * Add a learning from failure
   */
  addLearning(memory: AgentMemory, learning: string): void {
    memory.learnings.push(learning);
    console.log(`[AgentMemory] New learning: ${learning}`);
  }

  /**
   * Record completed step
   */
  recordCompletedStep(memory: AgentMemory, step: AgentStep): void {
    memory.completedSteps.push(step);
  }

  /**
   * Record failed attempt
   */
  recordFailedAttempt(memory: AgentMemory, attempt: AgentAttempt): void {
    memory.failedAttempts.push(attempt);

    // Auto-generate learning from failure
    const learning = `Step ${attempt.stepId} failed (attempt ${attempt.attemptNumber}): ${attempt.error}. Learning: ${attempt.learning}`;
    this.addLearning(memory, learning);
  }

  /**
   * Get relevant context for planning next step
   */
  getRelevantContext(memory: AgentMemory, query: string): string[] {
    // Phase 5: Simple keyword matching
    // Phase 6+: Will upgrade to RAG semantic search

    const context: string[] = [];

    // Include recent learnings
    context.push(...memory.learnings.slice(-5));

    // Include recent completed steps
    const recentSteps = memory.completedSteps.slice(-3);
    context.push(...recentSteps.map((s) => `Completed: ${s.description}`));

    return context;
  }

  /**
   * Clear memory for a task
   */
  async clearMemory(taskId: string): Promise<void> {
    localStorage.removeItem(`agent_memory_${taskId}`);
    console.log(`[AgentMemory] Cleared memory for task ${taskId}`);
  }

  /**
   * Session memory (temporary, in RAM)
   */
  setSessionData(key: string, value: any): void {
    this.sessionMemory.set(key, value);
  }

  getSessionData(key: string): any {
    return this.sessionMemory.get(key);
  }
}

export const agentMemory = new AgentMemoryService();

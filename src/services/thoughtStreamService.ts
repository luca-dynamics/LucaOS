/**
 * ThoughtStream Service
 * Manages the real-time streaming of LUCA's internal reasoning process.
 * Inspired by Accomplish - transparency leads to trust.
 */

import { eventBus } from "./eventBus";

export type ThoughtType = "OBSERVATION" | "REASONING" | "ACTION" | "PLAN" | "WARNING" | "ERROR" | "SECURITY";

export interface ThoughtEntry {
  id: string;
  type: ThoughtType;
  content: string;
  timestamp: number;
}

class ThoughtStreamService {
  private history: ThoughtEntry[] = [];
  private maxHistory = 100;

  constructor() {
    console.log("[THOUGHT_STREAM] Initialized");
  }

  /**
   * Push a new thought into the stream
   */
  pushThought(type: ThoughtType, content: string): void {
    const entry: ThoughtEntry = {
      id: Math.random().toString(36).substring(2, 11),
      type,
      content,
      timestamp: Date.now()
    };

    this.history.push(entry);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    // Emit via global event bus for UI components
    eventBus.emit(`thought-stream`, entry);
    // Explicit emit for types
    eventBus.emit(`thought-stream:${type}`, entry);

    console.log(`[THOUGHT_STREAM] [${type}] ${content}`);
  }

  /**
   * Get the current thought history
   */
  getHistory(): ThoughtEntry[] {
    return [...this.history];
  }

  /**
   * Clear the current stream history
   */
  clear(): void {
    this.history = [];
    eventBus.emit('thought-stream:clear', {});
  }
}

export const thoughtStreamService = new ThoughtStreamService();
export default thoughtStreamService;

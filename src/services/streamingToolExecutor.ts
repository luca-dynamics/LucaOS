import { ToolRegistry } from "./toolRegistry";
import { eventBus } from "./eventBus";

export interface ToolCall {
  id: string;
  name: string;
  args: any;
}

export interface ToolResult {
  toolCallId: string;
  name: string;
  args: any;
  result: string;
  error?: string;
}

export type ProgressCallback = (toolCallId: string, message: string, progress?: number) => void;

/**
 * StreamingToolExecutor
 * Manages concurrent tool execution with safety constraints.
 * 🚀 Concurrent-safe tools run in parallel.
 * 🧱 Non-safe tools block and run sequentially.
 */
export class StreamingToolExecutor {
  private results: ToolResult[] = [];
  private activeCount = 0;

  constructor(
    private onToolCall: (name: string, args: any, context: any) => Promise<string>,
    private onProgress: ProgressCallback
  ) {}

  /**
   * Executes a batch of tool calls with optimal concurrency
   */
  async executeBatch(calls: ToolCall[]): Promise<ToolResult[]> {
    this.results = [];
    
    // Group calls into sequential "Waves"
    // Wave 1: All safe tools appearing before the first non-safe tool
    // Wave 2: The first non-safe tool (blocks until Wave 1 finishes)
    // Wave 3: Subsequent tools...
    
    let currentWave: ToolCall[] = [];
    
    for (const call of calls) {
      const isSafe = ToolRegistry.isConcurrencySafe(call.name);

      if (isSafe) {
        currentWave.push(call);
      } else {
        // If we have safe tools pending, execute them first as a batch
        if (currentWave.length > 0) {
          await this.runConcurrentWave(currentWave);
          currentWave = [];
        }
        // Execute the non-safe tool sequentially
        await this.runSequentialTool(call);
      }
    }

    // Run any remaining safe tools
    if (currentWave.length > 0) {
      await this.runConcurrentWave(currentWave);
    }

    return this.results;
  }

  private async runConcurrentWave(calls: ToolCall[]) {
    console.log(`[EXECUTOR] Running concurrent wave of ${calls.length} tools`);
    await Promise.all(calls.map(call => this.executeSingle(call)));
  }

  private async runSequentialTool(call: ToolCall) {
    console.log(`[EXECUTOR] Running sequential tool: ${call.name}`);
    await this.executeSingle(call);
  }

  private async executeSingle(call: ToolCall) {
    this.activeCount++;
    eventBus.emit("tool-started", {
      toolName: call.name,
      toolCallId: call.id,
      source: "chat",
      status: "started",
    });
    try {
      // Inject Progress Reporter into context
      const context = {
        toolCallId: call.id,
        reportProgress: (message: string, progress?: number) => {
          this.onProgress(call.id, message, progress);
        }
      };

      const result = await this.onToolCall(call.name, call.args, context);
      this.results.push({ 
        toolCallId: call.id, 
        name: call.name, 
        args: call.args, 
        result 
      });
      eventBus.emit("tool-finished", {
        toolName: call.name,
        toolCallId: call.id,
        source: "chat",
        status: "finished",
      });
    } catch (err: any) {
      console.error(`[EXECUTOR] Tool ${call.name} failed:`, err);
      this.results.push({ 
        toolCallId: call.id, 
        name: call.name, 
        args: call.args, 
        result: `Error: ${err.message || "Unknown tool error"}`,
        error: err.message 
      });
      eventBus.emit("tool-failed", {
        toolName: call.name,
        toolCallId: call.id,
        source: "chat",
        status: "failed",
        error: err.message || "Unknown tool error",
      });
    } finally {
      this.activeCount--;
    }
  }
}

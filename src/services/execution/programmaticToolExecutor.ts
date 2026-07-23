import { ToolRegistry } from "../toolRegistry";

export interface PTCExecutionOptions {
  timeoutMs?: number;
  maxToolCalls?: number;
  context?: any;
  customArgs?: Record<string, any>;
}

export interface PTCExecutionResult {
  success: boolean;
  output: string;
  toolCallsExecuted: number;
  executionTimeMs: number;
  error?: string;
}

export class ProgrammaticToolExecutor {
  private static DEFAULT_TIMEOUT_MS = 30000;
  private static DEFAULT_MAX_TOOL_CALLS = 50;

  /**
   * Executes a programmatic script with local tool RPC stubs.
   * Intermediate tool calls execute via local stubs without forcing
   * intermediate output payloads back into the LLM context.
   */
  public async executeScript(
    scriptBody: string,
    options: PTCExecutionOptions = {}
  ): Promise<PTCExecutionResult> {
    const startTime = Date.now();
    const timeoutMs = options.timeoutMs ?? ProgrammaticToolExecutor.DEFAULT_TIMEOUT_MS;
    const maxToolCalls = options.maxToolCalls ?? ProgrammaticToolExecutor.DEFAULT_MAX_TOOL_CALLS;
    
    let toolCallCount = 0;
    const logs: string[] = [];

    // Custom console logger interceptor
    const customConsole = {
      log: (...args: any[]) => logs.push(args.map(a => typeof a === "object" ? JSON.stringify(a) : String(a)).join(" ")),
      warn: (...args: any[]) => logs.push(`[WARN] ` + args.map(a => typeof a === "object" ? JSON.stringify(a) : String(a)).join(" ")),
      error: (...args: any[]) => logs.push(`[ERROR] ` + args.map(a => typeof a === "object" ? JSON.stringify(a) : String(a)).join(" ")),
      info: (...args: any[]) => logs.push(`[INFO] ` + args.map(a => typeof a === "object" ? JSON.stringify(a) : String(a)).join(" ")),
    };

    // RPC Proxy builder for luca.tools.<toolName>(args)
    const toolProxy = new Proxy(
      {},
      {
        get: (_target, toolName: string) => {
          return async (args: any = {}) => {
            if (toolCallCount >= maxToolCalls) {
              throw new Error(`[PTC] Maximum tool calls limit reached (${maxToolCalls})`);
            }
            toolCallCount++;

            try {
              // Execute tool via ToolRegistry or provided context handler
              const handler = ToolRegistry.getToolHandler(toolName);
              let resultStr: string;
              if (handler) {
                resultStr = await handler(args, options.context);
              } else {
                resultStr = await ToolRegistry.executeTool(toolName, args, options.context);
              }

              // Try parsing JSON if result is formatted JSON string for easy script manipulation
              try {
                return JSON.parse(resultStr);
              } catch {
                return resultStr;
              }
            } catch (err: any) {
              const errorMessage = err?.message || String(err);
              customConsole.error(`Tool '${toolName}' failed:`, errorMessage);
              throw new Error(`Tool '${toolName}' failed: ${errorMessage}`);
            }
          };
        },
      }
    );

    const lucaEnvironment = {
      tools: toolProxy,
      env: options.customArgs || {},
    };

    // Construct execution sandbox function
    const wrappedScript = `
      return (async () => {
        ${scriptBody}
      })();
    `;

    try {
      const scriptFn = new Function("luca", "console", "args", wrappedScript);

      const executionPromise = scriptFn(lucaEnvironment, customConsole, options.customArgs || {});

      let timeoutHandler: any;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandler = setTimeout(() => {
          reject(new Error(`[PTC] Execution timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      });

      const returnValue = await Promise.race([executionPromise, timeoutPromise]).finally(() => {
        if (timeoutHandler) clearTimeout(timeoutHandler);
      });

      const executionTimeMs = Date.now() - startTime;
      
      let formattedOutput = "";
      if (logs.length > 0) {
        formattedOutput += `--- Script Logs ---\n${logs.join("\n")}\n\n`;
      }
      formattedOutput += `--- Script Result ---\n`;
      formattedOutput += typeof returnValue === "object" ? JSON.stringify(returnValue, null, 2) : String(returnValue ?? "undefined");

      return {
        success: true,
        output: formattedOutput,
        toolCallsExecuted: toolCallCount,
        executionTimeMs,
      };
    } catch (error: any) {
      const executionTimeMs = Date.now() - startTime;
      const errorMessage = error?.message || String(error);

      let formattedOutput = "";
      if (logs.length > 0) {
        formattedOutput += `--- Script Logs (Prior to Error) ---\n${logs.join("\n")}\n\n`;
      }
      formattedOutput += `--- Script Error ---\n${errorMessage}`;

      return {
        success: false,
        output: formattedOutput,
        toolCallsExecuted: toolCallCount,
        executionTimeMs,
        error: errorMessage,
      };
    }
  }
}

export const programmaticToolExecutor = new ProgrammaticToolExecutor();

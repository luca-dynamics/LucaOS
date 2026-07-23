import { ToolRegistry, TOOL_CONFIGS, SecurityLevel } from "../toolRegistry";

export interface PTCExecutionOptions {
  timeoutMs?: number;
  maxToolCalls?: number;
  context?: any;
  customArgs?: Record<string, any>;
}

/**
 * Highest security level a script may invoke without a fresh authorization
 * challenge. `execute_script` is itself LEVEL_1, so a script inherits at most
 * LEVEL_1 — it can never escalate to LEVEL_2 (biometric) or LEVEL_3 (dual)
 * tools, which the executor has no UI to gate. `ToolRegistry.execute` performs
 * no security-level check of its own (the gate lives in the UI orchestrator,
 * keyed on the top-level tool name), so this proxy re-applies it here.
 */
const MAX_SCRIPT_TOOL_LEVEL = SecurityLevel.LEVEL_1;

/**
 * Tools a script may never invoke regardless of level — they either re-enter
 * this executor (recursion / nesting) or launder a call past the gate.
 */
const SCRIPT_TOOL_DENYLIST = new Set<string>([
  "execute_script",
  "invokeAnyTool",
]);

/**
 * Decide whether a script is permitted to call `toolName`. Deny by default:
 * a tool with no entry in TOOL_CONFIGS has not been vetted for script use.
 */
function isScriptCallableTool(toolName: string): boolean {
  if (SCRIPT_TOOL_DENYLIST.has(toolName)) return false;
  const config = TOOL_CONFIGS[toolName];
  if (!config) return false; // unknown / unvetted → denied
  return config.level <= MAX_SCRIPT_TOOL_LEVEL;
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

            // Re-apply the authorization gate that ToolRegistry.execute skips:
            // a script may only call vetted tools at or below LEVEL_1.
            if (!isScriptCallableTool(toolName)) {
              throw new Error(
                `[PTC] Tool '${toolName}' is not permitted from a script: it is unknown, above the script authorization level (LEVEL_1), or explicitly blocked. Call it directly so the security gate can prompt the user.`,
              );
            }

            toolCallCount++;

            try {
              // Execute tool via ToolRegistry
              const resultStr = await ToolRegistry.execute(toolName, args, options.context);

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

    // Construct execution sandbox function.
    //
    // NOTE: `new Function` is NOT a true security boundary — its body runs in
    // the global realm and a determined script can still reach ambient objects
    // via constructor chains (e.g. `([]).constructor.constructor`). The real
    // containment is (a) the LEVEL_1 tool gate above and (b) never letting an
    // untrusted caller (remote delegation, relay bots) reach this executor.
    // Shadowing the common ambient globals as `undefined` parameters is
    // defense-in-depth: it blocks the direct, obvious escapes (`window`,
    // `fetch`, `process`, `require`, `eval`, `Function`, …) so a script cannot
    // trivially exfiltrate or spawn without going through the gated tool proxy.
    // NB: `eval` and `arguments` are illegal parameter names under "use strict",
    // so they cannot be shadowed this way — `Function` (the more useful escape
    // primitive) still is, and the tool gate remains the real boundary.
    const shadowedGlobals = [
      "window",
      "globalThis",
      "self",
      "document",
      "fetch",
      "XMLHttpRequest",
      "WebSocket",
      "process",
      "require",
      "module",
      "exports",
      "global",
      "Function",
      "__dirname",
      "__filename",
    ];

    const wrappedScript = `
      "use strict";
      return (async () => {
        ${scriptBody}
      })();
    `;

    try {
      const scriptFn = new Function(
        "luca",
        "console",
        "args",
        ...shadowedGlobals,
        wrappedScript,
      );

      const executionPromise = scriptFn(
        lucaEnvironment,
        customConsole,
        options.customArgs || {},
        // one `undefined` per shadowed global name
        ...shadowedGlobals.map(() => undefined),
      );

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

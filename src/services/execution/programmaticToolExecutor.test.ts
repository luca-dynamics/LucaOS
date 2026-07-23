import { describe, expect, it, vi, beforeEach } from "vitest";
import { ProgrammaticToolExecutor } from "./programmaticToolExecutor";
import { ToolRegistry } from "../toolRegistry";

// Mock the whole toolRegistry module. The executor calls ToolRegistry.execute
// (the real dispatch path) and reads TOOL_CONFIGS + SecurityLevel to gate which
// tools a script may call, so the mock must provide all three.
vi.mock("../toolRegistry", () => {
  const SecurityLevel = { LEVEL_0: 0, LEVEL_1: 1, LEVEL_2: 2, LEVEL_3: 3 };
  return {
    SecurityLevel,
    TOOL_CONFIGS: {
      safe_read: { level: SecurityLevel.LEVEL_0, scope: "READ" },
      session_tool: { level: SecurityLevel.LEVEL_1, scope: "READ" },
      bio_tool: { level: SecurityLevel.LEVEL_2, scope: "SYSTEM" },
      dual_tool: { level: SecurityLevel.LEVEL_3, scope: "SYSTEM" },
      // present in config but must still be blocked by the denylist:
      execute_script: { level: SecurityLevel.LEVEL_1, scope: "SYSTEM" },
      invokeAnyTool: { level: SecurityLevel.LEVEL_0, scope: "SYSTEM" },
    },
    ToolRegistry: {
      execute: vi.fn(),
    },
  };
});

const execMock = ToolRegistry.execute as unknown as ReturnType<typeof vi.fn>;

describe("ProgrammaticToolExecutor", () => {
  let executor: ProgrammaticToolExecutor;

  beforeEach(() => {
    executor = new ProgrammaticToolExecutor();
    vi.clearAllMocks();
  });

  it("executes a multi-step script over allowed (<= LEVEL_1) tools", async () => {
    execMock.mockImplementation(async (toolName: string, args: any) => {
      if (toolName === "safe_read") return JSON.stringify(["file1.txt", "file2.txt"]);
      if (toolName === "session_tool") return `Content of ${args.filename}`;
      return "unexpected";
    });

    const script = `
      console.log("Starting batch processing...");
      const files = await luca.tools.safe_read({ query: "*.txt" });
      const results = [];
      for (const file of files) {
        const content = await luca.tools.session_tool({ filename: file });
        results.push({ file, content });
      }
      return { total: results.length, items: results };
    `;

    const result = await executor.executeScript(script);

    expect(result.success).toBe(true);
    expect(result.toolCallsExecuted).toBe(3); // 1 safe_read + 2 session_tool
    expect(result.output).toContain("Starting batch processing...");
    expect(result.output).toContain('"total": 2');
    expect(result.output).toContain("Content of file1.txt");
  });

  it("captures logs and handles object outputs cleanly", async () => {
    const script = `
      console.log("Step 1");
      console.warn("Watch out");
      return "Finished successfully";
    `;

    const result = await executor.executeScript(script);

    expect(result.success).toBe(true);
    expect(result.output).toContain("--- Script Logs ---");
    expect(result.output).toContain("Step 1");
    expect(result.output).toContain("[WARN] Watch out");
    expect(result.output).toContain("Finished successfully");
  });

  it("enforces maximum tool calls limit", async () => {
    execMock.mockResolvedValue("ok");

    const script = `
      for (let i = 0; i < 10; i++) {
        await luca.tools.safe_read({});
      }
    `;

    const result = await executor.executeScript(script, { maxToolCalls: 3 });

    expect(result.success).toBe(false);
    expect(result.toolCallsExecuted).toBe(3);
    expect(result.error).toContain("Maximum tool calls limit reached (3)");
  });

  it("enforces execution timeout", async () => {
    const script = `
      await new Promise(resolve => setTimeout(resolve, 500));
      return "done";
    `;

    const result = await executor.executeScript(script, { timeoutMs: 50 });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Execution timed out after 50ms");
  });

  // --- Security: the gate the raw ToolRegistry.execute path lacks ---

  it("blocks a LEVEL_2 (biometric) tool from a script", async () => {
    execMock.mockResolvedValue("SHOULD NOT RUN");
    const result = await executor.executeScript(
      `return await luca.tools.bio_tool({});`,
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("bio_tool");
    expect(result.error).toContain("not permitted");
    expect(execMock).not.toHaveBeenCalled();
  });

  it("blocks a LEVEL_3 (dual) tool from a script", async () => {
    execMock.mockResolvedValue("SHOULD NOT RUN");
    const result = await executor.executeScript(
      `return await luca.tools.dual_tool({});`,
    );
    expect(result.success).toBe(false);
    expect(execMock).not.toHaveBeenCalled();
  });

  it("blocks an unknown / unvetted tool (deny by default)", async () => {
    execMock.mockResolvedValue("SHOULD NOT RUN");
    const result = await executor.executeScript(
      `return await luca.tools.totally_unknown_tool({});`,
    );
    expect(result.success).toBe(false);
    expect(execMock).not.toHaveBeenCalled();
  });

  it("blocks execute_script recursion and invokeAnyTool laundering", async () => {
    execMock.mockResolvedValue("SHOULD NOT RUN");
    const nested = await executor.executeScript(
      `return await luca.tools.execute_script({ script: "return 1" });`,
    );
    expect(nested.success).toBe(false);
    const launder = await executor.executeScript(
      `return await luca.tools.invokeAnyTool({ toolName: "dual_tool" });`,
    );
    expect(launder.success).toBe(false);
    expect(execMock).not.toHaveBeenCalled();
  });

  it("shadows ambient globals so a script cannot reach them directly", async () => {
    const result = await executor.executeScript(
      `return [typeof window, typeof fetch, typeof process, typeof require, typeof Function, typeof globalThis].join(",");`,
    );
    expect(result.success).toBe(true);
    expect(result.output).toContain("undefined,undefined,undefined,undefined,undefined,undefined");
  });
});

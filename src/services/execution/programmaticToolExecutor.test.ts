import { describe, expect, it, vi, beforeEach } from "vitest";
import { ProgrammaticToolExecutor } from "./programmaticToolExecutor";
import { ToolRegistry } from "../toolRegistry";

vi.mock("../toolRegistry", () => ({
  ToolRegistry: {
    getToolHandler: vi.fn(),
    executeTool: vi.fn(),
  },
}));

describe("ProgrammaticToolExecutor", () => {
  let executor: ProgrammaticToolExecutor;

  beforeEach(() => {
    executor = new ProgrammaticToolExecutor();
    vi.clearAllMocks();
  });

  it("executes multi-step script with luca.tools RPC stubs and returns collapsed result", async () => {
    (ToolRegistry.getToolHandler as any).mockImplementation((toolName: string) => {
      if (toolName === "searchFiles") {
        return async () => JSON.stringify(["file1.txt", "file2.txt"]);
      }
      if (toolName === "readFile") {
        return async (args: any) => `Content of ${args.filename}`;
      }
      return null;
    });

    const script = `
      console.log("Starting batch processing...");
      const files = await luca.tools.searchFiles({ query: "*.txt" });
      const results = [];
      for (const file of files) {
        const content = await luca.tools.readFile({ filename: file });
        results.push({ file, content });
      }
      return { total: results.length, items: results };
    `;

    const result = await executor.executeScript(script);

    expect(result.success).toBe(true);
    expect(result.toolCallsExecuted).toBe(3); // 1 searchFiles + 2 readFile
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
    (ToolRegistry.getToolHandler as any).mockReturnValue(async () => "ok");

    const script = `
      for (let i = 0; i < 10; i++) {
        await luca.tools.someTool({});
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
});

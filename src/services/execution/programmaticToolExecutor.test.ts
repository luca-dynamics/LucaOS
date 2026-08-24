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

// The scratchpad client is mocked rather than exercised: its own file covers the
// HTTP behaviour, and mocking it keeps this file from importing `config/api` and
// the transcript client transitively. `loadResult` / `saveResult` are what the
// state tests move around.
let loadResult: {
  state: Record<string, unknown>;
  persisted: boolean;
  reason: string | null;
  bytesUsed: number;
  keyCount: number;
  limits: null;
};
let saveResult: { persisted: boolean; reason: string | null; bytesUsed: number; keyCount: number };
// Typed through the generic rather than the implementation: several tests assert
// on the argument (`toHaveBeenCalledWith({ rows: [1, 2, 3] })`), so the call
// signature has to declare it, while the body has no use for it. An unused
// parameter here would be a lint warning, and `--max-warnings 0` treats that as
// a failure.
const saveMock = vi.fn<(next: Record<string, unknown>) => Promise<typeof saveResult>>(
  async () => saveResult,
);

vi.mock("../session/sessionScratchpad", () => ({
  sessionScratchpad: {
    load: async () => loadResult,
    save: (next: Record<string, unknown>) => saveMock(next),
  },
}));

const loadedState = (state: Record<string, unknown>) => ({
  state,
  persisted: true,
  reason: null,
  bytesUsed: JSON.stringify(state).length,
  keyCount: Object.keys(state).length,
  limits: null,
});

describe("ProgrammaticToolExecutor", () => {
  let executor: ProgrammaticToolExecutor;

  beforeEach(() => {
    executor = new ProgrammaticToolExecutor();
    loadResult = loadedState({});
    saveResult = { persisted: true, reason: null, bytesUsed: 0, keyCount: 0 };
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

// --- luca.state: durable working data across calls, compaction and restart ---

describe("ProgrammaticToolExecutor — luca.state", () => {
  let executor: ProgrammaticToolExecutor;

  beforeEach(() => {
    executor = new ProgrammaticToolExecutor();
    loadResult = loadedState({});
    saveResult = { persisted: true, reason: null, bytesUsed: 0, keyCount: 0 };
    vi.clearAllMocks();
  });

  it("hands the script what an earlier call stored", async () => {
    loadResult = loadedState({ rows: [1, 2, 3], label: "batch-7" });

    const result = await executor.executeScript(
      `return luca.state.label + ":" + luca.state.rows.length;`,
    );

    expect(result.success).toBe(true);
    expect(result.output).toContain("batch-7:3");
  });

  it("flushes what the script stored, and says it landed", async () => {
    saveResult = { persisted: true, reason: null, bytesUsed: 27, keyCount: 1 };

    const result = await executor.executeScript(
      `luca.state.rows = [1, 2, 3]; return "stored";`,
    );

    expect(saveMock).toHaveBeenCalledTimes(1);
    expect(saveMock).toHaveBeenCalledWith({ rows: [1, 2, 3] });
    // The model has to know the data is there, or it will re-fetch it.
    expect(result.output).toContain("[STATE PERSISTED]");
    expect(result.output).toContain("1 key(s)");
  });

  it("writes nothing when the script never touches state", async () => {
    loadResult = loadedState({ rows: [1, 2, 3] });

    const result = await executor.executeScript(`return luca.state.rows.length;`);

    // A read-only script must not cost a write, and must not be told about one.
    expect(saveMock).not.toHaveBeenCalled();
    expect(result.output).not.toContain("luca.state ---");
  });

  it("persists a deletion, which is why the flush is authoritative", async () => {
    loadResult = loadedState({ rows: [1], stale: true });

    await executor.executeScript(`delete luca.state.stale; return "cleaned";`);

    expect(saveMock).toHaveBeenCalledWith({ rows: [1] });
  });

  it("flushes what the script assigned even if it replaced the object outright", async () => {
    loadResult = loadedState({ old: 1 });

    await executor.executeScript(`luca.state = { fresh: 2 }; return "swapped";`);

    // Flushing the object we handed in would silently discard everything the
    // script stored.
    expect(saveMock).toHaveBeenCalledWith({ fresh: 2 });
  });

  it("says so loudly when the write did not land, and still returns the result", async () => {
    saveResult = {
      persisted: false,
      reason: "fetch failed",
      bytesUsed: 0,
      keyCount: 0,
    };

    const result = await executor.executeScript(
      `luca.state.rows = [1, 2, 3]; return "computed anyway";`,
    );

    expect(result.success).toBe(true);
    expect(result.output).toContain("computed anyway");
    expect(result.output).toContain("[STATE NOT PERSISTED]");
    expect(result.output).toContain("fetch failed");
    expect(result.output).toContain("lost when this call ends");
  });

  it("passes on a caveat about a write that landed incompletely", async () => {
    saveResult = {
      persisted: true,
      reason: "the previous state could not be read, so this save removed none",
      bytesUsed: 12,
      keyCount: 3,
    };

    const result = await executor.executeScript(`luca.state.a = 1; return "ok";`);

    expect(result.output).toContain("[STATE PARTIALLY PERSISTED]");
    expect(result.output).toContain("removed none");
  });

  it("warns when the state could not be read at all", async () => {
    loadResult = {
      state: {},
      persisted: false,
      reason: "no session id resolved yet",
      bytesUsed: 0,
      keyCount: 0,
      limits: null,
    };

    // Said even for a script that never touches state: one that *read* it saw
    // undefined for keys that do exist, and the model must not conclude they are
    // absent.
    const result = await executor.executeScript(`return "untouched";`);

    expect(result.output).toContain("[STATE NOT LOADED]");
    expect(result.output).toContain("no session id resolved yet");
    expect(saveMock).not.toHaveBeenCalled();
  });

  it("keeps the state a plain object with no route back to the tool proxy", async () => {
    // A Proxy here would let a script observe the flush; a reference to `luca`
    // would let a stored value carry the tool proxy into the next call.
    const result = await executor.executeScript(
      `return [typeof luca.state, luca.state.tools === undefined, Object.getPrototypeOf(luca.state) === Object.prototype].join(",");`,
    );

    expect(result.output).toContain("object,true,true");
  });

  it("saves what a failed script had already stored", async () => {
    execMock.mockResolvedValue("ok");
    saveResult = { persisted: true, reason: null, bytesUsed: 9, keyCount: 1 };

    const result = await executor.executeScript(`
      luca.state.expensive = await luca.tools.safe_read({});
      throw new Error("failed at step 2");
    `);

    expect(result.success).toBe(false);
    // The expensive part of a script that dies late is usually what it stored
    // early; discarding it forces the whole thing to run again.
    expect(saveMock).toHaveBeenCalledWith({ expensive: "ok" });
    expect(result.output).toContain("failed at step 2");
    expect(result.output).toContain("[STATE PERSISTED]");
  });
});

import { describe, expect, it } from "vitest";
import { ComputerUseSandboxExecutorAdapter } from "./ComputerUseSandboxExecutorAdapter";

describe("ComputerUseSandboxExecutorAdapter", () => {
  it("executes click in sandbox", async () => {
    const adapter = new ComputerUseSandboxExecutorAdapter();
    const result = await adapter.execute({ type: "click", reason: "ok", requiresGuardApproval: false }, {});
    expect(result.status).toBe("executed");
  });

  it("executes type_text and preserves exact text", async () => {
    const adapter = new ComputerUseSandboxExecutorAdapter();
    const result = await adapter.execute(
      { type: "type_text", reason: "type", requiresGuardApproval: false, text: "  keep exact  " },
      {},
    );
    expect(result.action.text).toBe("  keep exact  ");
  });

  it("does not support observe", async () => {
    const adapter = new ComputerUseSandboxExecutorAdapter();
    const result = await adapter.execute({ type: "observe", reason: "obs", requiresGuardApproval: false }, {});
    expect(result.status).toBe("failed");
  });

  it("metadata executionMode is sandbox", async () => {
    const adapter = new ComputerUseSandboxExecutorAdapter();
    const result = await adapter.execute({ type: "wait", reason: "pause", requiresGuardApproval: false }, {});
    expect(result.metadata?.executionMode).toBe("sandbox");
  });

  it("metadata systemApisCalled false", async () => {
    const adapter = new ComputerUseSandboxExecutorAdapter();
    const result = await adapter.execute({ type: "scroll", reason: "scroll", requiresGuardApproval: false }, {});
    expect(result.metadata?.systemApisCalled).toBe(false);
  });
});

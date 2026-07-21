import { describe, expect, it, vi } from "vitest";
import { BrowserRuntimeRouterRealInvocationShell } from "./BrowserRuntimeRouterRealInvocationShell";
import { ComputerUseSandboxExecutorAdapter } from "./ComputerUseSandboxExecutorAdapter";
import type { ComputerUseBrowserRuntimeRouterPort } from "./types";

describe("ComputerUseSandboxExecutorAdapter", () => {
  it("executes click in sandbox", async () => {
    const adapter = new ComputerUseSandboxExecutorAdapter();
    const result = await adapter.execute(
      { type: "click", reason: "ok", requiresGuardApproval: false },
      {},
    );
    expect(result.status).toBe("executed");
    expect(result.metadata?.sandboxSimulated).toBe(true);
    expect(result.metadata?.executorKind).toBe("scaffold");
  });

  it("executes type_text and preserves exact text", async () => {
    const adapter = new ComputerUseSandboxExecutorAdapter();
    const result = await adapter.execute(
      {
        type: "type_text",
        reason: "type",
        requiresGuardApproval: false,
        text: "  keep exact  ",
      },
      {},
    );
    expect(result.action.text).toBe("  keep exact  ");
  });

  it("does not support observe", async () => {
    const adapter = new ComputerUseSandboxExecutorAdapter();
    const result = await adapter.execute(
      { type: "observe", reason: "obs", requiresGuardApproval: false },
      {},
    );
    expect(result.status).toBe("failed");
  });

  it("metadata executionMode is sandbox", async () => {
    const adapter = new ComputerUseSandboxExecutorAdapter();
    const result = await adapter.execute(
      { type: "wait", reason: "pause", requiresGuardApproval: false },
      {},
    );
    expect(result.metadata?.executionMode).toBe("sandbox");
  });

  it("metadata systemApisCalled false", async () => {
    const adapter = new ComputerUseSandboxExecutorAdapter();
    const result = await adapter.execute(
      { type: "scroll", reason: "scroll", requiresGuardApproval: false },
      {},
    );
    expect(result.metadata?.systemApisCalled).toBe(false);
  });

  it("real path fails closed without invocation shell", async () => {
    const adapter = new ComputerUseSandboxExecutorAdapter({
      realSandboxExecutionEnabled: true,
    });
    const result = await adapter.execute(
      {
        type: "click",
        reason: "ok",
        requiresGuardApproval: false,
        target: { selectorHint: "#go" },
      },
      {},
    );
    expect(result.status).toBe("failed");
    expect(result.metadata?.executorKind).toBe("real_sandbox");
    expect(result.metadata?.reason).toMatch(/invocationShell/i);
  });

  it("real path invokes shell + router when wired", async () => {
    const route = vi.fn(async () => ({
      accepted: true,
      lane: "sandbox_browser",
      runtime: "playwright",
      reason: "driver-ok",
      execution: {
        playwrightCalled: true,
        browserApisCalled: true,
        realBrowserExecutionEnabled: true,
      },
    }));
    const router: ComputerUseBrowserRuntimeRouterPort = { route };
    const shell = new BrowserRuntimeRouterRealInvocationShell({ router });
    const adapter = new ComputerUseSandboxExecutorAdapter({
      realSandboxExecutionEnabled: true,
      invocationShell: shell,
      defaultMissionId: "mission-real-1",
    });

    const result = await adapter.execute(
      {
        type: "click",
        reason: "ok",
        requiresGuardApproval: false,
        target: { selectorHint: "#confirm" },
      },
      { missionId: "mission-real-1", guardApprovalProvided: true },
    );

    expect(result.status).toBe("executed");
    expect(result.metadata?.executorKind).toBe("real_sandbox");
    expect(result.metadata?.sandboxSimulated).toBe(false);
    expect(result.metadata?.browserRuntimeRouterCalled).toBe(true);
    expect(result.metadata?.playwrightCalled).toBe(true);
    expect(route).toHaveBeenCalled();
  });

  it("real path fails when router rejects", async () => {
    const shell = new BrowserRuntimeRouterRealInvocationShell({
      router: {
        route: async () => ({
          accepted: false,
          lane: "sandbox_browser",
          runtime: "playwright",
          reason: "nope",
        }),
      },
    });
    const adapter = new ComputerUseSandboxExecutorAdapter({
      realSandboxExecutionEnabled: true,
      invocationShell: shell,
    });

    const result = await adapter.execute(
      {
        type: "click",
        reason: "ok",
        requiresGuardApproval: false,
        target: { selectorHint: "#x" },
      },
      {},
    );

    expect(result.status).toBe("failed");
    expect(result.metadata?.reason).toMatch(/nope/i);
  });
});

import { describe, expect, it, vi } from "vitest";
import { createRealSandboxComputerUseStack } from "./createRealSandboxComputerUseStack";
import type { BrowserDriver } from "./types";

function createMockDriver(): BrowserDriver {
  return {
    kind: "injected",
    navigate: vi.fn(async (url: string) => ({ ok: true, reason: `nav:${url}` })),
    click: vi.fn(async (target?: string) => ({
      ok: true,
      reason: `click:${target}`,
    })),
    type: vi.fn(async (_t, text: string) => ({
      ok: true,
      reason: `type:${text.length}`,
    })),
    extract: vi.fn(async () => ({ ok: true, reason: "extract", data: { text: "x" } })),
    screenshot: vi.fn(async () => ({ ok: true, reason: "shot" })),
    dispose: vi.fn(async () => undefined),
  };
}

describe("createRealSandboxComputerUseStack", () => {
  it("returns scaffold-only stack when disabled (default)", async () => {
    const stack = await createRealSandboxComputerUseStack();
    expect(stack.enabled).toBe(false);
    expect(stack.driverKind).toBe("none");
    expect(stack.router).toBeUndefined();
    expect(stack.invocationShell).toBeUndefined();
    expect(stack.missionTapeEnabled).toBe(false);

    const result = await stack.pipeline.run({
      missionId: "scaffold-1",
      userPointedTarget: { description: "Save", selectorHint: "#save" },
      executionRequest: { guardApprovalProvided: true },
    });
    expect(result.executionResults[0].status).toBe("executed");
    expect(result.executionResults[0].metadata?.sandboxSimulated).toBe(true);
    expect(result.executionResults[0].metadata?.executorKind).toBe("scaffold");
  });

  it("wires real path with injected driver when enabled", async () => {
    const driver = createMockDriver();
    const stack = await createRealSandboxComputerUseStack({
      enabled: true,
      driver,
      includeRuntime: true,
    });

    expect(stack.enabled).toBe(true);
    expect(stack.driverKind).toBe("injected");
    expect(stack.router).toBeDefined();
    expect(stack.invocationShell).toBeDefined();
    expect(stack.runtime).toBeDefined();

    const result = await stack.pipeline.run({
      missionId: "real-1",
      userPointedTarget: { description: "Save", selectorHint: "#save" },
      executionRequest: {
        guardApprovalProvided: true,
        missionId: "real-1",
      },
    });

    expect(result.executionResults[0].status).toBe("executed");
    expect(result.executionResults[0].metadata?.executorKind).toBe("real_sandbox");
    expect(result.executionResults[0].metadata?.sandboxSimulated).toBe(false);
    expect(result.executionResults[0].metadata?.browserRuntimeRouterCalled).toBe(
      true,
    );
    // click mapped through router → adapter → driver
    expect(driver.click).toHaveBeenCalled();

    await stack.dispose();
    expect(driver.dispose).toHaveBeenCalled();
  });

  it("records mission tape when enableMissionTapeSink is on", async () => {
    const driver = createMockDriver();
    const stack = await createRealSandboxComputerUseStack({
      enabled: true,
      driver,
      enableMissionTapeSink: true,
      includeRuntime: false,
    });

    expect(stack.missionTapeEnabled).toBe(true);
    expect(stack.missionTapeRecorder).toBeDefined();

    await stack.pipeline.run({
      missionId: "tape-1",
      userPointedTarget: { description: "Save", selectorHint: "#save" },
      executionRequest: { guardApprovalProvided: true, missionId: "tape-1" },
    });

    const tape = await stack.missionTapeRecorder!.getTape("tape-1");
    expect(tape).toBeTruthy();
    expect(tape!.steps.length).toBeGreaterThan(0);
  });

  it("throws when electron_sandbox lacks invoke", async () => {
    await expect(
      createRealSandboxComputerUseStack({
        enabled: true,
        driverKind: "electron_sandbox",
      }),
    ).rejects.toThrow(/invoke/i);
  });
});

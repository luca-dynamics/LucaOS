import { describe, expect, it, vi } from "vitest";
import { ComputerUseExecutor } from "./ComputerUseExecutor";
import { ComputerUseActionPlan, ComputerUseExecutorAdapter, ComputerUsePlannedAction } from "./types";

const basePlan: ComputerUseActionPlan = {
  actions: [],
  requiresGuardApproval: false,
  prefersSandbox: false,
  metadata: {
    planningOnly: true,
    actionsExecuted: false,
    systemApisUsed: false,
  },
};

const clickAction: ComputerUsePlannedAction = {
  type: "click",
  reason: "test click",
  requiresGuardApproval: false,
};

describe("ComputerUseExecutor", () => {
  it("observe action is skipped", async () => {
    const executor = new ComputerUseExecutor();

    const result = await executor.executeAction(
      { type: "observe", reason: "observe first", requiresGuardApproval: false },
      basePlan,
    );

    expect(result.status).toBe("skipped");
  });

  it("click requiring approval without approval is denied", async () => {
    const executor = new ComputerUseExecutor();

    const result = await executor.executeAction({ ...clickAction, requiresGuardApproval: true }, basePlan);

    expect(result.status).toBe("denied");
  });

  it("type_text preserves exact text payload", async () => {
    const execute = vi.fn().mockResolvedValue({
      status: "executed",
      action: {
        type: "type_text",
        reason: "typed",
        requiresGuardApproval: false,
        text: "  keep exact text  ",
      },
      metadata: {
        adapterId: "sandbox-adapter",
        systemApisCalled: false,
        delegatesOnly: true,
        noDirectSystemCalls: true,
        executorKind: "scaffold",
      },
    });

    const adapter: ComputerUseExecutorAdapter = {
      id: "sandbox-adapter",
      mode: "sandbox",
      supportedActionTypes: ["type_text"],
      execute,
    };

    const executor = new ComputerUseExecutor();
    executor.registerAdapter(adapter);

    const action: ComputerUsePlannedAction = {
      type: "type_text",
      reason: "typing",
      text: "  keep exact text  ",
      requiresGuardApproval: false,
    };

    await executor.executeAction(action, basePlan);

    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({ text: "  keep exact text  " }),
      expect.any(Object),
    );
  });

  it("no adapter returns failed", async () => {
    const executor = new ComputerUseExecutor();

    const result = await executor.executeAction(clickAction, basePlan);

    expect(result.status).toBe("failed");
  });

  it("matching adapter executes action", async () => {
    const execute = vi.fn().mockResolvedValue({
      status: "executed",
      action: clickAction,
      metadata: {
        adapterId: "sandbox-click",
        systemApisCalled: false,
        delegatesOnly: true,
        noDirectSystemCalls: true,
        executorKind: "scaffold",
      },
    });

    const executor = new ComputerUseExecutor();
    executor.registerAdapter({
      id: "sandbox-click",
      mode: "sandbox",
      supportedActionTypes: ["click"],
      execute,
    });

    const result = await executor.executeAction(clickAction, basePlan);

    expect(result.status).toBe("executed");
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("untrusted/preferSandbox plan does not select direct_host adapter", async () => {
    const directExecute = vi.fn().mockResolvedValue({
      status: "executed",
      action: clickAction,
      metadata: {
        adapterId: "direct",
        systemApisCalled: false,
        delegatesOnly: true,
        noDirectSystemCalls: true,
        executorKind: "scaffold",
      },
    });
    const sandboxExecute = vi.fn().mockResolvedValue({
      status: "executed",
      action: clickAction,
      metadata: {
        adapterId: "sandbox",
        systemApisCalled: false,
        delegatesOnly: true,
        noDirectSystemCalls: true,
        executorKind: "scaffold",
      },
    });

    const executor = new ComputerUseExecutor();
    executor.registerAdapter({
      id: "direct",
      mode: "direct_host",
      supportedActionTypes: ["click"],
      execute: directExecute,
    });
    executor.registerAdapter({
      id: "sandbox",
      mode: "sandbox",
      supportedActionTypes: ["click"],
      execute: sandboxExecute,
    });

    const result = await executor.executeAction(clickAction, { ...basePlan, prefersSandbox: true });

    expect(result.status).toBe("executed");
    expect(directExecute).not.toHaveBeenCalled();
    expect(sandboxExecute).toHaveBeenCalledTimes(1);
  });

  it("defaultExecutionMode selects sandbox adapter when request executionMode is missing", async () => {
    const directExecute = vi.fn().mockResolvedValue({
      status: "executed",
      action: clickAction,
      metadata: {
        adapterId: "direct",
        systemApisCalled: false,
        delegatesOnly: true,
        noDirectSystemCalls: true,
        executorKind: "scaffold",
      },
    });
    const sandboxExecute = vi.fn().mockResolvedValue({
      status: "executed",
      action: clickAction,
      metadata: {
        adapterId: "sandbox",
        systemApisCalled: false,
        delegatesOnly: true,
        noDirectSystemCalls: true,
        executorKind: "scaffold",
      },
    });

    const executor = new ComputerUseExecutor({ defaultExecutionMode: "sandbox" });
    executor.registerAdapter({
      id: "direct",
      mode: "direct_host",
      supportedActionTypes: ["click"],
      execute: directExecute,
    });
    executor.registerAdapter({
      id: "sandbox",
      mode: "sandbox",
      supportedActionTypes: ["click"],
      execute: sandboxExecute,
    });

    const result = await executor.executeAction(clickAction, basePlan, {});

    expect(result.status).toBe("executed");
    expect(directExecute).not.toHaveBeenCalled();
    expect(sandboxExecute).toHaveBeenCalledTimes(1);
  });

  it("preserves adapter metadata reason while enforcing scaffold safety metadata", async () => {
    const executor = new ComputerUseExecutor();
    executor.registerAdapter({
      id: "sandbox-click",
      mode: "sandbox",
      supportedActionTypes: ["click"],
      execute: vi.fn().mockResolvedValue({
        status: "executed",
        action: clickAction,
        metadata: {
          reason: "adapter-provided reason",
          adapterId: "sandbox-click",
          systemApisCalled: false,
          delegatesOnly: true,
          noDirectSystemCalls: true,
          executorKind: "scaffold",
        },
      }),
    });

    const result = await executor.executeAction(clickAction, basePlan);

    expect(result.metadata?.reason).toBe("adapter-provided reason");
    expect(result.metadata?.systemApisCalled).toBe(false);
    expect(result.metadata?.delegatesOnly).toBe(true);
    expect(result.metadata?.noDirectSystemCalls).toBe(true);
    expect(result.metadata?.executorKind).toBe("scaffold");
  });

  it("executor metadata says systemApisCalled false", async () => {
    const executor = new ComputerUseExecutor();
    const result = await executor.executeAction(
      { type: "observe", reason: "obs", requiresGuardApproval: false },
      basePlan,
    );

    expect(result.metadata?.systemApisCalled).toBe(false);
  });

  it("reset clears registered adapters", async () => {
    const execute = vi.fn().mockResolvedValue({
      status: "executed",
      action: clickAction,
      metadata: {
        adapterId: "sandbox-click",
        systemApisCalled: false,
        delegatesOnly: true,
        noDirectSystemCalls: true,
        executorKind: "scaffold",
      },
    });
    const executor = new ComputerUseExecutor();
    executor.registerAdapter({ id: "sandbox-click", mode: "sandbox", supportedActionTypes: ["click"], execute });

    executor.reset();
    const result = await executor.executeAction(clickAction, basePlan);

    expect(result.status).toBe("failed");
    expect(execute).not.toHaveBeenCalled();
  });
});

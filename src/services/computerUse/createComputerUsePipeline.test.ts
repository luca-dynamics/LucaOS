import { describe, expect, it } from "vitest";
import { BrowserRuntimeRouterRealInvocationShell } from "./BrowserRuntimeRouterRealInvocationShell";
import { createComputerUsePipeline } from "./createComputerUsePipeline";

describe("createComputerUsePipeline", () => {
  it("creates pipeline with sandbox adapter registered", async () => {
    const pipeline = createComputerUsePipeline();
    const result = await pipeline.run({
      missionId: "factory-1",
      userPointedTarget: { description: "Save" },
      executionRequest: { guardApprovalProvided: true },
    });
    expect(result.executionResults[0].status).toBe("executed");
    expect(result.executionResults[0].metadata?.executionMode).toBe("sandbox");
    expect(result.executionResults[0].metadata?.sandboxSimulated).toBe(true);
  });

  it("dangerous action without approval is denied by guard", async () => {
    const pipeline = createComputerUsePipeline({ riskLevel: "dangerous" });
    const result = await pipeline.run({
      missionId: "factory-2",
      userPointedTarget: { description: "Delete" },
      executionRequest: { guardApprovalProvided: false },
    });
    expect(result.executionResults[0].status).toBe("denied");
  });

  it("dangerous action with approval executes through sandbox adapter", async () => {
    const pipeline = createComputerUsePipeline({ riskLevel: "dangerous" });
    const result = await pipeline.run({
      missionId: "factory-3",
      userPointedTarget: { description: "Delete" },
      executionRequest: { guardApprovalProvided: true },
    });
    expect(result.executionResults[0].metadata?.executionMode).toBe("sandbox");
  });

  it("no direct_host adapter is registered by default", async () => {
    const pipeline = createComputerUsePipeline();
    const result = await pipeline.run({
      missionId: "factory-4",
      userPointedTarget: { description: "Click" },
      executionRequest: { executionMode: "direct_host", guardApprovalProvided: true },
    });
    expect(result.executionResults[0].status).toBe("failed");
  });

  it("factory with sandbox disabled falls back to no-adapter safe failure", async () => {
    const pipeline = createComputerUsePipeline({ registerDefaultSandboxAdapter: false });
    const result = await pipeline.run({
      missionId: "factory-5",
      userPointedTarget: { description: "Click" },
      executionRequest: { guardApprovalProvided: true },
    });
    expect(result.executionResults[0].status).toBe("failed");
  });

  it("real sandbox path executes when shell + router are injected", async () => {
    const route = async () => ({
      accepted: true,
      lane: "sandbox_browser",
      runtime: "playwright",
      reason: "pipeline-real-ok",
      execution: {
        playwrightCalled: true,
        browserApisCalled: true,
        realBrowserExecutionEnabled: true,
      },
    });
    const shell = new BrowserRuntimeRouterRealInvocationShell({ router: { route } });
    const pipeline = createComputerUsePipeline({
      realSandboxExecutionEnabled: true,
      invocationShell: shell,
    });

    const result = await pipeline.run({
      missionId: "factory-real-1",
      userPointedTarget: { description: "Save", selectorHint: "#save" },
      executionRequest: { guardApprovalProvided: true, missionId: "factory-real-1" },
    });

    expect(result.executionResults[0].status).toBe("executed");
    expect(result.executionResults[0].metadata?.executorKind).toBe("real_sandbox");
    expect(result.executionResults[0].metadata?.sandboxSimulated).toBe(false);
    expect(result.executionResults[0].metadata?.browserRuntimeRouterCalled).toBe(true);
  });
});

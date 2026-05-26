import { describe, expect, it } from "vitest";
import { createComputerUsePipeline } from "./createComputerUsePipeline";

describe("createComputerUsePipeline", () => {
  it("creates pipeline with sandbox adapter registered", async () => {
    const pipeline = createComputerUsePipeline();
    const result = await pipeline.run({ missionId: "factory-1", userPointedTarget: { description: "Submit" } });
    expect(result.executionResults[0].metadata?.executionMode).toBe("sandbox");
  });

  it("dangerous action without approval is denied by guard", async () => {
    const pipeline = createComputerUsePipeline({ focusContextBuilderOptions: { riskLevel: "dangerous" } });
    const result = await pipeline.run({ missionId: "factory-2", userPointedTarget: { description: "Delete" }, executionRequest: { guardApprovalProvided: false } });
    expect(result.executionResults[0].status).toBe("denied");
  });

  it("dangerous action with approval executes through sandbox adapter", async () => {
    const pipeline = createComputerUsePipeline({ focusContextBuilderOptions: { riskLevel: "dangerous" } });
    const result = await pipeline.run({ missionId: "factory-3", userPointedTarget: { description: "Delete" }, executionRequest: { guardApprovalProvided: true } });
    expect(result.executionResults[0].status).toBe("executed");
    expect(result.executionResults[0].metadata?.executionMode).toBe("sandbox");
  });

  it("no direct_host adapter is registered by default", async () => {
    const pipeline = createComputerUsePipeline();
    const result = await pipeline.run({ missionId: "factory-4", userPointedTarget: { description: "Submit" }, executionRequest: { executionMode: "direct_host" } });
    expect(result.executionResults[0].status).toBe("failed");
    expect(result.executionResults[0].metadata?.reason).toContain("No matching executor adapter found");
  });

  it("factory with sandbox disabled falls back to no-adapter safe failure", async () => {
    const pipeline = createComputerUsePipeline({ disableDefaultSandboxAdapter: true });
    const result = await pipeline.run({ missionId: "factory-5", userPointedTarget: { description: "Submit" } });
    expect(result.executionResults[0].status).toBe("failed");
  });
});

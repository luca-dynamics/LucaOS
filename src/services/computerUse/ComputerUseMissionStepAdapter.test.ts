import { describe, expect, it, vi } from "vitest";
import { ComputerUseMissionEngineBridge } from "./ComputerUseMissionEngineBridge";
import { ComputerUseMissionStepAdapter } from "./ComputerUseMissionStepAdapter";
import { ComputerUseMissionStepInput, ComputerUsePipelineResult } from "./types";

const makeStep = (overrides: Partial<ComputerUseMissionStepInput> = {}): ComputerUseMissionStepInput => ({
  missionId: "m1",
  stepId: "s1",
  kind: "computer_use",
  ...overrides,
});

const makePipelineResult = (overrides: Partial<ComputerUsePipelineResult> = {}): ComputerUsePipelineResult => ({
  missionId: "m1",
  focusContext: {
    executionMode: "sandbox",
    riskLevel: "safe",
    trustTier: "trusted",
    requiresGuardApproval: false,
    prefersSandbox: true,
    focusSignals: [],
    metadata: { contextOnly: true, actionsEnabled: false, systemApisEnabled: false },
  },
  actionPlan: { actions: [], requiresGuardApproval: false, prefersSandbox: true, metadata: { planningOnly: true, actionsExecuted: false, systemApisUsed: false } },
  executionResults: [{ status: "denied", action: { type: "click", reason: "x", requiresGuardApproval: false }, metadata: { delegatesOnly: true, noDirectSystemCalls: true, systemApisCalled: false, executorKind: "scaffold" } }],
  verificationResults: [{ status: "failed", followUpObservationRequired: false, reason: "r", metadata: { verifierKind: "scaffold", systemApisCalled: false, screenshotsCaptured: false } }],
  recoveryPlan: { strategy: "none", requiresGuardApprovalRequest: false, shouldEscalateToUser: false, reason: "none", metadata: { recoveryKind: "scaffold", noRollbackPerformed: true, noSystemActionsPerformed: true } },
  metadata: { pipelineKind: "scaffold", systemApisCalled: false },
  ...overrides,
});

describe("ComputerUseMissionStepAdapter", () => {
  it("can handle computer_use step", () => {
    const adapter = new ComputerUseMissionStepAdapter({ pipeline: { run: vi.fn(), reset: vi.fn() }, missionEngineBridge: new ComputerUseMissionEngineBridge() });
    expect(adapter.canHandleStep(makeStep())).toBe(true);
  });

  it("rejects other kind", () => {
    const adapter = new ComputerUseMissionStepAdapter({ pipeline: { run: vi.fn(), reset: vi.fn() }, missionEngineBridge: new ComputerUseMissionEngineBridge() });
    expect(adapter.canHandleStep(makeStep({ kind: "x" }))).toBe(false);
  });

  it("executes injected pipeline", async () => {
    const run = vi.fn().mockResolvedValue(makePipelineResult({ executionResults: [{ status: "executed", action: { type: "click", reason: "ok", requiresGuardApproval: false }, metadata: { delegatesOnly: true, noDirectSystemCalls: true, systemApisCalled: false, executorKind: "scaffold" } }], verificationResults: [{ status: "passed", followUpObservationRequired: false, reason: "ok", metadata: { verifierKind: "scaffold", systemApisCalled: false, screenshotsCaptured: false } }] }));
    const adapter = new ComputerUseMissionStepAdapter({ pipeline: { run, reset: vi.fn() }, missionEngineBridge: new ComputerUseMissionEngineBridge() });

    await adapter.executeStep(makeStep());
    expect(run).toHaveBeenCalled();
  });

  it("denied pipeline result becomes failed step result", async () => {
    const adapter = new ComputerUseMissionStepAdapter({ pipeline: { run: vi.fn().mockResolvedValue(makePipelineResult()), reset: vi.fn() }, missionEngineBridge: new ComputerUseMissionEngineBridge() });
    const result = await adapter.executeStep(makeStep());
    expect(result.status).toBe("failed");
  });

  it("nested input missionId cannot override outer missionId", async () => {
    const run = vi.fn().mockResolvedValue(makePipelineResult());
    const adapter = new ComputerUseMissionStepAdapter({ pipeline: { run, reset: vi.fn() }, missionEngineBridge: new ComputerUseMissionEngineBridge() });

    const nestedInput = { missionId: "inner", textPayload: "x" } as unknown as ComputerUseMissionStepInput["input"]
    await adapter.executeStep(makeStep({ missionId: "outer", input: nestedInput }));

    expect(run).toHaveBeenCalledWith(expect.objectContaining({ missionId: "outer" }));
  });

  it("stepId is preserved in returned step result", async () => {
    const adapter = new ComputerUseMissionStepAdapter({ pipeline: { run: vi.fn().mockResolvedValue(makePipelineResult()), reset: vi.fn() }, missionEngineBridge: new ComputerUseMissionEngineBridge() });
    const result = await adapter.executeStep(makeStep({ stepId: "step-42" }));

    expect(result.stepId).toBe("step-42");
    expect(result.metadata.stepId).toBe("step-42");
  });

  it("metadata systemApisCalled false", async () => {
    const adapter = new ComputerUseMissionStepAdapter({ pipeline: { run: vi.fn().mockResolvedValue(makePipelineResult()), reset: vi.fn() }, missionEngineBridge: new ComputerUseMissionEngineBridge() });
    const result = await adapter.executeStep(makeStep());
    expect(result.metadata.systemApisCalled).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { ComputerUseMissionEngineBridge } from "./ComputerUseMissionEngineBridge";
import { ComputerUseExecutionResult, ComputerUsePipelineResult, ComputerUseVerificationResult } from "./types";

const makeExecution = (overrides: Partial<ComputerUseExecutionResult> = {}): ComputerUseExecutionResult => ({
  status: "executed",
  action: { type: "click", reason: "x", requiresGuardApproval: false },
  metadata: { delegatesOnly: true, noDirectSystemCalls: true, systemApisCalled: false, executorKind: "scaffold" },
  ...overrides,
});

const makeVerification = (overrides: Partial<ComputerUseVerificationResult> = {}): ComputerUseVerificationResult => ({
  status: "passed",
  followUpObservationRequired: false,
  reason: "ok",
  metadata: { verifierKind: "scaffold", systemApisCalled: false, screenshotsCaptured: false },
  ...overrides,
});

const makePipelineResult = (
  executionResults: ComputerUseExecutionResult[],
  verificationResults: ComputerUseVerificationResult[],
): ComputerUsePipelineResult => ({
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
  executionResults,
  verificationResults,
  recoveryPlan: { strategy: "none", requiresGuardApprovalRequest: false, shouldEscalateToUser: false, reason: "none", metadata: { recoveryKind: "scaffold", noRollbackPerformed: true, noSystemActionsPerformed: true } },
  metadata: { pipelineKind: "scaffold", systemApisCalled: false },
});

describe("ComputerUseMissionEngineBridge", () => {
  it("identifies computer_use step", () => {
    const bridge = new ComputerUseMissionEngineBridge();
    expect(bridge.isComputerUseStep({ kind: "computer_use" })).toBe(true);
  });

  it("rejects non-computer step", () => {
    const bridge = new ComputerUseMissionEngineBridge();
    expect(bridge.isComputerUseStep({ kind: "other" })).toBe(false);
  });

  it("failed execution maps to failed step result", () => {
    const bridge = new ComputerUseMissionEngineBridge();
    const result = bridge.fromPipelineResult(makePipelineResult([makeExecution({ status: "failed" })], [makeVerification({ status: "failed" })]));
    expect(result.status).toBe("failed");
  });

  it("executed + passed verification maps to completed step result", () => {
    const bridge = new ComputerUseMissionEngineBridge();
    const result = bridge.fromPipelineResult(makePipelineResult([makeExecution({ status: "executed" })], [makeVerification({ status: "passed" })]));
    expect(result.status).toBe("completed");
  });

  it("skipped observe + inconclusive maps to inconclusive", () => {
    const bridge = new ComputerUseMissionEngineBridge();
    const result = bridge.fromPipelineResult(
      makePipelineResult([makeExecution({ status: "skipped", action: { type: "observe", reason: "observe", requiresGuardApproval: false } })], [makeVerification({ status: "inconclusive" })]),
    );
    expect(result.status).toBe("inconclusive");
  });

  it("second execution result failed causes mission step failed", () => {
    const bridge = new ComputerUseMissionEngineBridge();
    const result = bridge.fromPipelineResult(
      makePipelineResult(
        [makeExecution({ status: "executed" }), makeExecution({ status: "failed" })],
        [makeVerification({ status: "passed" }), makeVerification({ status: "passed" })],
      ),
    );
    expect(result.status).toBe("failed");
  });

  it("mixed verification results cause inconclusive unless failed execution exists", () => {
    const bridge = new ComputerUseMissionEngineBridge();
    const result = bridge.fromPipelineResult(
      makePipelineResult(
        [makeExecution({ status: "executed" }), makeExecution({ status: "executed" })],
        [makeVerification({ status: "passed" }), makeVerification({ status: "inconclusive" })],
      ),
    );
    expect(result.status).toBe("inconclusive");
  });

  it("metadata missionEngineImported false", () => {
    const bridge = new ComputerUseMissionEngineBridge();
    const pipelineResult = makePipelineResult([makeExecution({ status: "executed" })], [makeVerification({ status: "passed" })]);
    const result = bridge.toMissionStepResult({ missionStep: { missionId: "m1", stepId: "s1", kind: "computer_use" }, pipelineResult });
    expect(result.metadata.missionEngineImported).toBe(false);
  });
});

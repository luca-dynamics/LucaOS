import { describe, expect, it } from "vitest";
import { ComputerUseMissionTapeBridge } from "./ComputerUseMissionTapeBridge";
import {
  ComputerUseActionPlan,
  ComputerUseExecutionResult,
  ComputerUseFocusContext,
  ComputerUseRecoveryPlan,
  ComputerUseVerificationResult,
} from "./types";

const missionId = "mission-123";

const focusContext: ComputerUseFocusContext = {
  executionMode: "sandbox",
  riskLevel: "safe",
  trustTier: "trusted",
  requiresGuardApproval: false,
  prefersSandbox: true,
  focusSignals: [],
  metadata: {
    contextOnly: true,
    actionsEnabled: false,
    systemApisEnabled: false,
  },
};

const actionPlan: ComputerUseActionPlan = {
  actions: [{ type: "click", reason: "do click", requiresGuardApproval: false }],
  requiresGuardApproval: false,
  prefersSandbox: true,
  metadata: {
    planningOnly: true,
    actionsExecuted: false,
    systemApisUsed: false,
  },
};

const executionResult: ComputerUseExecutionResult = {
  status: "executed",
  action: { type: "click", reason: "done", requiresGuardApproval: false },
  metadata: {
    delegatesOnly: true,
    noDirectSystemCalls: true,
    systemApisCalled: false,
    executorKind: "scaffold",
  },
};

const verificationResult: ComputerUseVerificationResult = {
  status: "passed",
  followUpObservationRequired: false,
  reason: "looks good",
  metadata: {
    verifierKind: "scaffold",
    systemApisCalled: false,
    screenshotsCaptured: false,
  },
};

const recoveryPlan: ComputerUseRecoveryPlan = {
  strategy: "none",
  requiresGuardApprovalRequest: false,
  shouldEscalateToUser: false,
  reason: "none",
  metadata: {
    recoveryKind: "scaffold",
    noRollbackPerformed: true,
    noSystemActionsPerformed: true,
  },
};

describe("ComputerUseMissionTapeBridge", () => {
  it("records focus context event", () => {
    const bridge = new ComputerUseMissionTapeBridge();

    const event = bridge.recordFocusContext(missionId, focusContext);

    expect(event.eventType).toBe("focus_context");
    expect(event.payload).toEqual(focusContext);
  });

  it("records action plan event", () => {
    const bridge = new ComputerUseMissionTapeBridge({ redactSensitiveText: false });

    const event = bridge.recordActionPlan(missionId, actionPlan);

    expect(event.eventType).toBe("action_plan");
    expect(event.payload).toEqual(actionPlan);
  });

  it("records execution result event", () => {
    const bridge = new ComputerUseMissionTapeBridge();

    const event = bridge.recordExecutionResult(missionId, executionResult);

    expect(event.eventType).toBe("execution_result");
    expect(event.payload).toEqual(executionResult);
  });

  it("type_text payload is redacted by default", () => {
    const bridge = new ComputerUseMissionTapeBridge();

    const event = bridge.recordExecutionResult(missionId, {
      ...executionResult,
      action: { type: "type_text", text: "secret", reason: "type", requiresGuardApproval: false },
    });

    expect((event.payload as ComputerUseExecutionResult).action.text).toBe("[REDACTED]");
  });

  it("redaction can be disabled by option", () => {
    const bridge = new ComputerUseMissionTapeBridge({ redactSensitiveText: false });

    const event = bridge.recordExecutionResult(missionId, {
      ...executionResult,
      action: { type: "type_text", text: "secret", reason: "type", requiresGuardApproval: false },
    });

    expect((event.payload as ComputerUseExecutionResult).action.text).toBe("secret");
  });

  it("records verification result event", () => {
    const bridge = new ComputerUseMissionTapeBridge();

    const event = bridge.recordVerificationResult(missionId, verificationResult);

    expect(event.eventType).toBe("verification_result");
    expect(event.payload).toEqual(verificationResult);
  });

  it("records recovery plan event", () => {
    const bridge = new ComputerUseMissionTapeBridge();

    const event = bridge.recordRecoveryPlan(missionId, recoveryPlan);

    expect(event.eventType).toBe("recovery_plan");
    expect(event.payload).toEqual(recoveryPlan);
  });

  it("createTapeRecord returns all events for missionId", () => {
    const bridge = new ComputerUseMissionTapeBridge();
    bridge.recordFocusContext(missionId, focusContext);
    bridge.recordActionPlan(missionId, actionPlan);
    bridge.recordFocusContext("other", focusContext);

    const record = bridge.createTapeRecord(missionId);

    expect(record.missionId).toBe(missionId);
    expect(record.events).toHaveLength(2);
    expect(record.events.every((event) => event.missionId === missionId)).toBe(true);
  });

  it("reset clears in-memory events", () => {
    const bridge = new ComputerUseMissionTapeBridge();
    bridge.recordFocusContext(missionId, focusContext);

    bridge.reset();

    expect(bridge.listEvents()).toEqual([]);
  });

  it("metadata says storageWritesEnabled false", () => {
    const bridge = new ComputerUseMissionTapeBridge();

    const record = bridge.createTapeRecord(missionId);

    expect(record.metadata.storageWritesEnabled).toBe(false);
  });

  it("metadata says missionTapeIntegrationEnabled false", () => {
    const bridge = new ComputerUseMissionTapeBridge();

    const record = bridge.createTapeRecord(missionId);

    expect(record.metadata.missionTapeIntegrationEnabled).toBe(false);
  });
});

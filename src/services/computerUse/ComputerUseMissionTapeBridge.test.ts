import { describe, expect, it } from "vitest";
import { ComputerUseMissionTapeBridge } from "./ComputerUseMissionTapeBridge";
import {
  ComputerUseActionPlan,
  ComputerUseExecutionResult,
  ComputerUseFocusContext,
  ComputerUseRecoveryPlan,
  ComputerUseVerificationResult,
} from "./types";

const missionId = "mission-1";
const now = () => "2026-05-25T00:00:00.000Z";

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
  actions: [{ type: "type_text", text: "secret", reason: "fill", requiresGuardApproval: false }],
  requiresGuardApproval: false,
  prefersSandbox: true,
  metadata: { planningOnly: true, actionsExecuted: false, systemApisUsed: false },
};

const executionResult: ComputerUseExecutionResult = {
  status: "executed",
  action: { type: "type_text", text: "secret", reason: "fill", requiresGuardApproval: false },
  metadata: {
    systemApisCalled: false,
    delegatesOnly: true,
    noDirectSystemCalls: true,
    executorKind: "scaffold",
  },
};

const verificationResult: ComputerUseVerificationResult = {
  status: "passed",
  followUpObservationRequired: false,
  reason: "ok",
  metadata: { verifierKind: "scaffold", systemApisCalled: false, screenshotsCaptured: false },
};

const recoveryPlan: ComputerUseRecoveryPlan = {
  strategy: "none",
  requiresGuardApprovalRequest: false,
  shouldEscalateToUser: false,
  reason: "none",
  metadata: { recoveryKind: "scaffold", noRollbackPerformed: true, noSystemActionsPerformed: true },
};

describe("ComputerUseMissionTapeBridge", () => {
  it("records focus context event", () => {
    const bridge = new ComputerUseMissionTapeBridge({ now });
    const event = bridge.recordFocusContext(missionId, focusContext);
    expect(event.eventType).toBe("focus_context");
  });

  it("records action plan event", () => {
    const bridge = new ComputerUseMissionTapeBridge({ now });
    const event = bridge.recordActionPlan(missionId, actionPlan);
    expect(event.eventType).toBe("action_plan");
  });

  it("records execution result event", () => {
    const bridge = new ComputerUseMissionTapeBridge({ now });
    const event = bridge.recordExecutionResult(missionId, executionResult);
    expect(event.eventType).toBe("execution_result");
  });

  it("type_text payload is redacted by default", () => {
    const bridge = new ComputerUseMissionTapeBridge({ now });
    const event = bridge.recordExecutionResult(missionId, executionResult);
    expect((event.payload as ComputerUseExecutionResult).action.text).toBe("[REDACTED]");
  });

  it("redaction can be disabled by option", () => {
    const bridge = new ComputerUseMissionTapeBridge({ now, redactSensitiveText: false });
    const event = bridge.recordExecutionResult(missionId, executionResult);
    expect((event.payload as ComputerUseExecutionResult).action.text).toBe("secret");
  });

  it("records verification result event", () => {
    const bridge = new ComputerUseMissionTapeBridge({ now });
    const event = bridge.recordVerificationResult(missionId, verificationResult);
    expect(event.eventType).toBe("verification_result");
  });

  it("records recovery plan event", () => {
    const bridge = new ComputerUseMissionTapeBridge({ now });
    const event = bridge.recordRecoveryPlan(missionId, recoveryPlan);
    expect(event.eventType).toBe("recovery_plan");
  });

  it("createTapeRecord returns all events for missionId", () => {
    const bridge = new ComputerUseMissionTapeBridge({ now });
    bridge.recordFocusContext(missionId, focusContext);
    bridge.recordActionPlan(missionId, actionPlan);
    bridge.recordFocusContext("mission-2", focusContext);

    const tapeRecord = bridge.createTapeRecord(missionId);
    expect(tapeRecord.events).toHaveLength(2);
    expect(tapeRecord.missionId).toBe(missionId);
  });

  it("reset clears in-memory events", () => {
    const bridge = new ComputerUseMissionTapeBridge({ now });
    bridge.recordFocusContext(missionId, focusContext);
    bridge.reset();
    expect(bridge.listEvents()).toHaveLength(0);
  });

  it("metadata says storageWritesEnabled false", () => {
    const bridge = new ComputerUseMissionTapeBridge({ now });
    const event = bridge.recordFocusContext(missionId, focusContext);
    expect(event.metadata.storageWritesEnabled).toBe(false);
  });
});

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
const focusContext: ComputerUseFocusContext = {
  executionMode: "sandbox",
  riskLevel: "safe",
  trustTier: "verified",
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
  actions: [{ type: "type_text", text: "secret", reason: "enter text", requiresGuardApproval: false }],
  requiresGuardApproval: false,
  prefersSandbox: true,
  metadata: { planningOnly: true, actionsExecuted: false, systemApisUsed: false },
};

const executionResult: ComputerUseExecutionResult = {
  status: "executed",
  action: { type: "type_text", text: "secret", reason: "enter text", requiresGuardApproval: false },
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
    const bridge = new ComputerUseMissionTapeBridge({ now: () => "2026-01-01T00:00:00.000Z" });
    const event = bridge.recordFocusContext(missionId, focusContext);

    expect(event.eventType).toBe("focus_context");
    expect(event.missionId).toBe(missionId);
  });

  it("records action plan event", () => {
    const bridge = new ComputerUseMissionTapeBridge();
    const event = bridge.recordActionPlan(missionId, actionPlan);

    expect(event.eventType).toBe("action_plan");
  });

  it("records execution result event", () => {
    const bridge = new ComputerUseMissionTapeBridge();
    const event = bridge.recordExecutionResult(missionId, executionResult);

    expect(event.eventType).toBe("execution_result");
  });

  it("type_text payload is redacted by default", () => {
    const bridge = new ComputerUseMissionTapeBridge();
    const planEvent = bridge.recordActionPlan(missionId, actionPlan);
    const execEvent = bridge.recordExecutionResult(missionId, executionResult);

    expect((planEvent.payload as ComputerUseActionPlan).actions[0]?.text).toBe("[REDACTED]");
    expect((execEvent.payload as ComputerUseExecutionResult).action.text).toBe("[REDACTED]");
  });

  it("redaction can be disabled by option", () => {
    const bridge = new ComputerUseMissionTapeBridge({ redactSensitiveText: false });
    const event = bridge.recordExecutionResult(missionId, executionResult);

    expect((event.payload as ComputerUseExecutionResult).action.text).toBe("secret");
  });

  it("records verification result event", () => {
    const bridge = new ComputerUseMissionTapeBridge();
    const event = bridge.recordVerificationResult(missionId, verificationResult);

    expect(event.eventType).toBe("verification_result");
  });

  it("records recovery plan event", () => {
    const bridge = new ComputerUseMissionTapeBridge();
    const event = bridge.recordRecoveryPlan(missionId, recoveryPlan);

    expect(event.eventType).toBe("recovery_plan");
  });

  it("createTapeRecord returns all events for missionId", () => {
    const bridge = new ComputerUseMissionTapeBridge();
    bridge.recordFocusContext(missionId, focusContext);
    bridge.recordRecoveryPlan("mission-2", recoveryPlan);
    bridge.recordExecutionResult(missionId, executionResult);

    const record = bridge.createTapeRecord(missionId);

    expect(record.events).toHaveLength(2);
    expect(record.events.every((event) => event.missionId === missionId)).toBe(true);
  });

  it("reset clears in-memory events", () => {
    const bridge = new ComputerUseMissionTapeBridge();
    bridge.recordFocusContext(missionId, focusContext);

    bridge.reset();

    expect(bridge.listEvents()).toHaveLength(0);
  });

  it("metadata says storageWritesEnabled false", () => {
    const bridge = new ComputerUseMissionTapeBridge();
    const event = bridge.recordFocusContext(missionId, focusContext);

    expect(event.metadata.storageWritesEnabled).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { ComputerUseInMemoryMissionTapeSink } from "./ComputerUseInMemoryMissionTapeSink";
import { ComputerUseRuntimeEventBridge } from "./ComputerUseRuntimeEventBridge";

describe("ComputerUseRuntimeEventBridge", () => {
  it("records started/completed/rejected events", () => {
    const bridge = new ComputerUseRuntimeEventBridge({ tapeSink: new ComputerUseInMemoryMissionTapeSink(), now: () => "now" });
    bridge.recordDispatchStarted({ missionId: "m1", stepId: "s1", kind: "computer_use" });
    bridge.recordIntegrationResult({ ok: true, step: { missionId: "m1", stepId: "s1", kind: "computer_use" }, reason: "ok", metadata: { integrationKind: "scaffold", systemApisCalled: false, missionEngineImported: false, requiresExplicitOptIn: true } });
    bridge.recordIntegrationResult({ ok: false, step: { missionId: "m1", stepId: "s2", kind: "computer_use" }, reason: "no", metadata: { integrationKind: "scaffold", systemApisCalled: false, missionEngineImported: false, requiresExplicitOptIn: true } });
    expect(bridge.getSnapshot("m1").records.map((x) => x.eventType)).toEqual([
      "computer_use_dispatch_started",
      "computer_use_dispatch_completed",
      "computer_use_dispatch_rejected",
    ]);
  });

  it("records browser adapter started/completed and redacts sensitive text", () => {
    const bridge = new ComputerUseRuntimeEventBridge({ tapeSink: new ComputerUseInMemoryMissionTapeSink() });
    bridge.recordBrowserAdapterStarted({ missionId: "m2", stepId: "s22", traceId: "t22", source: "mission", lane: "sandbox_browser", actionType: "type_text", reason: "text payload" });
    bridge.recordBrowserAdapterResult(
      {
        status: "executed",
        metadata: {
          reason: "simulated type_text",
          adapterKind: "scaffold",
          delegatedToBrowserRuntime: false,
          simulated: true,
          browserRuntimeImported: false,
          playwrightCalled: false,
          browserApisCalled: false,
          systemApisCalled: false,
          requiresExplicitOptIn: true,
        },
      },
      { lane: "sandbox_browser", action: { type: "type_text", reason: "secret text", requiresGuardApproval: false }, context: { missionId: "m2", stepId: "s22", traceId: "t22", source: "mission" } },
    );
    const records = bridge.getSnapshot().records;
    expect(records.map((x) => x.eventType)).toEqual(["computer_use_browser_adapter_started", "computer_use_browser_adapter_completed"]);
    expect(records[0].payload.reason).toBe("[REDACTED]");
    expect(records[1].missionId).toBe("m2");
    expect(records[1].payload.stepId).toBe("s22");
    expect(records[1].payload.traceId).toBe("t22");
    expect(records[1].payload.source).toBe("mission");
  });

  it("records browser adapter rejected and failed", () => {
    const bridge = new ComputerUseRuntimeEventBridge({ tapeSink: new ComputerUseInMemoryMissionTapeSink() });
    bridge.recordBrowserAdapterResult({ status: "failed", metadata: { reason: "requires explicit opt-in", adapterKind: "scaffold", delegatedToBrowserRuntime: false, simulated: true, browserRuntimeImported: false, playwrightCalled: false, browserApisCalled: false, systemApisCalled: false, requiresExplicitOptIn: true } });
    bridge.recordBrowserAdapterResult({ status: "failed", metadata: { reason: "unexpected adapter failure", adapterKind: "scaffold", delegatedToBrowserRuntime: false, simulated: true, browserRuntimeImported: false, playwrightCalled: false, browserApisCalled: false, systemApisCalled: false, requiresExplicitOptIn: true } });
    const records = bridge.getSnapshot().records;
    expect(records.map((x) => x.eventType)).toEqual([
      "computer_use_browser_adapter_rejected",
      "computer_use_browser_adapter_failed",
    ]);
    expect(records[0].missionId).toBe("unknown");
  });

  it("records guard decision generic and status-specific events", () => {
    const bridge = new ComputerUseRuntimeEventBridge({ tapeSink: new ComputerUseInMemoryMissionTapeSink() });
    bridge.recordGuardDecision({
      missionId: "m-guard",
      stepId: "s-guard",
      actionType: "click",
      riskLevel: "high",
      status: "allowed",
      reason: "Approved by policy",
      confirmationRequired: false,
      approvalRequirement: "none",
      approvedBy: "policy",
      guardPolicyKind: "scaffold",
    });
    const records = bridge.getSnapshot("m-guard").records;
    expect(records.map((x) => x.eventType)).toEqual(["computer_use_guard_decision", "computer_use_guard_allowed"]);
    expect(records[0].payload.stepId).toBe("s-guard");
    expect(records[0].payload.actionType).toBe("click");
    expect(records[0].payload.riskLevel).toBe("high");
    expect(records[0].payload.status).toBe("allowed");
    expect(records[0].payload.systemApisCalled).toBe(false);
    expect(records[0].payload.directHostAllowed).toBe(false);
  });

  it("guard decision falls back missionId to unknown and captures denied/needs_confirmation", () => {
    const bridge = new ComputerUseRuntimeEventBridge({ tapeSink: new ComputerUseInMemoryMissionTapeSink() });
    bridge.recordGuardDecision({
      status: "denied",
      riskLevel: "critical",
      reason: "Blocked by policy",
      confirmationRequired: false,
      approvalRequirement: "guard_approval",
      guardPolicyKind: "scaffold",
    });
    bridge.recordGuardDecision({
      status: "needs_confirmation",
      riskLevel: "medium",
      reason: "Needs approval",
      confirmationRequired: true,
      approvalRequirement: "user_confirmation_required",
      guardPolicyKind: "scaffold",
    });
    const records = bridge.getSnapshot().records;
    expect(records.map((x) => x.eventType)).toEqual([
      "computer_use_guard_decision",
      "computer_use_guard_denied",
      "computer_use_guard_decision",
      "computer_use_guard_needs_confirmation",
    ]);
    expect(records[0].missionId).toBe("unknown");
  });
});

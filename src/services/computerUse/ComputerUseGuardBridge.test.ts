import { describe, expect, it } from "vitest";
import { ComputerUseGuardBridge } from "./ComputerUseGuardBridge";

describe("ComputerUseGuardBridge", () => {
  it("observe action allowed", () => {
    const bridge = new ComputerUseGuardBridge();
    const decision = bridge.evaluateAction({
      action: { type: "observe", reason: "scan", requiresGuardApproval: false },
    });
    expect(decision.status).toBe("allowed");
  });

  it("click/type_text require confirmation by default", () => {
    const bridge = new ComputerUseGuardBridge();
    const clickDecision = bridge.evaluateAction({
      action: { type: "click", reason: "delete", requiresGuardApproval: false },
      dangerousContext: true,
      request: { guardApprovalProvided: false },
    });
    const typeDecision = bridge.evaluateAction({
      action: { type: "type_text", reason: "fill form", requiresGuardApproval: false },
      request: { guardApprovalProvided: false },
    });
    expect(clickDecision.status).toBe("needs_confirmation");
    expect(typeDecision.status).toBe("needs_confirmation");
  });

  it("click/type_text allowed with explicit approval context", () => {
    const bridge = new ComputerUseGuardBridge();
    const decision = bridge.evaluateAction({
      action: { type: "click", reason: "save", requiresGuardApproval: true },
      request: { approval: { userConfirmed: true, approvedBy: "user", approvalReason: "confirmed in UI" } },
    });
    expect(decision.status).toBe("allowed");
  });

  it("explicit deny policy returns denied", () => {
    const bridge = new ComputerUseGuardBridge({ denyActions: ["click"] });
    const decision = bridge.evaluateAction({
      action: { type: "click", reason: "danger", requiresGuardApproval: false },
    });
    expect(decision.status).toBe("denied");
  });

  it("metadata preserves scaffold safety flags", () => {
    const bridge = new ComputerUseGuardBridge();
    const decision = bridge.evaluatePlan({
      plan: { actions: [], requiresGuardApproval: false },
    });
    expect(decision.metadata.externalGuardCalled).toBe(false);
    expect(decision.metadata.systemApisCalled).toBe(false);
    expect(decision.metadata.directHostAllowed).toBe(false);
    expect(decision.metadata.requiresExplicitOptIn).toBe(true);
  });

  it("dangerous context + observe-only plan is allowed", () => {
    const bridge = new ComputerUseGuardBridge();
    const decision = bridge.evaluatePlan({
      dangerousContext: true,
      request: { guardApprovalProvided: false },
      plan: {
        actions: [{ type: "observe", reason: "look first", requiresGuardApproval: true }],
        requiresGuardApproval: true,
      },
    });
    expect(decision.status).toBe("allowed");
  });

  it("hotkey/system-like actions are denied as critical risk", () => {
    const bridge = new ComputerUseGuardBridge();
    const decision = bridge.evaluateAction({
      action: { type: "hotkey", reason: "open terminal and delete file", requiresGuardApproval: false },
    });
    expect(decision.status).toBe("denied");
    expect(decision.metadata.riskLevel).toBe("critical");
  });
});

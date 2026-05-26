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

  it("dangerous non-observe without approval requires approval", () => {
    const bridge = new ComputerUseGuardBridge();
    const decision = bridge.evaluateAction({
      action: { type: "click", reason: "delete", requiresGuardApproval: false },
      dangerousContext: true,
      request: { guardApprovalProvided: false },
    });
    expect(decision.status).toBe("requires_approval");
  });

  it("non-observe with approval allowed", () => {
    const bridge = new ComputerUseGuardBridge();
    const decision = bridge.evaluateAction({
      action: { type: "click", reason: "save", requiresGuardApproval: true },
      request: { guardApprovalProvided: true },
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

  it("metadata externalGuardCalled false", () => {
    const bridge = new ComputerUseGuardBridge();
    const decision = bridge.evaluatePlan({
      plan: { actions: [], requiresGuardApproval: false },
    });
    expect(decision.metadata.externalGuardCalled).toBe(false);
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
});

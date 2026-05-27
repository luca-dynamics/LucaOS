import { describe, expect, it } from "vitest";
import { ComputerUseConfirmationUiBridge } from "./ComputerUseConfirmationUiBridge";
import { ComputerUseGuardConfirmationBridge } from "./ComputerUseGuardConfirmationBridge";

describe("ComputerUseConfirmationUiBridge", () => {
  it("lists/approves/rejects pending confirmations", () => {
    const guard = new ComputerUseGuardConfirmationBridge();
    const req = guard.createRequest({ decision: { status: "needs_confirmation", reason: "risk", metadata: { riskLevel: "high" } } as any })!;
    const bridge = new ComputerUseConfirmationUiBridge(guard);
    expect(bridge.listPendingConfirmations()).toHaveLength(1);
    bridge.approve(req.confirmationId);
    expect(bridge.getState().lastResult?.status).toBe("approved");
    const req2 = guard.createRequest({ decision: { status: "needs_confirmation", reason: "risk", metadata: { riskLevel: "high" } } as any })!;
    bridge.reject(req2.confirmationId);
    expect(bridge.getState().lastResult?.status).toBe("rejected");
  });
});

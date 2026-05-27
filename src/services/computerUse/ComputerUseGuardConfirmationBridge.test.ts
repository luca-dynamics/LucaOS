import { describe, expect, it } from "vitest";
import { ComputerUseGuardBridge } from "./ComputerUseGuardBridge";
import { ComputerUseGuardConfirmationBridge } from "./ComputerUseGuardConfirmationBridge";

describe("ComputerUseGuardConfirmationBridge", () => {
  it("creates pending confirmation for needs_confirmation decision", () => {
    const guard = new ComputerUseGuardBridge();
    const bridge = new ComputerUseGuardConfirmationBridge();
    const decision = guard.evaluateAction({
      action: { type: "click", reason: "confirm delete", requiresGuardApproval: true },
      request: { missionId: "m1", stepId: "s1", guardApprovalProvided: false },
    });

    const request = bridge.createRequest({ decision });
    expect(request?.status).toBe("pending");
    expect(request?.missionId).toBe("m1");
    expect(request?.metadata.storageWritesEnabled).toBe(false);
  });

  it("approve returns approval context with userConfirmed true", () => {
    const bridge = new ComputerUseGuardConfirmationBridge({ requiredPhrase: "APPROVE", enforceRequiredPhrase: true });
    const request = bridge.createRequest({
      decision: new ComputerUseGuardBridge().needsConfirmation("need", { request: { missionId: "m1" } }, "high"),
    });
    const result = bridge.approve(request!.confirmationId, { phrase: "APPROVE" });
    expect(result.ok).toBe(true);
    expect(result.approval?.userConfirmed).toBe(true);
  });

  it("reject returns rejected status", () => {
    const bridge = new ComputerUseGuardConfirmationBridge();
    const request = bridge.createRequest({ decision: new ComputerUseGuardBridge().needsConfirmation("need", {}, "medium") });
    const result = bridge.reject(request!.confirmationId, "nope");
    expect(result.ok).toBe(true);
    expect(result.status).toBe("rejected");
  });

  it("required phrase mismatch fails", () => {
    const bridge = new ComputerUseGuardConfirmationBridge({ requiredPhrase: "ALLOW", enforceRequiredPhrase: true });
    const request = bridge.createRequest({ decision: new ComputerUseGuardBridge().needsConfirmation("need", {}, "medium") });
    const result = bridge.approve(request!.confirmationId, { phrase: "DENY" });
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("mismatch");
  });

  it("expired confirmation cannot approve", () => {
    let currentNow = "2026-01-01T00:00:00.000Z";
    const bridge = new ComputerUseGuardConfirmationBridge({ now: () => currentNow, defaultExpiresInMs: 1 });
    const request = bridge.createRequest({ decision: new ComputerUseGuardBridge().needsConfirmation("need", {}, "high") });
    currentNow = "2026-01-01T00:00:02.000Z";
    const result = bridge.approve(request!.confirmationId);
    expect(result.status).toBe("expired");
  });

  it("snapshot filters by missionId and reset clears pending", () => {
    const bridge = new ComputerUseGuardConfirmationBridge();
    bridge.createRequest({ decision: new ComputerUseGuardBridge().needsConfirmation("need", { request: { missionId: "m1" } }, "high") });
    bridge.createRequest({ decision: new ComputerUseGuardBridge().needsConfirmation("need", { request: { missionId: "m2" } }, "high") });
    expect(bridge.getSnapshot("m1").requests).toHaveLength(1);
    bridge.reset();
    expect(bridge.getSnapshot().requests).toHaveLength(0);
  });
});

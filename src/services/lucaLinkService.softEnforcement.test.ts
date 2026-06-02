import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("socket.io-client", () => ({
  io: vi.fn(),
}));

import { lucaLink } from "./lucaLinkService";

describe("LucaLinkService soft enforcement controls", () => {
  afterEach(() => {
    lucaLink.disableSoftEnforcement();
    lucaLink.clearApprovalQueue();
    (lucaLink as any).socket = null;
    (lucaLink as any).state = {
      connected: false,
      deviceId: null,
      pairingToken: null,
      connectedDevices: [],
      error: null,
    };
  });

  it("keeps soft enforcement disabled by default and restores disabled mode", () => {
    expect(lucaLink.getSoftEnforcementMode()).toBe("disabled");

    lucaLink.enableSoftEnforcement({ mode: "high-risk-only" });
    expect(lucaLink.getSoftEnforcementMode()).toBe("high-risk-only");

    lucaLink.disableSoftEnforcement();
    expect(lucaLink.getSoftEnforcementMode()).toBe("disabled");
  });

  it("uses observe-only for no-argument enable so blocking is not activated accidentally", () => {
    lucaLink.enableSoftEnforcement();

    expect(lucaLink.getSoftEnforcementMode()).toBe("observe-only");
    const result = lucaLink.evaluateRuntimeEventForSoftEnforcement({
      eventName: "message",
      payload: {
        type: "tool-request",
        source: "exec-1",
        target: "primary",
        payload: { kind: "tool-request", permission: "shell.execute" },
      },
    });

    expect(result.decision).toBe("observe-only");
    expect(result.blocked).toBe(false);
  });

  it("keeps explicit observe-only non-blocking for outbound send-like evaluations", () => {
    lucaLink.enableSoftEnforcement({ mode: "observe-only" });

    const result = lucaLink.evaluateRuntimeEventForSoftEnforcement({
      eventName: "message",
      payload: {
        type: "tool-request",
        source: "exec-1",
        target: "primary",
        payload: { kind: "tool-request", permission: "files.write" },
      },
    });

    expect(lucaLink.getSoftEnforcementMode()).toBe("observe-only");
    expect(result.blocked).toBe(false);
    expect(result.explain).toContain("no runtime block");
  });

  it("requires explicit high-risk-only mode for blocking-capable dangerous outbound evaluations", () => {
    lucaLink.enableSoftEnforcement({ mode: "high-risk-only" });

    const sendLike = lucaLink.evaluateRuntimeEventForSoftEnforcement({
      eventName: "message",
      payload: {
        type: "tool-request",
        source: "exec-1",
        target: "primary",
        payload: { kind: "tool-request", permission: "shell.execute" },
      },
    });
    const beamLike = lucaLink.evaluateRuntimeEventForSoftEnforcement({
      eventName: "message",
      payload: {
        type: "tool-request",
        source: "body-1",
        target: "primary",
        payload: { kind: "tool-request", permission: "robotics.motion" },
      },
    });

    expect(lucaLink.getSoftEnforcementMode()).toBe("high-risk-only");
    expect(sendLike.blocked).toBe(true);
    expect(beamLike.blocked).toBe(true);
  });

  it("exposes approval queue helpers without affecting disabled soft enforcement", () => {
    expect(lucaLink.getPendingApprovalRequests()).toEqual([]);
    expect(lucaLink.getApprovalQueueSummary().pending).toBe(0);

    const result = lucaLink.evaluateRuntimeEventForSoftEnforcement({
      eventName: "message",
      payload: {
        type: "tool-request",
        source: "exec-1",
        target: "primary",
        payload: { kind: "tool-request", permission: "shell.execute" },
      },
    });

    expect(result.decision).toBe("allow");
    expect(lucaLink.getApprovalRequests()).toHaveLength(0);
  });

  it("queues high-risk send approval requests only when soft enforcement is enabled", () => {
    const emit = vi.fn();
    (lucaLink as any).socket = { emit };
    (lucaLink as any).state = {
      connected: true,
      deviceId: "exec-1",
      pairingToken: null,
      connectedDevices: [],
      error: null,
    };

    lucaLink.enableSoftEnforcement({ mode: "high-risk-only" });
    const sent = lucaLink.send("primary", "tool-request", {
      kind: "tool-request",
      permission: "shell.execute",
    });

    expect(sent).toBe(false);
    expect(emit).not.toHaveBeenCalled();
    expect(lucaLink.getPendingApprovalRequests()).toHaveLength(1);
    expect(lucaLink.getPendingApprovalRequests()[0].title).toBe(
      "Approve shell execution?",
    );
  });

  it("queue approval decisions update service queue state", () => {
    lucaLink.enableSoftEnforcement({ mode: "high-risk-only" });
    const result = lucaLink.evaluateRuntimeEventForSoftEnforcement({
      eventName: "message",
      payload: {
        type: "tool-request",
        source: "exec-1",
        target: "primary",
        payload: { kind: "tool-request", permission: "files.write" },
      },
    });

    lucaLink.queueApprovalForSoftEnforcementResult(result, {
      requestedByDeviceId: "exec-1",
      requestedTargetDeviceId: "primary",
      payload: { kind: "tool-request", permission: "files.write" },
    });

    const request = lucaLink.getPendingApprovalRequests()[0];
    expect(request.title).toBe("Approve file write?");
    expect(lucaLink.approveApprovalRequest(request.id).request?.status).toBe(
      "approved",
    );
    expect(lucaLink.getPendingApprovalRequests()).toHaveLength(0);
  });
});

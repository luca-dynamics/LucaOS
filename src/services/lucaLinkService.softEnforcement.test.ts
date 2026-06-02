import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("socket.io-client", () => ({
  io: vi.fn(),
}));

import { lucaLink } from "./lucaLinkService";
import {
  createLucaLinkContinuationToken,
  registerLucaLinkContinuation,
} from "./lucaLink/lucaLinkContinuation";

describe("LucaLinkService soft enforcement controls", () => {
  afterEach(() => {
    lucaLink.disableSoftEnforcement();
    lucaLink.disableRuntimeEnforcement();
    lucaLink.clearRuntimeEnforcementAudit();
    lucaLink.clearApprovalQueue();
    lucaLink.clearContinuationRegistry();
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

  it("exposes continuation helpers without retrying, sending, or emitting actions", () => {
    const emit = vi.fn();
    (lucaLink as any).socket = { emit };
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

    const pending = lucaLink.getPendingApprovalRequests()[0];
    expect(
      lucaLink.createContinuationFromApprovalRequest(pending.id).created,
    ).toBeUndefined();

    lucaLink.approveApprovalRequest(pending.id, {
      decidedByDeviceId: "primary",
    });
    const created = lucaLink.createContinuationFromApprovalRequest(pending.id);
    expect(created.created).toBe(true);
    expect(created.token?.replayMode).toBe("manual-retry-only");
    expect(lucaLink.getContinuationTokens()).toHaveLength(1);
    expect(lucaLink.getContinuationRegistrySummary().valid).toBe(1);

    const consumed = lucaLink.consumeContinuationToken(created.token!.id, {
      consumedByDeviceId: "primary",
    });
    expect(consumed.consumed).toBe(true);
    expect(lucaLink.getContinuationRegistrySummary().consumed).toBe(1);
    expect(emit).not.toHaveBeenCalled();
  });

  it("exposes controlled continuation bridge helpers without transport side effects", () => {
    const emit = vi.fn();
    const sendSpy = vi.spyOn(lucaLink, "send");
    const beamSpy = vi.spyOn(lucaLink, "beamPacket");
    (lucaLink as any).socket = { emit };

    const token = createLucaLinkContinuationToken(
      {
        id: "service-safe-notification",
        source: "approval-queue",
        permission: "notification.send",
        lane: "notification",
        risk: "low",
        replayMode: "single-use-replayable",
        status: "validated",
        requestedByDeviceId: "device-a",
        requestedTargetDeviceId: "primary-host",
        title: "Safe notification",
        summary: "Primary Host approved notification record.",
      },
      { now: 1_700_000_000_000 },
    );
    registerLucaLinkContinuation((lucaLink as any).continuationRegistry, token);

    const evaluated = lucaLink.evaluateContinuationBridge(token.id, {
      requestedByDeviceId: "device-a",
      requestedTargetDeviceId: "primary-host",
      permission: "notification.send",
      now: 1_700_000_000_000,
    });
    const prepared = lucaLink.prepareSafeContinuation(token.id, {
      requestedByDeviceId: "device-a",
      requestedTargetDeviceId: "primary-host",
      permission: "notification.send",
      now: 1_700_000_000_000,
    });
    const consumed = lucaLink.consumePreparedContinuation(token.id, {
      requestedByDeviceId: "device-a",
      requestedTargetDeviceId: "primary-host",
      permission: "notification.send",
      now: 1_700_000_000_001,
      consumedByDeviceId: "primary-host",
    });

    expect(evaluated.decision).toBe("can-prepare-safe-continuation");
    expect(prepared.preparedAction?.safeToAutoContinue).toBe(true);
    expect(consumed.consumed).toBe(true);
    expect(lucaLink.getContinuationTokens()[0].status).toBe("consumed");
    expect(sendSpy).not.toHaveBeenCalled();
    expect(beamSpy).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();

    sendSpy.mockRestore();
    beamSpy.mockRestore();
  });

  it("service bridge helpers refuse manual retry and fresh confirmation tokens", () => {
    const manual = createLucaLinkContinuationToken(
      {
        id: "service-shell",
        permission: "shell.execute",
        risk: "high",
        replayMode: "manual-retry-only",
        status: "validated",
      },
      { now: 1_700_000_000_000 },
    );
    const fresh = createLucaLinkContinuationToken(
      {
        id: "service-payment",
        permission: "payment.spend",
        risk: "critical",
        replayMode: "single-use-replayable",
        status: "validated",
      },
      { now: 1_700_000_000_000 },
    );
    registerLucaLinkContinuation((lucaLink as any).continuationRegistry, manual);
    registerLucaLinkContinuation((lucaLink as any).continuationRegistry, fresh);

    expect(lucaLink.prepareSafeContinuation(manual.id).decision).toBe(
      "requires-manual-retry",
    );
    expect(lucaLink.prepareSafeContinuation(fresh.id).decision).toBe(
      "requires-fresh-confirmation",
    );
    expect(
      lucaLink.prepareSafeContinuation(manual.id).preparedAction,
    ).toBeUndefined();
    expect(lucaLink.prepareSafeContinuation(fresh.id).preparedAction).toBeUndefined();
  });

  it("does not create continuations for pending approvals through service helpers", () => {
    lucaLink.enableSoftEnforcement({ mode: "high-risk-only" });
    const result = lucaLink.evaluateRuntimeEventForSoftEnforcement({
      eventName: "message",
      payload: {
        type: "tool-request",
        source: "exec-1",
        target: "primary",
        payload: { kind: "tool-request", permission: "shell.execute" },
      },
    });
    lucaLink.queueApprovalForSoftEnforcementResult(result, {
      requestedByDeviceId: "exec-1",
      requestedTargetDeviceId: "primary",
    });

    const pending = lucaLink.getPendingApprovalRequests()[0];
    const continuation = lucaLink.createContinuationFromApprovalRequest(
      pending.id,
    );
    expect(continuation.created).toBeUndefined();
    expect(continuation.warnings[0]).toContain("not eligible");
    expect(lucaLink.getContinuationTokens()).toHaveLength(0);
  });
});

describe("LucaLinkService full runtime enforcement controls", () => {
  afterEach(() => {
    lucaLink.disableRuntimeEnforcement();
    lucaLink.clearRuntimeEnforcementAudit();
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

  it("defaults disabled and no-argument enable is observe-only", () => {
    expect(lucaLink.getRuntimeEnforcementMode()).toBe("disabled");

    lucaLink.enableRuntimeEnforcement();

    expect(lucaLink.getRuntimeEnforcementMode()).toBe("observe-only");
    lucaLink.disableRuntimeEnforcement();
    expect(lucaLink.getRuntimeEnforcementMode()).toBe("disabled");
  });

  it("requires explicit full-outbound mode for blocking-capable runtime enforcement", () => {
    const observed = lucaLink.evaluateRuntimeEnforcement({
      scope: "outbound-send",
      eventName: "message",
      payload: { type: "tool-request", permission: "shell.execute" },
    });
    lucaLink.enableRuntimeEnforcement("full-outbound");
    const enforced = lucaLink.evaluateRuntimeEnforcement({
      scope: "outbound-send",
      eventName: "message",
      payload: { type: "tool-request", permission: "shell.execute" },
    });

    expect(observed.blocked).toBe(false);
    expect(enforced.blocked).toBe(true);
  });

  it("allows basic sends and blocks or queues high-risk outbound sends in full-outbound", () => {
    const emit = vi.fn();
    (lucaLink as any).socket = { emit };
    (lucaLink as any).state = {
      connected: true,
      deviceId: "exec-1",
      pairingToken: null,
      connectedDevices: [],
      error: null,
    };
    lucaLink.enableRuntimeEnforcement("full-outbound");

    const safe = lucaLink.send("primary", "message", { message: "hello" });
    const blocked = lucaLink.send("primary", "tool-request", {
      kind: "tool-request",
      permission: "shell.execute",
    });

    expect(safe).toBe(true);
    expect(blocked).toBe(false);
    expect(emit).toHaveBeenCalledTimes(1);
    expect(lucaLink.getRuntimeEnforcementSummary().total).toBe(2);
    expect(lucaLink.getRuntimeEnforcementSummary().blocked).toBe(1);
  });
});

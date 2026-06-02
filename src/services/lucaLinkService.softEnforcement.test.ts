import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("socket.io-client", () => ({
  io: vi.fn(),
}));

import { lucaLink } from "./lucaLinkService";
import { createLucaLinkDeviceTrustRegistry } from "./lucaLink/lucaLinkDeviceTrustRegistry";
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
    lucaLink.clearHostConnections();
    (lucaLink as any).deviceTrustRegistry = createLucaLinkDeviceTrustRegistry();
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
    registerLucaLinkContinuation(
      (lucaLink as any).continuationRegistry,
      manual,
    );
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
    expect(
      lucaLink.prepareSafeContinuation(fresh.id).preparedAction,
    ).toBeUndefined();
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

  it("upserts connected devices into the local trust registry", () => {
    (lucaLink as any).state = {
      connected: true,
      deviceId: "primary-host",
      pairingToken: null,
      connectedDevices: [],
      error: null,
    };

    (lucaLink as any).updateState({
      connectedDevices: [
        {
          deviceId: "primary-host",
          type: "desktop",
          name: "Primary",
          lastSeen: 1_700_000_000_000,
        },
        {
          deviceId: "phone-1",
          type: "mobile",
          name: "Phone",
          lastSeen: 1_700_000_000_001,
        },
      ],
    });

    expect(lucaLink.getTrustedDevices()).toHaveLength(2);
    expect(lucaLink.getActiveTrustedDevices()).toHaveLength(2);
    expect(
      lucaLink
        .getTrustedDevices()
        .find((device) => device.deviceId === "phone-1")?.trustLevel,
    ).toBe("paired");
    expect(lucaLink.getDeviceTrustSummary().connected).toBe(2);
  });

  it("device trust service helpers mutate local state without socket emit or disconnect", () => {
    const emit = vi.fn();
    const disconnect = vi.fn();
    (lucaLink as any).socket = { emit, disconnect };
    (lucaLink as any).deviceTrustRegistry = createLucaLinkDeviceTrustRegistry();
    (lucaLink as any).updateState({
      connectedDevices: [
        {
          deviceId: "phone-1",
          type: "mobile",
          name: "Phone",
          lastSeen: 1_700_000_000_001,
        },
      ],
    });

    expect(lucaLink.renameTrustedDevice("phone-1", "Pocket Luca").valid).toBe(
      true,
    );
    expect(
      lucaLink.setTrustedDeviceTrustLevel("phone-1", "trusted").valid,
    ).toBe(true);
    expect(lucaLink.revokeTrustedDevice("phone-1").device?.status).toBe(
      "revoked",
    );
    expect(lucaLink.blockTrustedDevice("phone-1").device?.status).toBe(
      "blocked",
    );
    expect(lucaLink.unblockTrustedDevice("phone-1").valid).toBe(true);
    expect(lucaLink.getDeviceTrustAudit().length).toBeGreaterThanOrEqual(5);
    expect(emit).not.toHaveBeenCalled();
    expect(disconnect).not.toHaveBeenCalled();
  });

  it("exposes model-only host connection and adaptation helpers without socket side effects", () => {
    const emit = vi.fn();
    (lucaLink as any).socket = { emit };
    (lucaLink as any).state = {
      connected: true,
      deviceId: "primary-host",
      pairingToken: null,
      connectedDevices: [
        {
          deviceId: "primary-host",
          type: "desktop electron",
          name: "Primary",
          lastSeen: 1_700_000_000_000,
        },
        {
          deviceId: "watch-1",
          type: "smart watch ble",
          name: "Watch",
          lastSeen: 1_700_000_000_001,
        },
      ],
      error: null,
    };

    const records = lucaLink.refreshHostConnectionsFromCurrentState();
    expect(records.length).toBeGreaterThanOrEqual(2);
    expect(
      lucaLink.getHostConnectionSummary().byHostClass["primary-host"],
    ).toBe(1);
    expect(lucaLink.getHostConnectionSummary().byHostClass["watch-host"]).toBe(
      1,
    );

    const diagnosis = lucaLink.diagnoseHostConnection({
      hostClass: "web-display-host",
      runtimeSurfaces: ["browser"],
      connectionClass: "web-display",
    });
    const strategies = lucaLink.planHostBridgeStrategies(diagnosis);
    const blueprint = lucaLink.createHostBridgeBlueprint(strategies[0]);

    expect(blueprint.requiresPrimaryHostApproval).toBe(true);
    expect(blueprint.generatedProgramAllowed).toBe(false);
    expect(JSON.stringify(blueprint)).not.toContain("Origin");
    expect(emit).not.toHaveBeenCalled();
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

describe("LucaLinkService guest inbound hardening", () => {
  function installGuestSocket() {
    const handlers: Record<string, (...args: any[]) => unknown> = {};
    const emit = vi.fn();
    (lucaLink as any).socket = {
      emit,
      on: vi.fn((event: string, handler: (...args: any[]) => unknown) => {
        handlers[event] = handler;
      }),
    };
    (lucaLink as any).state = {
      connected: true,
      deviceId: "primary-host",
      pairingToken: null,
      connectedDevices: [],
      error: null,
    };
    (lucaLink as any).setupGuestHandlers();
    return { emit, handlers };
  }

  afterEach(() => {
    vi.restoreAllMocks();
    lucaLink.clearGuestInboundAudit();
    (lucaLink as any).deviceTrustRegistry = createLucaLinkDeviceTrustRegistry();
    (lucaLink as any).guestSecuritySessions?.clear();
    (lucaLink as any).guestSessions?.clear();
    (lucaLink as any).guestMessageHandler = null;
    (lucaLink as any).socket = null;
    (lucaLink as any).state = {
      connected: false,
      deviceId: null,
      pairingToken: null,
      connectedDevices: [],
      error: null,
    };
  });

  it("creates or updates guest security records when a guest connects", async () => {
    const { handlers } = installGuestSocket();
    const startGuestSession = vi
      .spyOn(lucaLink as any, "startGuestSession")
      .mockResolvedValue(undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ pinRequired: false }),
      }),
    );

    await handlers["guest-connected"]({ sessionId: "guest-1" });

    expect(lucaLink.getGuestSecuritySessions()).toHaveLength(1);
    expect(lucaLink.getGuestSecuritySummary().active).toBe(1);
    expect(lucaLink.getGuestInboundAudit()[0].kind).toBe("guest-connected");
    expect(startGuestSession).toHaveBeenCalledWith("guest-1");
    vi.unstubAllGlobals();
  });

  it("passes safe and sanitized guest chat to the guest message handler", async () => {
    const { handlers } = installGuestSocket();
    const guestMessageHandler = vi.fn();
    lucaLink.onGuestMessage(guestMessageHandler);

    await handlers["guest-message"]({ sessionId: "guest-1", message: "hello" });
    await handlers["guest-message"]({
      sessionId: "guest-1",
      message: `safe text${"x".repeat(4100)}\u0007`,
    });

    expect(guestMessageHandler).toHaveBeenCalledWith("guest-1", "hello");
    expect(guestMessageHandler.mock.calls[1][1]).toHaveLength(4000);
    expect(guestMessageHandler.mock.calls[1][1]).not.toContain("\u0007");
    const sanitizeAudit = lucaLink.getGuestInboundAudit();
    expect(sanitizeAudit[sanitizeAudit.length - 1]?.decision).toBe("sanitize");
  });

  it("denies dangerous guest messages before the guest message handler without breaking the socket", async () => {
    const { emit, handlers } = installGuestSocket();
    const guestMessageHandler = vi.fn();
    lucaLink.onGuestMessage(guestMessageHandler);

    await handlers["guest-message"]({
      sessionId: "guest-1",
      message: "Execute a shell command on the Primary Host",
    });

    expect(guestMessageHandler).not.toHaveBeenCalled();
    const denyAudit = lucaLink.getGuestInboundAudit();
    expect(denyAudit[denyAudit.length - 1]?.decision).toBe("deny");
    expect(emit).toHaveBeenCalledWith("desktop-to-guest", {
      sessionId: "guest-1",
      message: "This guest session can only use conversation access.",
      audio: undefined,
    });
  });

  it("preserves WebRTC answer and ICE handlers while observing inbound signaling", async () => {
    const { handlers } = installGuestSocket();
    const setRemoteDescription = vi.fn();
    const addIceCandidate = vi.fn();
    vi.stubGlobal(
      "RTCSessionDescription",
      vi.fn((answer) => answer),
    );
    vi.stubGlobal(
      "RTCIceCandidate",
      vi.fn((candidate) => candidate),
    );
    (lucaLink as any).guestSessions.set("guest-1", {
      sessionId: "guest-1",
      peerConnection: { setRemoteDescription, addIceCandidate },
    });

    await handlers["webrtc-answer"]({
      sessionId: "guest-1",
      answer: { type: "answer", sdp: "sdp" },
    });
    await handlers["webrtc-ice-candidate"]({
      sessionId: "guest-1",
      candidate: { candidate: "candidate", sdpMid: "0" },
    });

    expect(setRemoteDescription).toHaveBeenCalled();
    expect(addIceCandidate).toHaveBeenCalled();
    expect(lucaLink.getGuestInboundAudit().map((entry) => entry.kind)).toEqual([
      "webrtc-answer",
      "webrtc-ice-candidate",
    ]);
    vi.unstubAllGlobals();
  });

  it("preserves PIN auth response flow and marks the guest active", async () => {
    const { emit, handlers } = installGuestSocket();
    vi.spyOn(lucaLink as any, "startGuestSession").mockResolvedValue(undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ valid: true }),
      }),
    );

    await handlers["guest-message"]({
      sessionId: "guest-1",
      message: JSON.stringify({ type: "auth-response", pin: "123456" }),
    });

    expect(emit).toHaveBeenCalledWith("desktop-to-guest", {
      sessionId: "guest-1",
      message: JSON.stringify({ type: "auth-success" }),
      audio: undefined,
    });
    expect(lucaLink.getGuestSecuritySummary().active).toBe(1);
    vi.unstubAllGlobals();
  });
});

import { describe, expect, it, vi } from "vitest";
import {
  consumePreparedLucaLinkContinuation,
  evaluateLucaLinkContinuationBridge,
  isContinuationBridgeBlockedAction,
  isContinuationBridgeSafeAction,
  prepareLucaLinkSafeContinuation,
  requiresFreshConfirmationForContinuationBridge,
  requiresManualRetryForContinuationBridge,
  classifyContinuationBridgeAction,
} from "./lucaLinkContinuationBridge";
import {
  createLucaLinkContinuationRegistry,
  createLucaLinkContinuationToken,
  registerLucaLinkContinuation,
  type LucaLinkContinuationReplayMode,
  type LucaLinkContinuationRisk,
  type LucaLinkContinuationStatus,
} from "./lucaLinkContinuation";

const NOW = 1_700_000_000_000;

type TokenOptions = {
  permission?: string;
  lane?: string;
  eventName?: string;
  risk?: LucaLinkContinuationRisk;
  replayMode?: LucaLinkContinuationReplayMode;
  status?: LucaLinkContinuationStatus;
  ttlMs?: number;
};

function registryWithToken(options: TokenOptions) {
  const registry = createLucaLinkContinuationRegistry({ now: NOW });
  const token = createLucaLinkContinuationToken(
    {
      id: `token-${options.permission ?? options.lane ?? "unknown"}-${options.status ?? "validated"}`,
      source: "approval-queue",
      permission: options.permission,
      lane: options.lane,
      eventName: options.eventName ?? "luca.continuation",
      risk: options.risk ?? "low",
      replayMode: options.replayMode,
      status: options.status ?? "validated",
      ttlMs: options.ttlMs ?? 60_000,
      approvedAt: NOW - 1_000,
      approvedByDeviceId: "primary-host",
      requestedByDeviceId: "device-a",
      requestedTargetDeviceId: "primary-host",
      title: "Prepared safe record",
      summary: "Primary Host approved a safe LucaLink continuation record.",
      explain:
        "Primary Host approval created a continuation record; bridge preparation is model-only.",
      payloadPreview: { preview: true },
    },
    { now: NOW },
  );
  registerLucaLinkContinuation(registry, token);
  return { registry, token };
}

describe("LucaLink controlled continuation bridge safe preparation", () => {
  it.each([
    ["notification.send", "notification"],
    ["conversation.continue", "conversation"],
    ["message.send", "message"],
  ] as const)("prepares validated %s as a safe %s continuation model", (permission, kind) => {
    const { registry, token } = registryWithToken({
      permission,
      lane: kind === "message" ? "conversation" : kind,
      risk: "medium",
      replayMode: "single-use-replayable",
    });

    const evaluated = evaluateLucaLinkContinuationBridge(registry, {
      tokenId: token.id,
      requestedByDeviceId: "device-a",
      requestedTargetDeviceId: "primary-host",
      permission,
      now: NOW,
    });
    const prepared = prepareLucaLinkSafeContinuation(registry, {
      tokenId: token.id,
      requestedByDeviceId: "device-a",
      requestedTargetDeviceId: "primary-host",
      permission,
      now: NOW,
    });

    expect(evaluated.decision).toBe("can-prepare-safe-continuation");
    expect(prepared.preparedAction).toMatchObject({
      tokenId: token.id,
      actionKind: kind,
      safeToAutoContinue: true,
      requiresManualUserAction: false,
      requiresFreshConfirmation: false,
    });
    expect(prepared.canExecuteNow).toBe(false);
    expect(prepared.canAutoContinue).toBe(true);
    expect(prepared.explain).toMatch(/does not send, emit, retry, replay, beam, or execute/i);
    expect(JSON.stringify(prepared)).not.toMatch(/Origin approval/i);
  });

  it("allows low/medium notification and conversation lanes only as model objects", () => {
    const { registry, token } = registryWithToken({
      lane: "notification",
      risk: "low",
      replayMode: "single-use-replayable",
    });

    expect(isContinuationBridgeSafeAction(token)).toBe(true);
    expect(classifyContinuationBridgeAction(token)).toBe("notification");

    const prepared = prepareLucaLinkSafeContinuation(registry, { tokenId: token.id, now: NOW });
    expect(prepared.preparedAction?.safeToAutoContinue).toBe(true);
    expect(prepared.preparedAction?.summary).toMatch(/no send, emit, retry, replay, beam, or execution/i);
  });

  it("consumes a prepared safe continuation as token state only", () => {
    const { registry, token } = registryWithToken({
      permission: "notification.send",
      lane: "notification",
      replayMode: "single-use-replayable",
    });
    const prepared = prepareLucaLinkSafeContinuation(registry, { tokenId: token.id, now: NOW });

    const consumed = consumePreparedLucaLinkContinuation(
      registry,
      prepared.preparedAction!,
      { now: NOW + 1, consumedByDeviceId: "primary-host" },
    );

    expect(consumed.consumed).toBe(true);
    expect(consumed.token?.status).toBe("consumed");
    expect(consumed.token?.consumeRecord).toMatchObject({
      consumedByDeviceId: "primary-host",
      reason: "Consumed prepared safe continuation model only.",
    });
    expect(consumed.canExecuteNow).toBe(false);
  });
});

describe("LucaLink controlled continuation bridge unsafe refusal", () => {
  it.each([
    "shell.execute",
    "files.write",
    "code.modify",
    "git.create_pr",
    "browser.control",
  ])("classifies %s as manual-retry-only without a prepared action", (permission) => {
    const { registry, token } = registryWithToken({
      permission,
      risk: "high",
      replayMode: "manual-retry-only",
    });

    expect(requiresManualRetryForContinuationBridge(token)).toBe(true);
    const result = prepareLucaLinkSafeContinuation(registry, { tokenId: token.id, now: NOW });

    expect(result.decision).toBe("requires-manual-retry");
    expect(result.requiresManualRetry).toBe(true);
    expect(result.preparedAction).toBeUndefined();
    expect(result.canExecuteNow).toBe(false);
  });

  it.each(["payment.spend", "robotics.motion", "smart_home.control"])(
    "classifies %s as fresh-confirmation-required without a prepared action",
    (permission) => {
      const { registry, token } = registryWithToken({
        permission,
        risk: "critical",
        replayMode: "single-use-replayable",
      });

      expect(requiresFreshConfirmationForContinuationBridge(token)).toBe(true);
      const result = prepareLucaLinkSafeContinuation(registry, { tokenId: token.id, now: NOW });

      expect(result.decision).toBe("requires-fresh-confirmation");
      expect(result.requiresFreshConfirmation).toBe(true);
      expect(result.preparedAction).toBeUndefined();
      expect(result.canExecuteNow).toBe(false);
    },
  );

  it("requires fresh confirmation for critical safety and physical/actuator hints", () => {
    const safety = registryWithToken({
      lane: "safety",
      risk: "critical",
      replayMode: "single-use-replayable",
    });
    const actuator = registryWithToken({
      permission: "device.actuator.open",
      eventName: "door.unlock",
      replayMode: "single-use-replayable",
    });

    expect(prepareLucaLinkSafeContinuation(safety.registry, { tokenId: safety.token.id, now: NOW }).decision).toBe(
      "requires-fresh-confirmation",
    );
    expect(prepareLucaLinkSafeContinuation(actuator.registry, { tokenId: actuator.token.id, now: NOW }).decision).toBe(
      "requires-fresh-confirmation",
    );
  });
});

describe("LucaLink controlled continuation bridge invalid and blocked tokens", () => {
  it("returns invalid or blocked decisions for expired, consumed, cancelled, and blocked tokens", () => {
    const expired = registryWithToken({
      permission: "notification.send",
      replayMode: "single-use-replayable",
      ttlMs: -1,
    });
    const consumed = registryWithToken({
      permission: "notification.send",
      replayMode: "single-use-replayable",
      status: "consumed",
    });
    const cancelled = registryWithToken({
      permission: "notification.send",
      replayMode: "single-use-replayable",
      status: "cancelled",
    });
    const blocked = registryWithToken({
      permission: "notification.send",
      replayMode: "single-use-replayable",
      status: "blocked",
    });

    for (const { registry, token } of [expired, consumed, cancelled, blocked]) {
      const result = prepareLucaLinkSafeContinuation(registry, { tokenId: token.id, now: NOW });
      expect(["invalid-token", "blocked-risk"]).toContain(result.decision);
      expect(result.preparedAction).toBeUndefined();
      expect(result.canExecuteNow).toBe(false);
    }
  });

  it("blocks non-replayable and unknown high/critical tokens", () => {
    const nonReplayable = registryWithToken({
      permission: "notification.send",
      replayMode: "non-replayable",
      status: "validated",
    });
    const unknownHigh = registryWithToken({
      permission: "unknown.high",
      risk: "high",
      replayMode: "single-use-replayable",
    });
    const unknownCritical = registryWithToken({
      permission: "unknown.critical",
      risk: "critical",
      replayMode: "single-use-replayable",
    });

    expect(isContinuationBridgeBlockedAction(nonReplayable.token)).toBe(true);
    expect(
      prepareLucaLinkSafeContinuation(nonReplayable.registry, {
        tokenId: nonReplayable.token.id,
        now: NOW,
      }).decision,
    ).toBe("blocked-risk");
    expect(
      prepareLucaLinkSafeContinuation(unknownHigh.registry, {
        tokenId: unknownHigh.token.id,
        now: NOW,
      }).decision,
    ).toBe("blocked-risk");
    expect(
      prepareLucaLinkSafeContinuation(unknownCritical.registry, {
        tokenId: unknownCritical.token.id,
        now: NOW,
      }).decision,
    ).toBe("blocked-risk");
  });

  it.each([
    ["requestedByDeviceId", { requestedByDeviceId: "device-b" }],
    ["requestedTargetDeviceId", { requestedTargetDeviceId: "secondary-host" }],
    ["permission", { permission: "message.send" }],
    ["lane", { lane: "conversation" }],
    ["eventName", { eventName: "other.event" }],
  ] as const)("fails validation for mismatched %s", (_label, mismatch) => {
    const { registry, token } = registryWithToken({
      permission: "notification.send",
      lane: "notification",
      eventName: "notify.event",
      replayMode: "single-use-replayable",
    });

    const result = prepareLucaLinkSafeContinuation(registry, {
      tokenId: token.id,
      now: NOW,
      ...mismatch,
    });

    expect(result.decision).toBe("invalid-token");
    expect(result.valid).toBe(false);
    expect(result.preparedAction).toBeUndefined();
    expect(result.errors.join(" ")).toMatch(/mismatch/i);
  });

  it("reports unknown token ids as invalid", () => {
    const registry = createLucaLinkContinuationRegistry({ now: NOW });
    const result = evaluateLucaLinkContinuationBridge(registry, {
      tokenId: "missing-token",
      now: NOW,
    });

    expect(result.decision).toBe("invalid-token");
    expect(result.valid).toBe(false);
  });
});

describe("LucaLink controlled continuation bridge import boundaries", () => {
  it("does not touch browser storage, fetch, media devices, sockets, shell, or filesystem at import", async () => {
    const localStorage = { getItem: vi.fn(), setItem: vi.fn() };
    const sessionStorage = { getItem: vi.fn(), setItem: vi.fn() };
    const fetchSpy = vi.fn();
    const getUserMedia = vi.fn();
    vi.stubGlobal("localStorage", localStorage);
    vi.stubGlobal("sessionStorage", sessionStorage);
    vi.stubGlobal("fetch", fetchSpy);
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });

    await import(`./lucaLinkContinuationBridge?side-effect-check=${Date.now()}`);

    expect(localStorage.getItem).not.toHaveBeenCalled();
    expect(localStorage.setItem).not.toHaveBeenCalled();
    expect(sessionStorage.getItem).not.toHaveBeenCalled();
    expect(sessionStorage.setItem).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(getUserMedia).not.toHaveBeenCalled();
  });
});

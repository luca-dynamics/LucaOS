import { describe, expect, it, vi } from "vitest";
import {
  approveLucaLinkApprovalRequest,
  cancelLucaLinkApprovalRequest,
  createLucaLinkApprovalRequest,
  denyLucaLinkApprovalRequest,
  type LucaLinkApprovalRequest,
} from "./lucaLinkApprovalQueue";
import {
  cancelLucaLinkContinuationToken,
  classifyLucaLinkContinuationReplayMode,
  clearLucaLinkContinuationRegistry,
  consumeLucaLinkContinuationToken,
  continuationTokenFromApprovalRequest,
  createLucaLinkContinuationRegistry,
  createLucaLinkContinuationToken,
  expireLucaLinkContinuationTokens,
  getValidLucaLinkContinuationTokens,
  isLucaLinkContinuationReplayable,
  listLucaLinkContinuationTokens,
  registerContinuationFromApprovalRequest,
  registerLucaLinkContinuation,
  requiresFreshConfirmationForContinuation,
  shouldCreateContinuationFromApproval,
  summarizeLucaLinkContinuationRegistry,
  validateLucaLinkContinuationToken,
} from "./lucaLinkContinuation";

const NOW = 1_700_000_000_000;

function approval(
  overrides: Partial<LucaLinkApprovalRequest> = {},
): LucaLinkApprovalRequest {
  const request = createLucaLinkApprovalRequest(
    {
      eventName: "message",
      lane: "tool",
      permission: "files.write",
      risk: "high",
      requestedByDeviceId: "device-a",
      requestedTargetDeviceId: "primary-host",
      title: "Approve file write?",
      summary: "Primary Host approval requested for permission files.write.",
      explain:
        "Primary Host approval is required before this action can continue.",
      payloadPreview: { kind: "tool-request", password: "[redacted]" },
      payload: { raw: "must-not-copy" },
      envelopeId: "env-1",
      envelopeType: "tool-request",
    },
    { now: NOW, defaultTtlMs: 10_000 },
  );
  request.status = "approved";
  request.updatedAt = NOW + 100;
  request.decision = {
    decision: "approve",
    decidedAt: NOW + 100,
    decidedByDeviceId: "primary-host",
  };
  return { ...request, ...overrides };
}

describe("LucaLink continuation model", () => {
  it("creates serializable deterministic tokens with a 2 minute default TTL", () => {
    const token = createLucaLinkContinuationToken(
      {
        permission: "files.write",
        requestedByDeviceId: "device-a",
        payloadPreview: { redacted: true },
      },
      { now: NOW },
    );

    expect(token.createdAt).toBe(NOW);
    expect(token.updatedAt).toBe(NOW);
    expect(token.expiresAt).toBe(NOW + 2 * 60 * 1000);
    expect(token.replayMode).toBe("manual-retry-only");
    expect(JSON.parse(JSON.stringify(token))).toEqual(token);
    expect(JSON.stringify(token)).not.toContain("function");
  });

  it("uses approval metadata and redacted payloadPreview without raw payload", () => {
    const token = continuationTokenFromApprovalRequest(approval(), {
      now: NOW,
    });

    expect(token).toMatchObject({
      requestId: expect.stringContaining("luca-approval"),
      source: "approval-queue",
      approvedAt: NOW + 100,
      approvedByDeviceId: "primary-host",
      requestedByDeviceId: "device-a",
      requestedTargetDeviceId: "primary-host",
      eventName: "message",
      lane: "tool",
      permission: "files.write",
      risk: "high",
      title: "Approve file write?",
      envelopeId: "env-1",
      envelopeType: "tool-request",
    });
    expect(token?.payloadPreview).toEqual({
      kind: "tool-request",
      password: "[redacted]",
    });
    expect(JSON.stringify(token)).not.toContain("must-not-copy");
    expect(JSON.stringify(token)).not.toMatch(/Origin approval/i);
    expect(token?.explain).toMatch(/Primary Host/);
  });
});

describe("LucaLink continuation replay classification", () => {
  it.each(["payment.spend", "robotics.motion", "smart_home.control"])(
    "requires fresh confirmation for %s",
    (permission) => {
      expect(classifyLucaLinkContinuationReplayMode({ permission })).toBe(
        "fresh-confirmation-required",
      );
      expect(requiresFreshConfirmationForContinuation({ permission })).toBe(
        true,
      );
    },
  );

  it.each([
    "shell.execute",
    "files.write",
    "code.modify",
    "git.create_pr",
    "browser.control",
  ])("uses manual retry only for %s", (permission) => {
    expect(classifyLucaLinkContinuationReplayMode({ permission })).toBe(
      "manual-retry-only",
    );
  });

  it("only marks intentionally safe low/medium actions single-use replayable", () => {
    expect(
      classifyLucaLinkContinuationReplayMode({
        permission: "notification.send",
        risk: "low",
      }),
    ).toBe("single-use-replayable");
    expect(
      isLucaLinkContinuationReplayable({
        permission: "conversation.continue",
        risk: "medium",
        status: "validated",
      }),
    ).toBe(true);
  });

  it("defaults unknown high or critical actions safely to manual retry only", () => {
    expect(
      classifyLucaLinkContinuationReplayMode({
        permission: "unknown.high",
        risk: "critical",
      }),
    ).toBe("manual-retry-only");
  });
});

describe("LucaLink approval-to-continuation bridge", () => {
  it("creates tokens only for approved, unexpired approve decisions", () => {
    const approved = approval();
    expect(shouldCreateContinuationFromApproval(approved, { now: NOW })).toBe(
      true,
    );
    expect(
      continuationTokenFromApprovalRequest(approved, { now: NOW }),
    ).toBeDefined();

    expect(
      continuationTokenFromApprovalRequest(
        approval({ status: "pending", decision: undefined }),
        { now: NOW },
      ),
    ).toBeUndefined();
    expect(
      continuationTokenFromApprovalRequest(
        approval({
          status: "denied",
          decision: { decision: "deny", decidedAt: NOW + 100 },
        }),
        { now: NOW },
      ),
    ).toBeUndefined();
    expect(
      continuationTokenFromApprovalRequest(
        approval({
          status: "cancelled",
          decision: { decision: "cancel", decidedAt: NOW + 100 },
        }),
        { now: NOW },
      ),
    ).toBeUndefined();
    expect(
      continuationTokenFromApprovalRequest(approval({ expiresAt: NOW - 1 }), {
        now: NOW,
      }),
    ).toBeUndefined();
  });

  it("records payment and physical approvals as blocked fresh-confirmation records", () => {
    const token = continuationTokenFromApprovalRequest(
      approval({ permission: "payment.spend", risk: "critical" }),
      { now: NOW },
    );

    expect(token?.status).toBe("blocked");
    expect(token?.replayMode).toBe("fresh-confirmation-required");
    expect(token?.validationWarnings.join(" ")).toMatch(/fresh Primary Host/i);
    expect(isLucaLinkContinuationReplayable(token ?? {})).toBe(false);
  });

  it("records file, code, and shell approvals as manual retry only", () => {
    for (const permission of ["files.write", "code.modify", "shell.execute"]) {
      expect(
        continuationTokenFromApprovalRequest(approval({ permission }), {
          now: NOW,
        })?.replayMode,
      ).toBe("manual-retry-only");
    }
  });
});

describe("LucaLink continuation registry", () => {
  it("registers, lists, summarizes, expires, clears, and caps tokens", () => {
    const registry = createLucaLinkContinuationRegistry({
      now: NOW,
      maxTokens: 2,
    });

    registerLucaLinkContinuation(registry, {
      id: "a",
      permission: "files.write",
    });
    registerLucaLinkContinuation(registry, {
      id: "b",
      permission: "notification.send",
      risk: "low",
    });
    registerLucaLinkContinuation(registry, {
      id: "c",
      permission: "files.write",
    });

    expect(listLucaLinkContinuationTokens(registry).map((t) => t.id)).toEqual([
      "b",
      "c",
    ]);
    expect(summarizeLucaLinkContinuationRegistry(registry, NOW).total).toBe(2);
    expect(summarizeLucaLinkContinuationRegistry(registry, NOW).valid).toBe(2);

    expireLucaLinkContinuationTokens(registry, NOW + 2 * 60 * 1000 + 1);
    expect(summarizeLucaLinkContinuationRegistry(registry, NOW).expired).toBe(
      2,
    );

    clearLucaLinkContinuationRegistry(registry);
    expect(listLucaLinkContinuationTokens(registry)).toHaveLength(0);
  });

  it("returns structured warning for unknown token validation", () => {
    const registry = createLucaLinkContinuationRegistry({ now: NOW });
    const result = validateLucaLinkContinuationToken(registry, "missing", {
      now: NOW,
    });
    expect(result.valid).toBe(false);
    expect(result.warnings[0]).toContain(
      "Unknown LucaLink continuation token id",
    );
    expect(result.errors).toEqual([]);
  });
});

describe("LucaLink continuation validation and consumption", () => {
  it("validates matching context and rejects expired, consumed, cancelled, blocked, and mismatched tokens", () => {
    const registry = createLucaLinkContinuationRegistry({ now: NOW });
    registerLucaLinkContinuation(registry, {
      id: "valid",
      permission: "files.write",
      lane: "tool",
      eventName: "message",
      requestedByDeviceId: "device-a",
      requestedTargetDeviceId: "primary-host",
    });

    expect(
      validateLucaLinkContinuationToken(registry, "valid", {
        now: NOW,
        permission: "files.write",
        lane: "tool",
        eventName: "message",
        requestedByDeviceId: "device-a",
        requestedTargetDeviceId: "primary-host",
      }).valid,
    ).toBe(true);
    expect(
      validateLucaLinkContinuationToken(registry, "valid", {
        requestedByDeviceId: "device-b",
      }).errors,
    ).toContain("Continuation requesting device mismatch.");
    expect(
      validateLucaLinkContinuationToken(registry, "valid", {
        requestedTargetDeviceId: "other",
      }).errors,
    ).toContain("Continuation target device mismatch.");
    expect(
      validateLucaLinkContinuationToken(registry, "valid", {
        permission: "shell.execute",
      }).errors,
    ).toContain("Continuation permission mismatch.");
    expect(
      validateLucaLinkContinuationToken(registry, "valid", { lane: "memory" })
        .errors,
    ).toContain("Continuation lane mismatch.");
    expect(
      validateLucaLinkContinuationToken(registry, "valid", {
        eventName: "other",
      }).errors,
    ).toContain("Continuation event name mismatch.");

    expect(
      validateLucaLinkContinuationToken(registry, "valid", {
        now: NOW + 2 * 60 * 1000 + 1,
      }).errors,
    ).toContain("Continuation token is expired.");

    registerLucaLinkContinuation(registry, {
      id: "cancel",
      permission: "files.write",
    });
    cancelLucaLinkContinuationToken(registry, "cancel", { now: NOW });
    expect(
      validateLucaLinkContinuationToken(registry, "cancel").errors,
    ).toContain("Continuation token is cancelled.");

    registerLucaLinkContinuation(registry, {
      id: "blocked",
      permission: "payment.spend",
    });
    expect(
      validateLucaLinkContinuationToken(registry, "blocked").errors,
    ).toEqual(
      expect.arrayContaining([
        "Continuation token is blocked.",
        "Continuation token requires fresh Primary Host confirmation.",
      ]),
    );
  });

  it("consumes a valid token exactly once and records metadata without side effects", () => {
    const registry = createLucaLinkContinuationRegistry({ now: NOW });
    registerLucaLinkContinuation(registry, {
      id: "token",
      permission: "files.write",
    });

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const consumed = consumeLucaLinkContinuationToken(registry, "token", {
      now: NOW + 10,
      consumedByDeviceId: "primary-host",
      reason: "manual continuation accounting",
    });

    expect(consumed.consumed).toBe(true);
    expect(consumed.token?.status).toBe("consumed");
    expect(consumed.token?.consumedAt).toBe(NOW + 10);
    expect(consumed.token?.consumeRecord).toEqual({
      consumedAt: NOW + 10,
      consumedByDeviceId: "primary-host",
      reason: "manual continuation accounting",
    });
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();

    const second = consumeLucaLinkContinuationToken(registry, "token", {
      now: NOW + 11,
    });
    expect(second.consumed).toBe(false);
    expect(second.errors).toContain("Continuation token is already consumed.");
  });
});

describe("LucaLink continuation side-effect boundaries", () => {
  it("approval queue mutation helpers still only feed explicit continuation registration", () => {
    const queueLike = {
      requests: [approval()],
      defaultTtlMs: 10_000,
      maxRequests: 10,
      dedupeWindowMs: 100,
    };
    const request = queueLike.requests[0];
    denyLucaLinkApprovalRequest(queueLike, request.id, { now: NOW + 200 });
    expect(
      continuationTokenFromApprovalRequest(request, { now: NOW }),
    ).toBeUndefined();

    approveLucaLinkApprovalRequest(queueLike, request.id, { now: NOW + 300 });
    const registry = createLucaLinkContinuationRegistry({ now: NOW });
    expect(
      registerContinuationFromApprovalRequest(registry, request).created,
    ).toBe(true);

    cancelLucaLinkApprovalRequest(queueLike, request.id, { now: NOW + 400 });
    expect(shouldCreateContinuationFromApproval(request, { now: NOW })).toBe(
      false,
    );
  });

  it("does not touch localStorage, sessionStorage, camera, mic, location, sockets, or fetch during pure operations", () => {
    const localStorageGetItem = vi.fn();
    const sessionStorageSetItem = vi.fn();
    const fetchMock = vi.fn();
    const getUserMedia = vi.fn();
    const getCurrentPosition = vi.fn();
    vi.stubGlobal("localStorage", { getItem: localStorageGetItem });
    vi.stubGlobal("sessionStorage", { setItem: sessionStorageSetItem });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("navigator", {
      mediaDevices: { getUserMedia },
      geolocation: { getCurrentPosition },
    });

    const registry = createLucaLinkContinuationRegistry({ now: NOW });
    registerLucaLinkContinuation(registry, {
      permission: "notification.send",
      risk: "low",
    });
    getValidLucaLinkContinuationTokens(registry, NOW);
    summarizeLucaLinkContinuationRegistry(registry, NOW);

    expect(localStorageGetItem).not.toHaveBeenCalled();
    expect(sessionStorageSetItem).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(getCurrentPosition).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});

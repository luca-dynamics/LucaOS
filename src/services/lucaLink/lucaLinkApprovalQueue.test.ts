import { describe, expect, it, vi } from "vitest";
import {
  approvalRequestFromSoftEnforcementResult,
  approveLucaLinkApprovalRequest,
  cancelLucaLinkApprovalRequest,
  clearLucaLinkApprovalQueue,
  createLucaLinkApprovalPayloadPreview,
  createLucaLinkApprovalQueue,
  createLucaLinkApprovalRequest,
  denyLucaLinkApprovalRequest,
  enqueueApprovalForSoftEnforcementResult,
  enqueueLucaLinkApprovalRequest,
  expireLucaLinkApprovalRequests,
  getPendingLucaLinkApprovalRequests,
  listLucaLinkApprovalRequests,
  shouldCreateApprovalRequest,
  summarizeLucaLinkApprovalQueue,
  type LucaLinkApprovalRequestInput,
} from "./lucaLinkApprovalQueue";
import type { LucaLinkSoftEnforcementResult } from "./lucaLinkSoftEnforcement";

const NOW = 1_700_000_000_000;

function approvalResult(
  overrides: Partial<LucaLinkSoftEnforcementResult> = {},
): LucaLinkSoftEnforcementResult {
  return {
    decision: "requires-primary-host-approval",
    reason: "primary-host-approval-required",
    enforceable: true,
    blocked: true,
    requiresPrimaryHostApproval: true,
    eventName: "message",
    lane: "tool",
    permission: "shell.execute",
    risk: "high",
    explain:
      "Primary Host approval is required before this action can continue.",
    warnings: ["soft warning"],
    errors: ["soft error"],
    ...overrides,
  };
}

function input(
  overrides: Partial<LucaLinkApprovalRequestInput> = {},
): LucaLinkApprovalRequestInput {
  return {
    eventName: "message",
    lane: "tool",
    permission: "shell.execute",
    requestedByDeviceId: "exec-1",
    requestedTargetDeviceId: "primary-1",
    risk: "high",
    reason: "primary-host-approval-required",
    explain:
      "Primary Host approval is required before this action can continue.",
    payload: { command: "pwd", token: "secret-token" },
    ...overrides,
  };
}

describe("LucaLink approval request model", () => {
  it("creates a serializable pending request with deterministic timestamps and default TTL", () => {
    const request = createLucaLinkApprovalRequest(input(), { now: NOW });

    expect(request.status).toBe("pending");
    expect(request.createdAt).toBe(NOW);
    expect(request.updatedAt).toBe(NOW);
    expect(request.expiresAt).toBe(NOW + 5 * 60 * 1000);
    expect(request.title).toBe("Approve shell execution?");
    expect(request.summary).toContain("permission shell.execute");
    expect(request.explain).toContain("Primary Host approval");
    expect(JSON.parse(JSON.stringify(request))).toEqual(request);
  });

  it("does not use Origin approval terminology", () => {
    const request = createLucaLinkApprovalRequest(input(), { now: NOW });
    const serialized = JSON.stringify(request);

    expect(serialized).not.toMatch(/Origin approval/i);
    expect(serialized).toMatch(/Primary Host approval/i);
  });
});

describe("LucaLink approval queue lifecycle", () => {
  it("enqueues pending requests and finalizes approve, deny, cancel, and expire decisions", () => {
    const queue = createLucaLinkApprovalQueue({ now: NOW });
    const created = enqueueLucaLinkApprovalRequest(queue, input());
    const requestId = created.request?.id ?? "missing";

    expect(created.created).toBe(true);
    expect(getPendingLucaLinkApprovalRequests(queue, NOW)).toHaveLength(1);

    const approved = approveLucaLinkApprovalRequest(queue, requestId, {
      now: NOW + 1,
      decidedByDeviceId: "primary-1",
      reason: "approved by owner",
    });
    expect(approved.request?.status).toBe("approved");
    expect(approved.request?.decision).toEqual({
      decidedAt: NOW + 1,
      decidedByDeviceId: "primary-1",
      decision: "approve",
      reason: "approved by owner",
    });
    expect(getPendingLucaLinkApprovalRequests(queue, NOW + 1)).toHaveLength(0);

    const deniedRequest = enqueueLucaLinkApprovalRequest(
      queue,
      input({ permission: "files.write" }),
    ).request;
    const cancelledRequest = enqueueLucaLinkApprovalRequest(
      queue,
      input({ permission: "code.modify" }),
    ).request;
    const expiringRequest = enqueueLucaLinkApprovalRequest(
      queue,
      input({ permission: "robotics.motion", ttlMs: 10 }),
    ).request;

    expect(
      denyLucaLinkApprovalRequest(queue, deniedRequest?.id ?? "missing", {
        now: NOW + 2,
      }).request?.status,
    ).toBe("denied");
    expect(
      cancelLucaLinkApprovalRequest(queue, cancelledRequest?.id ?? "missing", {
        now: NOW + 3,
      }).request?.status,
    ).toBe("cancelled");

    const expired = expireLucaLinkApprovalRequests(queue, NOW + 11);
    expect(expired.expired?.map((request) => request.id)).toContain(
      expiringRequest?.id,
    );
    expect(expiringRequest?.status).toBe("expired");
    expect(getPendingLucaLinkApprovalRequests(queue, NOW + 11)).toHaveLength(0);

    const summary = summarizeLucaLinkApprovalQueue(queue, NOW + 11);
    expect(summary).toMatchObject({
      total: 4,
      pending: 0,
      approved: 1,
      denied: 1,
      cancelled: 1,
      expired: 1,
    });
  });

  it("returns structured warnings for unknown request IDs and clears queue state", () => {
    const queue = createLucaLinkApprovalQueue({ now: NOW });
    enqueueLucaLinkApprovalRequest(queue, input());

    expect(
      approveLucaLinkApprovalRequest(queue, "missing-request").warnings[0],
    ).toContain("Unknown LucaLink approval request id");

    clearLucaLinkApprovalQueue(queue);
    expect(listLucaLinkApprovalRequests(queue)).toHaveLength(0);
  });
});

describe("LucaLink approval dedupe and capacity", () => {
  it("dedupes matching pending requests inside the window and creates new ones outside it", () => {
    const queue = createLucaLinkApprovalQueue({
      now: NOW,
      dedupeWindowMs: 10_000,
    });

    const first = enqueueLucaLinkApprovalRequest(queue, input()).request;
    queue.now = NOW + 5_000;
    const duplicate = enqueueLucaLinkApprovalRequest(queue, input());
    expect(duplicate.deduped).toBe(true);
    expect(duplicate.request?.id).toBe(first?.id);
    expect(duplicate.request?.warnings).toContain(
      "deduped existing pending approval request.",
    );

    queue.now = NOW + 20_000;
    const outsideWindow = enqueueLucaLinkApprovalRequest(queue, input());
    expect(outsideWindow.created).toBe(true);
    expect(listLucaLinkApprovalRequests(queue)).toHaveLength(2);
  });

  it("keeps different permission, lane, and source requests separate", () => {
    const queue = createLucaLinkApprovalQueue({ now: NOW });
    enqueueLucaLinkApprovalRequest(
      queue,
      input({ permission: "shell.execute" }),
    );
    enqueueLucaLinkApprovalRequest(queue, input({ permission: "files.write" }));
    enqueueLucaLinkApprovalRequest(queue, input({ lane: "identity" }));
    enqueueLucaLinkApprovalRequest(queue, input({ source: "manual" }));

    expect(listLucaLinkApprovalRequests(queue)).toHaveLength(4);
  });

  it("enforces maxRequests while avoiding silent high-risk pending drops when possible", () => {
    const queue = createLucaLinkApprovalQueue({ now: NOW, maxRequests: 3 });
    const high = enqueueLucaLinkApprovalRequest(
      queue,
      input({ permission: "shell.execute", risk: "high" }),
    ).request;
    queue.now = NOW + 1;
    enqueueLucaLinkApprovalRequest(
      queue,
      input({ permission: "chat.send", risk: "low" }),
    );
    queue.now = NOW + 2;
    const finalized = enqueueLucaLinkApprovalRequest(
      queue,
      input({ permission: "files.write", risk: "medium" }),
    ).request;
    denyLucaLinkApprovalRequest(queue, finalized?.id ?? "missing", {
      now: NOW + 3,
    });
    queue.now = NOW + 4;
    enqueueLucaLinkApprovalRequest(
      queue,
      input({ permission: "code.modify", risk: "critical" }),
    );

    const requests = listLucaLinkApprovalRequests(queue);
    expect(requests).toHaveLength(3);
    expect(requests.some((request) => request.id === high?.id)).toBe(true);
    expect(requests.every((request) => request.status !== "denied")).toBe(true);
  });
});

describe("LucaLink soft-enforcement approval bridge", () => {
  it("creates and enqueues requests only for Primary Host approval results", () => {
    const queue = createLucaLinkApprovalQueue({ now: NOW });

    expect(shouldCreateApprovalRequest(approvalResult())).toBe(true);
    expect(
      enqueueApprovalForSoftEnforcementResult(queue, approvalResult(), {
        requestedByDeviceId: "exec-1",
        requestedTargetDeviceId: "primary-1",
        payload: { command: "pwd" },
      }).created,
    ).toBe(true);

    for (const result of [
      approvalResult({
        decision: "allow",
        blocked: false,
        requiresPrimaryHostApproval: false,
      }),
      approvalResult({
        decision: "deny",
        requiresPrimaryHostApproval: false,
      }),
      approvalResult({
        decision: "observe-only",
        blocked: false,
        requiresPrimaryHostApproval: false,
      }),
    ]) {
      expect(approvalRequestFromSoftEnforcementResult(result)).toBeUndefined();
    }

    expect(listLucaLinkApprovalRequests(queue)).toHaveLength(1);
  });

  it.each([
    ["shell.execute", "tool", "Approve shell execution?"],
    ["files.write", "tool", "Approve file write?"],
    ["code.modify", "tool", "Approve code modification?"],
    ["robotics.motion", "tool", "Approve robotics motion?"],
    [undefined, "identity", "Approve guest identity access?"],
  ])("uses clear title for %s on %s", (permission, lane, title) => {
    const request = approvalRequestFromSoftEnforcementResult(
      approvalResult({ permission, lane }),
      { requestedByDeviceId: "guest-1" },
      { now: NOW },
    );

    expect(request?.title).toBe(title);
    expect(request?.summary).toContain(`lane ${lane}`);
    expect(request?.reason).toBe("primary-host-approval-required");
    expect(request?.explain).toContain("Primary Host approval");
    expect(request?.warnings).toEqual(["soft warning"]);
    expect(request?.errors).toEqual(["soft error"]);
  });
});

describe("LucaLink approval payload preview safety", () => {
  it("redacts secrets, truncates payloads, limits depth and arrays, and preserves the original", () => {
    const payload = {
      token: "abc",
      secret: "abc",
      password: "abc",
      apiKey: "abc",
      privateKey: "abc",
      authorization: "Bearer abc",
      seed: "abc",
      mnemonic: "abc",
      nested: { level1: { level2: { level3: "too deep" } } },
      items: Array.from({ length: 12 }, (_, index) => index),
      long: "x".repeat(510),
    };

    const preview = createLucaLinkApprovalPayloadPreview(payload) as Record<
      string,
      unknown
    >;

    expect(preview.token).toBe("[redacted]");
    expect(preview.secret).toBe("[redacted]");
    expect(preview.password).toBe("[redacted]");
    expect(preview.apiKey).toBe("[redacted]");
    expect(preview.privateKey).toBe("[redacted]");
    expect(preview.authorization).toBe("[redacted]");
    expect(preview.seed).toBe("[redacted]");
    expect(preview.mnemonic).toBe("[redacted]");
    expect(String(preview.long)).toContain("[truncated]");
    expect(preview.items).toEqual([
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      "[truncated]",
    ]);
    expect(preview.nested).toEqual({
      level1: { level2: "[truncated-depth]" },
    });
    expect(payload.token).toBe("abc");
    expect(payload.items).toHaveLength(12);
  });
});

describe("LucaLink approval module import side effects", () => {
  it("does not touch browser storage, fetch, device APIs, sockets, or shell/filesystem APIs", async () => {
    const localStorageGet = vi.fn();
    const sessionStorageGet = vi.fn();
    const fetchSpy = vi.fn();
    const mediaSpy = vi.fn();
    const geoSpy = vi.fn();
    const webSocketSpy = vi.fn();

    vi.stubGlobal("localStorage", { getItem: localStorageGet });
    vi.stubGlobal("sessionStorage", { getItem: sessionStorageGet });
    vi.stubGlobal("fetch", fetchSpy);
    vi.stubGlobal("navigator", {
      mediaDevices: { getUserMedia: mediaSpy },
      geolocation: { getCurrentPosition: geoSpy },
    });
    vi.stubGlobal("WebSocket", webSocketSpy);

    await import(`./lucaLinkApprovalQueue?side-effect-check=${Date.now()}`);

    expect(localStorageGet).not.toHaveBeenCalled();
    expect(sessionStorageGet).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(mediaSpy).not.toHaveBeenCalled();
    expect(geoSpy).not.toHaveBeenCalled();
    expect(webSocketSpy).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});

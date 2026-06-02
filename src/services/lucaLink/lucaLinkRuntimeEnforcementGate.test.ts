import { describe, expect, it, vi } from "vitest";
import {
  createLucaLinkRuntimeEnforcementAuditRecord,
  evaluateLucaLinkRuntimeEnforcement,
  shouldAllowLucaLinkRuntimeEvent,
  shouldBlockLucaLinkRuntimeEvent,
  summarizeLucaLinkRuntimeEnforcementAudit,
  type LucaLinkRuntimeEnforcementInput,
} from "./lucaLinkRuntimeEnforcementGate";
import { createDefaultHostManifest } from "./capabilityRegistry";
import type { LucaLinkContinuationBridgeResult } from "./lucaLinkContinuationBridge";

const NOW = 1_700_000_000_000;
const primary = createDefaultHostManifest({
  deviceId: "primary-host",
  deviceName: "Primary Host",
  hostRole: "primary",
  now: NOW,
});
const guest = createDefaultHostManifest({
  deviceId: "guest-device",
  deviceName: "Guest Device",
  hostRole: "guest",
  now: NOW,
});

function input(payload: unknown, eventName = "message"): LucaLinkRuntimeEnforcementInput {
  return {
    scope: "outbound-send",
    eventName,
    payload,
    sourceDeviceId: "guest-device",
    targetDeviceId: "primary-host",
    now: NOW,
  };
}

const safeContinuation: LucaLinkContinuationBridgeResult = {
  decision: "can-prepare-safe-continuation",
  valid: true,
  canExecuteNow: false,
  canAutoContinue: true,
  requiresManualRetry: false,
  requiresFreshConfirmation: false,
  preparedAction: {
    tokenId: "token-safe",
    actionKind: "message",
    safeToAutoContinue: true,
    requiresManualUserAction: false,
    requiresFreshConfirmation: false,
    title: "Safe continuation",
    summary: "Safe message model only; no send, emit, retry, replay, beam, or execution.",
  },
  warnings: [],
  errors: [],
  explain: "Safe continuation model can be prepared without executing the action.",
};

function invalidContinuation(explain: string): LucaLinkContinuationBridgeResult {
  return {
    decision: "invalid-token",
    valid: false,
    canExecuteNow: false,
    canAutoContinue: false,
    requiresManualRetry: false,
    requiresFreshConfirmation: false,
    warnings: [explain],
    errors: [],
    explain,
  };
}

describe("LucaLink runtime enforcement gate modes", () => {
  it("disabled never blocks high-risk outbound actions", () => {
    const result = evaluateLucaLinkRuntimeEnforcement(
      input({ type: "tool", permission: "shell.execute", command: "echo no" }),
      { mode: "disabled", sourceManifest: guest, candidates: [primary] },
    );

    expect(result.allowed).toBe(true);
    expect(result.blocked).toBe(false);
    expect(result.decision).toBe("shadow-only");
  });

  it("observe-only evaluates but never blocks", () => {
    const result = evaluateLucaLinkRuntimeEnforcement(
      input({ type: "tool", permission: "files.write", path: "artifact.md" }),
      { mode: "observe-only", sourceManifest: guest, candidates: [primary] },
    );

    expect(result.allowed).toBe(true);
    expect(result.blocked).toBe(false);
    expect(result.decision).toBe("observe-only");
    expect(result.softEnforcement?.blocked).toBe(true);
  });

  it("high-risk-only follows soft enforcement decisions", () => {
    const result = evaluateLucaLinkRuntimeEnforcement(
      input({ type: "tool", permission: "shell.execute" }),
      { mode: "high-risk-only", sourceManifest: primary, candidates: [primary] },
    );

    expect(result.blocked).toBe(true);
    expect(result.decision).toBe("require-primary-host-approval");
  });

  it("full-outbound enforces blocked outbound decisions", () => {
    const result = evaluateLucaLinkRuntimeEnforcement(
      input({ type: "tool", permission: "shell.execute" }),
      { mode: "full-outbound", sourceManifest: guest, candidates: [primary] },
    );

    expect(result.blocked).toBe(true);
    expect(["deny", "require-primary-host-approval"]).toContain(result.decision);
  });
});

describe("LucaLink runtime enforcement normal outbound flows", () => {
  it.each([
    ["basic message", input({ type: "message", message: "hello" })],
    ["heartbeat", input({ type: "heartbeat", lastSeen: NOW }, "heartbeat")],
    ["presence", input({ type: "presence", lastSeen: NOW }, "sync")],
    ["registry sync", input({ type: "registry", devices: [] }, "sync")],
    ["guest conversation", input({ type: "desktop-to-guest", message: "safe chat" }, "desktop-to-guest")],
    ["WebRTC signaling", input({ sessionId: "safe-session", sdp: "diagnostic" }, "webrtc-offer")],
  ])("allows %s", (_name: string, event: LucaLinkRuntimeEnforcementInput) => {
    const result = evaluateLucaLinkRuntimeEnforcement(event, {
      mode: "full-outbound",
      sourceManifest: guest,
      candidates: [primary],
    });

    expect(result.allowed).toBe(true);
    expect(result.blocked).toBe(false);
  });
});

describe("LucaLink runtime enforcement high-risk gates", () => {
  it.each([
    "shell.execute",
    "files.write",
    "code.modify",
    "git.create_pr",
    "browser.control",
  ])("queues Primary Host approval for %s when callback is provided", (permission: string) => {
    const queueApproval = vi.fn(() => ({ request: { id: `approval-${permission}` } }));
    const result = evaluateLucaLinkRuntimeEnforcement(
      input({ type: "tool", permission, args: { dryRun: true } }),
      { mode: "full-outbound", sourceManifest: primary, candidates: [primary], queueApproval },
    );

    expect(queueApproval).toHaveBeenCalledTimes(1);
    expect(result.decision).toBe("queue-approval");
    expect(result.approvalRequestId).toBe(`approval-${permission}`);
    expect(result.requiresPrimaryHostApproval).toBe(true);
  });

  it("denies guest memory/tool/safety lanes without treating Origin as mesh authority", () => {
    const result = evaluateLucaLinkRuntimeEnforcement(
      input({ type: "tool", permission: "shell.execute", command: "noop" }),
      { mode: "full-outbound", sourceManifest: guest, candidates: [primary] },
    );

    expect(result.blocked).toBe(true);
    expect(JSON.stringify(result)).not.toMatch(/Origin approval/i);
    expect(result.explain).toMatch(/Primary Host|Guest hosts cannot/i);
  });

  it("blocks unknown high or critical actions", () => {
    const result = evaluateLucaLinkRuntimeEnforcement(
      input({ type: "model", kind: "critical safety action", risk: "critical" }),
      { mode: "full-outbound", sourceManifest: guest, candidates: [primary] },
    );

    expect(result.blocked).toBe(true);
    expect(result.decision).toBe("fresh-confirmation-required");
  });
});

describe("LucaLink runtime enforcement fresh confirmation", () => {
  it.each([
    ["payment.spend", { type: "tool", permission: "payment.spend", amount: 50 }],
    ["robotics.motion", { type: "tool", permission: "robotics.motion", command: "move" }],
    ["smart_home.control", { type: "tool", permission: "smart_home.control", device: "lock" }],
    ["physical actuator", { type: "message", message: "actuator physical-world command" }],
    ["critical safety", { type: "message", message: "critical safety action" }],
  ])("requires fresh confirmation for %s", (_name: string, payload: unknown) => {
    const queueApproval = vi.fn();
    const result = evaluateLucaLinkRuntimeEnforcement(input(payload), {
      mode: "full-outbound",
      sourceManifest: primary,
      candidates: [primary],
      queueApproval,
    });

    expect(result.decision).toBe("fresh-confirmation-required");
    expect(result.requiresFreshConfirmation).toBe(true);
    expect(queueApproval).not.toHaveBeenCalled();
  });
});

describe("LucaLink runtime enforcement continuation bridge", () => {
  it("prepares a valid safe continuation token for safe categories only", () => {
    const result = evaluateLucaLinkRuntimeEnforcement(
      { ...input({ type: "tool", permission: "shell.execute" }), continuationTokenId: "token-safe" },
      {
        mode: "full-outbound",
        sourceManifest: primary,
        candidates: [primary],
        allowSafeContinuation: true,
        evaluateContinuation: vi.fn(() => safeContinuation),
        prepareContinuation: vi.fn(() => safeContinuation),
      },
    );

    expect(result.decision).toBe("prepare-safe-continuation");
    expect(result.preparedContinuationTokenId).toBe("token-safe");
    expect(result.allowed).toBe(true);
  });

  it.each([
    ["manual-retry", { ...invalidContinuation("manual retry"), valid: true, requiresManualRetry: true, decision: "requires-manual-retry" as const }],
    ["fresh-confirmation", { ...invalidContinuation("fresh confirmation"), valid: true, requiresFreshConfirmation: true, decision: "requires-fresh-confirmation" as const }],
    ["expired", invalidContinuation("expired token")],
    ["consumed", invalidContinuation("consumed token")],
    ["cancelled", invalidContinuation("cancelled token")],
    ["blocked", invalidContinuation("blocked token")],
    ["mismatched", invalidContinuation("context mismatch")],
  ])("refuses %s continuation tokens", (_name: string, continuation: LucaLinkContinuationBridgeResult) => {
    const result = evaluateLucaLinkRuntimeEnforcement(
      { ...input({ type: "tool", permission: "shell.execute" }), continuationTokenId: "token-bad" },
      {
        mode: "full-outbound",
        sourceManifest: primary,
        candidates: [primary],
        allowSafeContinuation: true,
        evaluateContinuation: vi.fn(() => continuation),
      },
    );

    expect(result.allowed).toBe(false);
    expect(result.decision).not.toBe("allow-with-valid-continuation");
    expect(result.decision).not.toBe("prepare-safe-continuation");
  });
});

describe("LucaLink runtime enforcement helpers and side-effect boundaries", () => {
  it("summarizes in-memory audit records", () => {
    const allowed = evaluateLucaLinkRuntimeEnforcement(input({ message: "hi" }), { mode: "full-outbound" });
    const blocked = evaluateLucaLinkRuntimeEnforcement(input({ type: "tool", permission: "payment.spend" }), { mode: "full-outbound" });
    const records = [allowed, blocked].map(createLucaLinkRuntimeEnforcementAuditRecord);
    const summary = summarizeLucaLinkRuntimeEnforcementAudit(records);

    expect(summary.total).toBe(2);
    expect(summary.allowed).toBe(1);
    expect(summary.blocked).toBe(1);
    expect(shouldAllowLucaLinkRuntimeEvent(input({ message: "hi" }), { mode: "full-outbound" })).toBe(true);
    expect(shouldBlockLucaLinkRuntimeEvent(input({ type: "tool", permission: "payment.spend" }), { mode: "full-outbound" })).toBe(true);
  });

  it("does not touch browser storage, fetch, sockets, or action executors when imported", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const getItem = vi.fn();
    const setItem = vi.fn();
    vi.stubGlobal("localStorage", { getItem, setItem });
    vi.stubGlobal("sessionStorage", { getItem, setItem });

    await import(`./lucaLinkRuntimeEnforcementGate?side-effect-check=${Date.now()}`);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(getItem).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});

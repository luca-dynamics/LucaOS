import { describe, expect, it, vi } from "vitest";
import { LucaLinkGuestSessionStore } from "./lucaLinkGuestSessionStore";
import type { LucaLinkGuestInboundResult } from "./lucaLinkGuestSessionPolicy";

function inbound(sessionId: string): LucaLinkGuestInboundResult {
  return {
    id: "guest-inbound-test",
    timestamp: 1_700_000_000_000,
    allowed: true,
    blocked: false,
    decision: "allow",
    kind: "guest-message",
    sessionId,
    requiresAuth: false,
    rateLimited: false,
    sanitized: false,
    reason: "allowed",
    warnings: [],
    errors: [],
  };
}

describe("LucaLinkGuestSessionStore", () => {
  it("owns guest peer, security, audit, and handler state", () => {
    const store = new LucaLinkGuestSessionStore();
    const close = vi.fn();
    const peer = { close } as unknown as RTCPeerConnection;

    store.ensurePeerSession("guest-1");
    store.setPeerConnection("guest-1", peer);
    expect(store.getPeerSession("guest-1")?.peerConnection).toBe(peer);

    expect(store.ensureSecuritySession("guest-1").status).toBe("connected");
    expect(store.getSecuritySessions()).toHaveLength(1);
    expect(store.getSecuritySummary().total).toBe(1);

    store.recordInbound(inbound("guest-1"));
    expect(store.getInboundAudit()).toHaveLength(1);

    const handler = vi.fn();
    store.setMessageHandler(handler);
    store.getMessageHandler()?.("guest-1", "hello");
    expect(handler).toHaveBeenCalledWith("guest-1", "hello");

    store.dispose();
    expect(close).toHaveBeenCalled();
    expect(store.getSecuritySessions()).toEqual([]);
    expect(store.getInboundAudit()).toEqual([]);
    expect(store.getMessageHandler()).toBeNull();
  });
});

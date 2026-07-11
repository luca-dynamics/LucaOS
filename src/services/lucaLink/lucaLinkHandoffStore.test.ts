import { describe, expect, it } from "vitest";
import { LucaLinkHandoffStore } from "./lucaLinkHandoffStore";

const NOW = 1_700_000_000_000;

describe("LucaLinkHandoffStore", () => {
  it("owns handoff registry state and delegates lifecycle transitions", () => {
    const store = new LucaLinkHandoffStore();
    const created = store.register({
      kind: "conversation",
      id: "handoff-1",
      payload: { kind: "conversation", summary: "Move the chat" },
      requestedByDeviceId: "phone",
      targetDeviceId: "desktop",
    });

    expect(created.valid).toBe(true);
    expect(store.list()).toHaveLength(1);
    expect(store.get("handoff-1")?.kind).toBe("conversation");
    expect(store.summarize().total).toBe(1);

    expect(
      store.approve("handoff-1", {
        now: NOW + 1,
        approvedByDeviceId: "primary",
      }).request?.status,
    ).toBe("approved");
    expect(store.markSent("handoff-1", { now: NOW + 2 }).request?.status).toBe(
      "sent",
    );
    expect(
      store.markReceived("handoff-1", { now: NOW + 3 }).request?.status,
    ).toBe("received");
    expect(
      store.markAccepted("handoff-1", { now: NOW + 4 }).request?.status,
    ).toBe("accepted");
  });

  it("lists pending handoffs, expires stale handoffs, and clears state", () => {
    const store = new LucaLinkHandoffStore();
    const created = store.register({
      kind: "memory-intent",
      id: "pending-memory",
      payload: { kind: "memory-intent", summary: "Continue memory intent" },
      requiresPrimaryHostApproval: true,
      ttlMs: 10,
    });
    const createdAt = created.request?.createdAt ?? Date.now();

    expect(store.listPending(createdAt)).toHaveLength(1);
    expect(store.expire(createdAt + 11).expired).toHaveLength(1);
    expect(store.listPending(createdAt + 12)).toHaveLength(0);
    expect(store.summarize().expired).toBe(1);

    store.clear();
    expect(store.list()).toEqual([]);
  });
});

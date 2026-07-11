import { beforeEach, describe, expect, it } from "vitest";
import { LucaLinkApprovalStore } from "./lucaLinkApprovalStore";

describe("LucaLinkApprovalStore", () => {
  let store: LucaLinkApprovalStore;

  beforeEach(() => {
    store = new LucaLinkApprovalStore();
  });

  it("owns queue state and exposes approval decisions", () => {
    const queued = store.enqueue({
      source: "manual",
      eventName: "test-event",
      permission: "test.permission",
      risk: "low",
      title: "Approve test request",
      summary: "A test request",
      reason: "Test coverage",
      explain: "Test coverage",
    });

    expect(queued.request?.status).toBe("pending");
    expect(store.getPending()).toHaveLength(1);
    expect(store.summarize()).toMatchObject({ total: 1, pending: 1 });

    const approved = store.approve(queued.request!.id, {
      decidedByDeviceId: "primary-host",
      reason: "Approved in test",
    });

    expect(approved.request?.status).toBe("approved");
    expect(store.getPending()).toHaveLength(0);
    expect(store.list()[0]?.decision?.decidedByDeviceId).toBe("primary-host");
  });

  it("supports soft-enforcement requests and clearing state", () => {
    const queued = store.enqueueSoftEnforcement(
      {
        decision: "requires-primary-host-approval",
        reason: "Needs review",
        blocked: true,
        requiresPrimaryHostApproval: true,
        explain: "Primary Host review is required.",
        warnings: [],
        errors: [],
        eventName: "runtime.test",
        lane: "conversation",
        permission: "conversation.send",
        risk: "medium",
      },
      { requestedByDeviceId: "companion-1" },
    );

    expect(queued.request?.source).toBe("soft-enforcement");
    expect(store.summarize().pending).toBe(1);
    store.clear();
    expect(store.list()).toEqual([]);
  });
});

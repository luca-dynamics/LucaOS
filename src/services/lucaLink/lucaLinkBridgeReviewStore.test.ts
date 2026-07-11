import { describe, expect, it } from "vitest";
import { LucaLinkBridgeReviewStore } from "./lucaLinkBridgeReviewStore";

const NOW = 1_700_000_000_000;

describe("LucaLinkBridgeReviewStore", () => {
  it("owns bridge review registry state and delegates review transitions", () => {
    const store = new LucaLinkBridgeReviewStore();
    const review = store.createFromBlueprint({
      id: "blueprint-1",
      strategyKind: "python-host-agent",
      title: "Python host",
      summary: "Review only",
      risk: "high",
    });

    expect(store.list()).toHaveLength(1);
    expect(store.get(review.id)?.strategyKind).toBe("python-host-agent");
    expect(store.summarize().pendingReview).toBe(1);

    const approved = store.approveForSandbox(review.id, {
      approvedByDeviceId: "primary",
      now: NOW,
    });
    expect(approved?.status).toBe("approved-for-sandbox");
    expect(approved?.approvedByDeviceId).toBe("primary");

    const rejected = store.reject(review.id, {
      reason: "Not needed",
      now: NOW + 1,
    });
    expect(rejected?.status).toBe("rejected");

    const cancelled = store.cancel(review.id, {
      reason: "Closed",
      now: NOW + 2,
    });
    expect(cancelled?.status).toBe("cancelled");
  });
});

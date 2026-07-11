import { beforeEach, describe, expect, it } from "vitest";
import {
  createLucaLinkApprovalRequest,
  type LucaLinkApprovalRequest,
} from "./lucaLinkApprovalQueue";
import { LucaLinkContinuationStore } from "./lucaLinkContinuationStore";

function approvedRequest(): LucaLinkApprovalRequest {
  const now = Date.now();
  const request = createLucaLinkApprovalRequest(
    {
      eventName: "message",
      lane: "tool",
      permission: "files.write",
      risk: "high",
      requestedByDeviceId: "device-a",
      requestedTargetDeviceId: "primary-host",
      title: "Approve file write?",
      summary: "Primary Host approval requested.",
      explain: "Primary Host approval is required.",
      payloadPreview: { redacted: true },
    },
    { now },
  );
  request.status = "approved";
  request.updatedAt = now + 100;
  request.decision = {
    decision: "approve",
    decidedAt: request.updatedAt,
    decidedByDeviceId: "primary-host",
  };
  return request;
}

describe("LucaLinkContinuationStore", () => {
  let store: LucaLinkContinuationStore;

  beforeEach(() => {
    store = new LucaLinkContinuationStore();
  });

  it("owns registration and validation of approval continuations", () => {
    const registered = store.createFromApprovalRequest(approvedRequest());
    const token = registered.token;

    expect(registered.created).toBe(true);
    expect(token).toBeDefined();
    expect(store.list()).toHaveLength(1);
    expect(store.listValid()).toHaveLength(1);
    expect(
      store.validate(token!.id, {
        permission: "files.write",
        requestedByDeviceId: "device-a",
        requestedTargetDeviceId: "primary-host",
      }).valid,
    ).toBe(true);
  });

  it("supports cancellation and registry cleanup", () => {
    const token = store.createFromApprovalRequest(approvedRequest()).token!;
    expect(store.cancel(token.id, "No longer needed").cancelled).toBe(true);
    expect(store.summarize().cancelled).toBe(1);
    store.clear();
    expect(store.list()).toEqual([]);
  });
});

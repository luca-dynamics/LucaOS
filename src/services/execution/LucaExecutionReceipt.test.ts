import { describe, expect, it } from "vitest";
import { createExecutionEvidenceRef, createExecutionReceipt, getExecutionReceiptSnapshot } from "./LucaExecutionReceipt";

describe("LucaExecutionReceipt", () => {
  it("creates evidence-only receipts with runtime behavior unchanged", () => {
    const evidence = createExecutionEvidenceRef({ id: "evidence-1", kind: "test_result", summary: "Targeted tests passed" });
    const receipt = createExecutionReceipt({
      id: "receipt-1",
      source: "tool",
      status: "verified",
      summary: "Verified architecture-only change",
      evidenceRefs: [evidence],
      riskLevel: "low",
      actorTier: "origin",
      createdAt: "2026-05-28T00:00:00.000Z",
    });
    const snapshot = getExecutionReceiptSnapshot({ receipts: [receipt] });

    expect(receipt.runtimeBehaviorChanged).toBe(false);
    expect(evidence.runtimeBehaviorChanged).toBe(false);
    expect(snapshot.evidenceOnly).toBe(true);
    expect(snapshot.persistenceEnabled).toBe(false);
    expect(snapshot.liveExecutionEnabled).toBe(false);
    expect(snapshot.networkCallsEnabled).toBe(false);
    expect(snapshot.summary.verified).toBe(1);
  });
});

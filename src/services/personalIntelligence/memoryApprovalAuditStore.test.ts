import { beforeEach, describe, expect, it } from "vitest";
import { createMemoryApprovalAuditRecord } from "../../personal-intelligence/approval";
import {
  appendMemoryApprovalAuditRecords,
  readMemoryApprovalAuditRecords,
  summarizeStoredMemoryApprovalAudit,
} from "./memoryApprovalAuditStore";

// Map-backed StorageLike so the store is testable in the node env without
// jsdom / localStorage.
function fakeStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    _map: map,
  };
}

const rec = (
  overrides: Partial<Parameters<typeof createMemoryApprovalAuditRecord>[0]> = {},
) =>
  createMemoryApprovalAuditRecord({
    auditId: "audit:1",
    proposalId: "proposal:1",
    eventType: "live_write_completed",
    summary: "wrote",
    timestamp: "2026-07-04T12:00:00.000Z",
    ...overrides,
  });

describe("memoryApprovalAuditStore", () => {
  let storage: ReturnType<typeof fakeStorage>;
  beforeEach(() => {
    storage = fakeStorage();
  });

  it("reads empty when nothing has been written", () => {
    expect(readMemoryApprovalAuditRecords(storage)).toEqual([]);
  });

  it("appends and persists records across reads", () => {
    appendMemoryApprovalAuditRecords([rec({ auditId: "a" })], storage);
    appendMemoryApprovalAuditRecords(
      [rec({ auditId: "b", eventType: "live_write_blocked" })],
      storage,
    );
    const trail = readMemoryApprovalAuditRecords(storage);
    expect(trail.map((r) => r.auditId)).toEqual(["a", "b"]);
  });

  it("summarizes the durable trail", () => {
    appendMemoryApprovalAuditRecords(
      [
        rec({ auditId: "a", eventType: "live_write_completed", sideEffectsPerformed: true }),
        rec({ auditId: "b", eventType: "live_write_blocked" }),
        rec({ auditId: "c", eventType: "dry_run_completed" }),
      ],
      storage,
    );
    const summary = summarizeStoredMemoryApprovalAudit(storage);
    expect(summary.totalRecords).toBe(3);
    expect(summary.sideEffectsPerformedCount).toBe(1);
    expect(summary.blockedCount).toBe(1);
  });

  it("caps the history and keeps the most recent records", () => {
    const many = Array.from({ length: 520 }, (_, i) =>
      rec({ auditId: `a${i}` }),
    );
    appendMemoryApprovalAuditRecords(many, storage);
    const trail = readMemoryApprovalAuditRecords(storage);
    expect(trail).toHaveLength(500);
    expect(trail[trail.length - 1].auditId).toBe("a519");
  });

  it("degrades to a no-op empty trail with no storage", () => {
    // No storage passed and no localStorage in the node env.
    expect(readMemoryApprovalAuditRecords()).toEqual([]);
    expect(() => appendMemoryApprovalAuditRecords([rec()])).not.toThrow();
  });
});

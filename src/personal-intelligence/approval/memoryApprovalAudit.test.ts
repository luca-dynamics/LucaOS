import { describe, expect, it } from "vitest";
import {
  createMemoryApprovalAuditRecord,
  summarizeMemoryApprovalAudit,
} from "./index";

describe("memory approval audit", () => {
  it("creates and summarizes pure in-memory audit values", () => {
    const records = [
      createMemoryApprovalAuditRecord({
        auditId: "approval-audit:1",
        proposalId: "proposal:1",
        eventType: "dry_run_completed",
        summary: "Dry-run completed without side effects.",
        adapterResultStatus: "dry_run",
        now: () => new Date("2026-06-07T12:00:00.000Z"),
      }),
      createMemoryApprovalAuditRecord({
        auditId: "approval-audit:2",
        proposalId: "proposal:1",
        eventType: "live_write_blocked",
        summary: "Pilot remained disabled.",
        blockers: ["Pilot disabled."],
      }),
    ];

    expect(records[0].sideEffectsPerformed).toBe(false);
    expect(summarizeMemoryApprovalAudit(records)).toMatchObject({
      totalRecords: 2,
      proposalIds: ["proposal:1"],
      sideEffectsPerformedCount: 0,
      blockedCount: 1,
    });
  });
});

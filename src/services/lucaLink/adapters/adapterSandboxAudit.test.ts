import { describe, expect, it } from "vitest";
import {
  createAdapterSandboxAuditRecord,
  summarizeAdapterSandboxAudit,
} from "./adapterSandboxAudit";
import { LUCA_LINK_SAFE_DISPLAY_ADAPTER_FIXTURE } from "./adapterSandboxFixtures";
import { createLucaLinkAdapterSandboxPlan } from "./adapterSandboxRuntime";

function plan(enabled: boolean) {
  return createLucaLinkAdapterSandboxPlan({
    manifest: LUCA_LINK_SAFE_DISPLAY_ADAPTER_FIXTURE,
    config: { enabled },
    requestedByHostId: "host-a",
    targetHostId: "host-b",
  });
}

describe("LucaLink adapter sandbox audit", () => {
  it("creates immutable-style audit data with no side effects", () => {
    const record = createAdapterSandboxAuditRecord({
      plan: plan(false),
      timestamp: "2026-06-07T12:00:00.000Z",
    });
    expect(record.eventType).toBe("plan_blocked");
    expect(record.sideEffectsPerformed).toBe(false);
    expect(record.summary).toMatch(/no side effects performed/i);
  });

  it("summarizes blocked and approval-required dry-run records", () => {
    const records = [
      createAdapterSandboxAuditRecord({
        plan: plan(false),
        timestamp: "2026-06-07T12:00:00.000Z",
      }),
      createAdapterSandboxAuditRecord({
        plan: plan(true),
        timestamp: "2026-06-07T12:01:00.000Z",
      }),
    ];
    expect(summarizeAdapterSandboxAudit(records)).toEqual({
      total: 2,
      blocked: 1,
      approvalRequired: 1,
      dryRunReady: 0,
      sideEffectsPerformed: false,
    });
  });
});

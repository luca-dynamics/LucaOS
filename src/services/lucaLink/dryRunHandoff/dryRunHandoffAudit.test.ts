import { describe, expect, it } from "vitest";
import { createLucaLinkDryRunHandoffAuditRecord, summarizeLucaLinkDryRunHandoffAudit } from "./dryRunHandoffAudit";
import { LUCA_LINK_DRY_RUN_DISPLAY_APPROVAL_FIXTURE, LUCA_LINK_DRY_RUN_TRANSPORT_BLOCKED_FIXTURE } from "./dryRunHandoffFixtures";

describe("LucaLink dry-run audit", () => {
  it("creates and summarizes immutable review evidence", () => {
    const records = [createLucaLinkDryRunHandoffAuditRecord(LUCA_LINK_DRY_RUN_DISPLAY_APPROVAL_FIXTURE), createLucaLinkDryRunHandoffAuditRecord(LUCA_LINK_DRY_RUN_TRANSPORT_BLOCKED_FIXTURE)];
    expect(records.map((item) => item.eventType)).toEqual(["approval_required", "blocked"]);
    expect(summarizeLucaLinkDryRunHandoffAudit(records)).toMatchObject({ totalRecords: 2, approvalRequired: 1, blocked: 1, sideEffectsPerformed: false });
  });
});

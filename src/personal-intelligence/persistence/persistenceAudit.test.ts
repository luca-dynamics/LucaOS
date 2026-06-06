import { describe, expect, it } from "vitest";
import {
  appendPersistenceAuditRecord,
  createPersistenceAuditRecord,
  summarizePersistenceAudit,
} from "./index";

const timestamp = "2026-06-06T12:00:00.000Z";

describe("persistence audit records", () => {
  it("creates and appends in-memory records with side effects fixed to false", () => {
    const created = createPersistenceAuditRecord({
      auditId: "audit-1",
      proposalId: "proposal-1",
      eventType: "created",
      actor: "test",
      summary: "Created a proposal in memory.",
      privacyZone: "private",
      timestamp,
      notes: ["No persistence target was contacted."],
    });
    const records = appendPersistenceAuditRecord([], created);

    expect(created.sideEffectsPerformed).toBe(false);
    expect(records).toEqual([created]);
    expect(summarizePersistenceAudit(records)).toMatchObject({
      totalRecords: 1,
      recordsByEventType: { created: 1 },
      sideEffectsPerformed: false,
    });
  });
});

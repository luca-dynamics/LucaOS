import { describe, expect, it } from "vitest";
import type { MemoryItem } from "../memory/memoryTypes";
import {
  createMemoryPersistenceProposal,
  createPersistenceAuditRecord,
  createRollbackPlanForProposal,
  markPersistenceProposalApprovedForFutureAdapter,
  summarizePersistenceReadiness,
} from "./index";

const timestamp = "2026-06-06T12:00:00.000Z";
const item: MemoryItem = {
  id: "memory-private",
  kind: "preference",
  title: "Private preference",
  content: "Use explicit review gates.",
  source: "readiness-test",
  confidence: 0.95,
  privacyZone: "private",
  tags: [],
  createdAt: timestamp,
  updatedAt: timestamp,
};

function proposal() {
  return createMemoryPersistenceProposal(item, {
    proposalId: "proposal-private",
    proposedPath: "memory/private-preference.json",
    now: () => new Date(timestamp),
  });
}

function validationAudit() {
  return createPersistenceAuditRecord({
    auditId: "audit-validated",
    proposalId: "proposal-private",
    eventType: "validated",
    timestamp,
    actor: "test",
    summary: "Validated without side effects.",
    privacyZone: "private",
  });
}

describe("persistence readiness", () => {
  it("is false when blockers exist", () => {
    const blocked = { ...proposal(), blockers: ["Review is blocked."] };
    expect(
      summarizePersistenceReadiness([blocked], [validationAudit()], []),
    ).toMatchObject({
      blocked: 1,
      readyForFuturePersistenceAdapter: false,
    });
  });

  it("requires rollback planning before future-adapter readiness", () => {
    const approved = markPersistenceProposalApprovedForFutureAdapter(
      proposal(),
      {
        approvedBy: "user",
        approvedAt: timestamp,
        explicitUserApproval: true,
      },
    );
    const withoutPlan = summarizePersistenceReadiness(
      [approved],
      [validationAudit()],
      [],
    );

    expect(withoutPlan.missingRollbackPlanCount).toBe(1);
    expect(withoutPlan.readyForFuturePersistenceAdapter).toBe(false);
  });

  it("can become ready only for a future adapter while all side effects remain false", () => {
    const approved = markPersistenceProposalApprovedForFutureAdapter(
      proposal(),
      {
        approvedBy: "user",
        approvedAt: timestamp,
        explicitUserApproval: true,
      },
    );
    const plan = createRollbackPlanForProposal(approved, {
      status: "ready_for_future_adapter",
    });
    const readiness = summarizePersistenceReadiness(
      [approved],
      [validationAudit()],
      [plan],
    );

    expect(readiness.readyForFuturePersistenceAdapter).toBe(true);
    expect(approved.writePerformed).toBe(false);
    expect(plan.sideEffectsPerformed).toBe(false);
  });
});

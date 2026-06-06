import { describe, expect, it } from "vitest";
import type { MemoryItem } from "../memory/memoryTypes";
import {
  createDeletePlanForProposal,
  createMemoryPersistenceProposal,
  createRollbackPlanForProposal,
  validateRollbackPlan,
} from "./index";

const timestamp = "2026-06-06T12:00:00.000Z";
const item: MemoryItem = {
  id: "memory-1",
  kind: "decision",
  title: "Decision",
  content: "Keep review gates.",
  source: "rollback-test",
  confidence: 1,
  privacyZone: "project",
  tags: [],
  createdAt: timestamp,
  updatedAt: timestamp,
};

function proposal(requestedOperation: "create" | "delete") {
  return createMemoryPersistenceProposal(item, {
    proposalId: `proposal-${requestedOperation}`,
    proposedPath: "memory/decision.json",
    requestedOperation,
    now: () => new Date(timestamp),
  });
}

describe("rollback and delete planning", () => {
  it("creates plans without executing rollback or deletion", () => {
    const rollback = createRollbackPlanForProposal(proposal("create"));
    const deletion = createDeletePlanForProposal(proposal("delete"));

    expect(validateRollbackPlan(rollback).valid).toBe(true);
    expect(validateRollbackPlan(deletion).valid).toBe(true);
    expect(rollback.requiredBeforeWrite).toBe(true);
    expect(deletion.sideEffectsPerformed).toBe(false);
  });

  it("rejects an incomplete plan", () => {
    const plan = {
      ...createRollbackPlanForProposal(proposal("create")),
      steps: [],
    };
    expect(validateRollbackPlan(plan)).toMatchObject({ valid: false });
  });
});

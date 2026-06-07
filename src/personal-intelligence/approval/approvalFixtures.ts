import type { MemoryNode } from "../../types";
import type { MemoryServiceAdapterDependency } from "../adapters";
import { createMemoryItem } from "../memory/memoryStore";
import {
  markPersistenceProposalApprovedForFutureAdapter,
  createMemoryPersistenceProposal,
  createPersistenceAuditRecord,
  createRollbackPlanForProposal,
  evaluatePersistencePolicy,
} from "../persistence";

const FIXTURE_TIMESTAMP = "2026-06-07T12:00:00.000Z";
const fixtureNow = () => new Date(FIXTURE_TIMESTAMP);

const memoryItem = createMemoryItem(
  {
    id: "memory:project-update-preference",
    kind: "preference",
    title: "Project update preference",
    content:
      "Prefers concise project updates with explicit decisions and next steps.",
    source: "personal-intelligence-approval-safe-fixture",
    confidence: 0.98,
    privacyZone: "project",
    tags: ["preference", "project-updates"],
  },
  fixtureNow,
);

const draftProposal = createMemoryPersistenceProposal(memoryItem, {
  proposalId: "proposal:project-update-preference",
  proposedPath: "memory/preferences/project-update-preference.json",
  status: "review_required",
  requestedOperation: "create",
  auditRefs: ["audit:project-update-preference:validated"],
  now: fixtureNow,
});

export const SAFE_MEMORY_APPROVAL_PROPOSAL_FIXTURE =
  markPersistenceProposalApprovedForFutureAdapter(draftProposal, {
    approvedBy: "user",
    approvedAt: FIXTURE_TIMESTAMP,
    explicitUserApproval: true,
    approvalNote: "Approved safe preference fixture for governed pilot testing.",
  });

export const SAFE_MEMORY_APPROVAL_POLICY_FIXTURE = evaluatePersistencePolicy(
  SAFE_MEMORY_APPROVAL_PROPOSAL_FIXTURE,
  { policyId: "policy:memory-approval-pilot" },
);

export const SAFE_MEMORY_APPROVAL_AUDIT_FIXTURES = [
  createPersistenceAuditRecord({
    auditId: "audit:project-update-preference:validated",
    proposalId: SAFE_MEMORY_APPROVAL_PROPOSAL_FIXTURE.proposalId,
    eventType: "validated",
    actor: "test",
    summary: "Safe fixture proposal passed validation without side effects.",
    privacyZone: SAFE_MEMORY_APPROVAL_PROPOSAL_FIXTURE.privacyZone,
    now: fixtureNow,
  }),
];

export const SAFE_MEMORY_APPROVAL_ROLLBACK_FIXTURES = [
  createRollbackPlanForProposal(SAFE_MEMORY_APPROVAL_PROPOSAL_FIXTURE, {
    status: "ready_for_future_adapter",
    reason: "Remove the created preference memory if verification fails.",
  }),
];

export function createDryRunOnlyMemoryServiceDependency(): MemoryServiceAdapterDependency {
  return {
    async saveMemory(): Promise<MemoryNode | null> {
      throw new Error("Dry-run dependency must never be invoked.");
    },
  };
}

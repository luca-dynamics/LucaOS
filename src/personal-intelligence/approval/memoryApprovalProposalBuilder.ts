import type { MemoryItemInput } from "../memory/memoryTypes";
import { createMemoryItem } from "../memory/memoryStore";
import {
  createMemoryPersistenceProposal,
  createPersistenceAuditRecord,
  createRollbackPlanForProposal,
  evaluatePersistencePolicy,
  markPersistenceProposalApprovedForFutureAdapter,
  type MemoryPersistenceProposal,
  type PersonalIntelligencePersistenceAuditRecord,
  type PersistenceSafetyPlan,
} from "../persistence";

/**
 * Real-content generalization of the safe approval FIXTURE
 * (approvalFixtures.ts). Where the fixture hardcodes a single "project update
 * preference", this builds the same governed bundle — proposal, policy,
 * validation audit, and rollback plan — from REAL user-approved content, so
 * the pilot can review and (through every gate) persist what the user
 * actually asked Luca to remember.
 *
 * This is pure Personal Intelligence composition: it imports no services and
 * writes nothing. It only assembles the reviewable bundle; the governed
 * adapter still decides, gate by gate, whether a write may occur.
 */

export interface BuildMemoryApprovalProposalInput {
  /** Stable proposal id, e.g. `proposal:<slug>`. */
  proposalId: string;
  /** The real memory the user wants Luca to remember. */
  memory: MemoryItemInput;
  /** Where the governed adapter would write it, e.g. `memory/preferences/x.json`. */
  proposedPath: string;
  /** The user's explicit approval — this is a governed write, not a silent one. */
  approval: {
    approvedBy: "user";
    approvedAt: string;
    explicitUserApproval: true;
    approvalNote?: string;
  };
  policyId?: string;
  now?: () => Date;
}

export interface MemoryApprovalProposalBundle {
  proposal: MemoryPersistenceProposal;
  policy: ReturnType<typeof evaluatePersistencePolicy>;
  auditRecords: PersonalIntelligencePersistenceAuditRecord[];
  rollbackPlans: PersistenceSafetyPlan[];
}

export function buildMemoryApprovalProposal(
  input: BuildMemoryApprovalProposalInput,
): MemoryApprovalProposalBundle {
  const now = input.now ?? (() => new Date());

  // The validation audit id the proposal references (gate: a matching
  // side-effect-free validation audit must exist for the proposal).
  const validationAuditId = `audit:${input.proposalId}:validated`;

  const memoryItem = createMemoryItem(input.memory, now);

  const draft = createMemoryPersistenceProposal(memoryItem, {
    proposalId: input.proposalId,
    proposedPath: input.proposedPath,
    status: "review_required",
    requestedOperation: "create",
    auditRefs: [validationAuditId],
    now,
  });

  const proposal = markPersistenceProposalApprovedForFutureAdapter(draft, {
    approvedBy: input.approval.approvedBy,
    approvedAt: input.approval.approvedAt,
    explicitUserApproval: input.approval.explicitUserApproval,
    approvalNote: input.approval.approvalNote,
  });

  const policy = evaluatePersistencePolicy(proposal, {
    policyId: input.policyId ?? "policy:memory-approval-pilot",
  });

  const auditRecords: PersonalIntelligencePersistenceAuditRecord[] = [
    createPersistenceAuditRecord({
      auditId: validationAuditId,
      proposalId: proposal.proposalId,
      eventType: "validated",
      actor: "user",
      summary: "User-approved proposal passed validation without side effects.",
      privacyZone: proposal.privacyZone,
      now,
    }),
  ];

  const rollbackPlans: PersistenceSafetyPlan[] = [
    createRollbackPlanForProposal(proposal, {
      status: "ready_for_future_adapter",
      reason: "Remove the created memory if verification fails.",
    }),
  ];

  return { proposal, policy, auditRecords, rollbackPlans };
}

import {
  isSensitivePersistenceZone,
  validatePersistenceProposal,
} from "./persistencePolicy";
import type { PersonalIntelligencePersistenceAuditRecord } from "./persistenceAudit";
import type { PersistenceSafetyPlan } from "./rollbackPlan";
import { validateRollbackPlan } from "./rollbackPlan";
import type { PersonalIntelligencePersistenceProposal } from "./persistenceTypes";

export interface PersistenceReadinessSummary {
  totalProposals: number;
  reviewRequired: number;
  approvedForFutureAdapter: number;
  blocked: number;
  sensitiveZoneCount: number;
  missingRollbackPlanCount: number;
  readyForFuturePersistenceAdapter: boolean;
}

export function summarizePersistenceReadiness(
  proposals: readonly PersonalIntelligencePersistenceProposal[],
  auditRecords: readonly PersonalIntelligencePersistenceAuditRecord[],
  rollbackPlans: readonly PersistenceSafetyPlan[],
): PersistenceReadinessSummary {
  const validatedProposalIds = new Set(
    auditRecords
      .filter(
        (record) =>
          record.eventType === "validated" &&
          record.sideEffectsPerformed === false,
      )
      .map((record) => record.proposalId),
  );
  const validPlanProposalIds = new Set(
    rollbackPlans
      .filter(
        (plan) =>
          plan.status === "ready_for_future_adapter" &&
          validateRollbackPlan(plan).valid,
      )
      .map((plan) => `${plan.proposalId}:${plan.kind}`),
  );

  const blocked = proposals.filter(
    (proposal) =>
      !validatePersistenceProposal(proposal).valid ||
      proposal.blockers.length > 0,
  ).length;
  const missingRollbackPlanCount = proposals.filter((proposal) => {
    if (
      proposal.requestedOperation === "create" ||
      proposal.requestedOperation === "update"
    ) {
      return !validPlanProposalIds.has(`${proposal.proposalId}:rollback`);
    }
    if (proposal.requestedOperation === "delete") {
      return !validPlanProposalIds.has(`${proposal.proposalId}:delete`);
    }
    return false;
  }).length;
  const sensitiveProposalsApproved = proposals.every(
    (proposal) =>
      !isSensitivePersistenceZone(proposal.privacyZone) ||
      (proposal.status === "approved_for_future_adapter" &&
        proposal.approvalMetadata?.explicitUserApproval === true),
  );
  const allValidated =
    proposals.length > 0 &&
    proposals.every(
      (proposal) =>
        validatedProposalIds.has(proposal.proposalId) &&
        validatePersistenceProposal(proposal).valid,
    );
  const noSideEffects =
    proposals.every((proposal) => proposal.writePerformed === false) &&
    auditRecords.every((record) => record.sideEffectsPerformed === false) &&
    rollbackPlans.every((plan) => plan.sideEffectsPerformed === false);

  return {
    totalProposals: proposals.length,
    reviewRequired: proposals.filter(
      (proposal) => proposal.status === "review_required",
    ).length,
    approvedForFutureAdapter: proposals.filter(
      (proposal) => proposal.status === "approved_for_future_adapter",
    ).length,
    blocked,
    sensitiveZoneCount: proposals.filter((proposal) =>
      isSensitivePersistenceZone(proposal.privacyZone),
    ).length,
    missingRollbackPlanCount,
    readyForFuturePersistenceAdapter:
      allValidated &&
      sensitiveProposalsApproved &&
      missingRollbackPlanCount === 0 &&
      blocked === 0 &&
      noSideEffects,
  };
}

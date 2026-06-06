import type { LearningLogEntry } from "../learning/learningTypes";
import { requiresExplicitPersistenceApproval } from "./persistencePolicy";
import type {
  LearningPersistenceProposal,
  LearningPersistenceProposalOptions,
} from "./persistenceTypes";

export function createLearningPersistenceProposal(
  learningEvent: LearningLogEntry,
  options: LearningPersistenceProposalOptions,
): LearningPersistenceProposal {
  const timestamp = (options.now ?? (() => new Date()))().toISOString();
  const proposal: LearningPersistenceProposal = {
    proposalId: options.proposalId,
    kind: "learning",
    title: options.title ?? `Persist learning event: ${learningEvent.eventId}`,
    summary:
      options.summary ??
      `Proposal to ${options.requestedOperation ?? "create"} a governed learning event.`,
    source: options.source ?? learningEvent.source ?? "",
    createdAt: options.createdAt ?? timestamp,
    updatedAt: options.updatedAt ?? timestamp,
    privacyZone: options.privacyZone ?? learningEvent.privacyZone ?? "private",
    confidence: options.confidence ?? learningEvent.confidence ?? 0.5,
    status: options.status ?? "review_required",
    requestedOperation: options.requestedOperation ?? "create",
    targetRef: options.targetRef,
    serializedPreview: options.serializedPreview,
    approvalRequired: true,
    explicitUserApprovalRequired: false,
    blockers: [...(options.blockers ?? [])],
    warnings: [...(options.warnings ?? [])],
    auditRefs: [...(options.auditRefs ?? [])],
    learningEvent: {
      ...learningEvent,
      relatedMemoryItemIds: learningEvent.relatedMemoryItemIds
        ? [...learningEvent.relatedMemoryItemIds]
        : undefined,
    },
    relatedMissionId:
      options.relatedMissionId ?? learningEvent.relatedMissionId,
    relatedMemoryItemIds: options.relatedMemoryItemIds
      ? [...options.relatedMemoryItemIds]
      : learningEvent.relatedMemoryItemIds
        ? [...learningEvent.relatedMemoryItemIds]
        : undefined,
    writePerformed: false,
  };
  return {
    ...proposal,
    explicitUserApprovalRequired: requiresExplicitPersistenceApproval(proposal),
  };
}

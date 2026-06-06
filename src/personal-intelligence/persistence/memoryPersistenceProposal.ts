import type { MemoryItem } from "../memory/memoryTypes";
import { requiresExplicitPersistenceApproval } from "./persistencePolicy";
import type {
  MemoryPersistenceProposal,
  MemoryPersistenceProposalOptions,
  PersistenceApprovalMetadata,
  PersonalIntelligencePersistenceProposal,
} from "./persistenceTypes";

export function createMemoryPersistenceProposal(
  memoryItem: MemoryItem,
  options: MemoryPersistenceProposalOptions,
): MemoryPersistenceProposal {
  const timestamp = (options.now ?? (() => new Date()))().toISOString();
  const proposal: MemoryPersistenceProposal = {
    proposalId: options.proposalId,
    kind: "memory",
    title: options.title ?? `Persist memory: ${memoryItem.title}`,
    summary:
      options.summary ??
      `Proposal to ${options.requestedOperation ?? "create"} a governed memory item.`,
    source: options.source ?? memoryItem.source,
    createdAt: options.createdAt ?? timestamp,
    updatedAt: options.updatedAt ?? timestamp,
    privacyZone: options.privacyZone ?? memoryItem.privacyZone,
    confidence: options.confidence ?? memoryItem.confidence,
    status: options.status ?? "review_required",
    requestedOperation: options.requestedOperation ?? "create",
    targetRef: options.targetRef,
    serializedPreview: options.serializedPreview,
    approvalRequired: true,
    explicitUserApprovalRequired: false,
    blockers: [...(options.blockers ?? [])],
    warnings: [...(options.warnings ?? [])],
    auditRefs: [...(options.auditRefs ?? [])],
    memoryItem: cloneMemoryItem(memoryItem),
    proposedPath: options.proposedPath,
    serializedContentPreview:
      options.serializedContentPreview ?? JSON.stringify(memoryItem, null, 2),
    format: options.format ?? "json",
    writePerformed: false,
  };
  return {
    ...proposal,
    explicitUserApprovalRequired: requiresExplicitPersistenceApproval(proposal),
  };
}

export function markPersistenceProposalApprovedForFutureAdapter<
  T extends PersonalIntelligencePersistenceProposal,
>(proposal: T, approvalMetadata: PersistenceApprovalMetadata): T {
  return cloneProposal({
    ...proposal,
    status: "approved_for_future_adapter",
    approvalMetadata: { ...approvalMetadata },
    updatedAt: approvalMetadata.approvedAt,
    writePerformed: false,
  } as T);
}

export function rejectPersistenceProposal<
  T extends PersonalIntelligencePersistenceProposal,
>(proposal: T, reason: string): T {
  return transitionProposal(proposal, "rejected", reason);
}

export function cancelPersistenceProposal<
  T extends PersonalIntelligencePersistenceProposal,
>(proposal: T, reason: string): T {
  return transitionProposal(proposal, "cancelled", reason);
}

function transitionProposal<T extends PersonalIntelligencePersistenceProposal>(
  proposal: T,
  status: "rejected" | "cancelled",
  reason: string,
): T {
  return cloneProposal({
    ...proposal,
    status,
    warnings: [...proposal.warnings, reason],
    writePerformed: false,
  } as T);
}

function cloneProposal<T extends PersonalIntelligencePersistenceProposal>(
  proposal: T,
): T {
  const common = {
    ...proposal,
    blockers: [...proposal.blockers],
    warnings: [...proposal.warnings],
    auditRefs: [...proposal.auditRefs],
    approvalMetadata: proposal.approvalMetadata
      ? { ...proposal.approvalMetadata }
      : undefined,
  };
  if (proposal.kind === "memory") {
    return {
      ...common,
      memoryItem: cloneMemoryItem(proposal.memoryItem),
    } as T;
  }
  return {
    ...common,
    learningEvent: {
      ...proposal.learningEvent,
      relatedMemoryItemIds: proposal.learningEvent.relatedMemoryItemIds
        ? [...proposal.learningEvent.relatedMemoryItemIds]
        : undefined,
    },
    relatedMemoryItemIds: proposal.relatedMemoryItemIds
      ? [...proposal.relatedMemoryItemIds]
      : undefined,
  } as T;
}

function cloneMemoryItem(memoryItem: MemoryItem): MemoryItem {
  return { ...memoryItem, tags: [...memoryItem.tags] };
}

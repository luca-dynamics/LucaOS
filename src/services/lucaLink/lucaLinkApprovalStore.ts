/**
 * Manager-owned LucaLink approval state.
 *
 * The queue model stays pure and transport-free; this store owns its mutable
 * state so the relay adapter only coordinates delivery and host events.
 */
import {
  approveLucaLinkApprovalRequest,
  cancelLucaLinkApprovalRequest,
  clearLucaLinkApprovalQueue,
  createLucaLinkApprovalQueue,
  denyLucaLinkApprovalRequest,
  enqueueApprovalForSoftEnforcementResult,
  enqueueLucaLinkApprovalRequest,
  getLucaLinkApprovalRequest,
  getPendingLucaLinkApprovalRequests,
  listLucaLinkApprovalRequests,
  summarizeLucaLinkApprovalQueue,
  type LucaLinkApprovalDecisionInput,
  type LucaLinkApprovalMutationResult,
  type LucaLinkApprovalQueueSummary,
  type LucaLinkApprovalRequest,
  type LucaLinkApprovalRequestInput,
  type LucaLinkApprovalQueueState,
  type LucaLinkApprovalSoftEnforcementResult,
} from "./lucaLinkApprovalQueue";

export class LucaLinkApprovalStore {
  private readonly state: LucaLinkApprovalQueueState =
    createLucaLinkApprovalQueue();

  getPending(): LucaLinkApprovalRequest[] {
    return getPendingLucaLinkApprovalRequests(this.state);
  }

  list(): LucaLinkApprovalRequest[] {
    return listLucaLinkApprovalRequests(this.state);
  }

  get(requestId: string): LucaLinkApprovalRequest | undefined {
    return getLucaLinkApprovalRequest(this.state, requestId);
  }

  summarize(): LucaLinkApprovalQueueSummary {
    return summarizeLucaLinkApprovalQueue(this.state);
  }

  enqueue(input: LucaLinkApprovalRequestInput): LucaLinkApprovalMutationResult {
    return enqueueLucaLinkApprovalRequest(this.state, input);
  }

  approve(
    requestId: string,
    decision?: LucaLinkApprovalDecisionInput,
  ): LucaLinkApprovalMutationResult {
    return approveLucaLinkApprovalRequest(this.state, requestId, decision);
  }

  deny(
    requestId: string,
    decision?: LucaLinkApprovalDecisionInput,
  ): LucaLinkApprovalMutationResult {
    return denyLucaLinkApprovalRequest(this.state, requestId, decision);
  }

  cancel(
    requestId: string,
    decision?: LucaLinkApprovalDecisionInput,
  ): LucaLinkApprovalMutationResult {
    return cancelLucaLinkApprovalRequest(this.state, requestId, decision);
  }

  clear(): LucaLinkApprovalMutationResult {
    return clearLucaLinkApprovalQueue(this.state);
  }

  enqueueSoftEnforcement(
    result: LucaLinkApprovalSoftEnforcementResult,
    context: Parameters<typeof enqueueApprovalForSoftEnforcementResult>[2],
  ): LucaLinkApprovalMutationResult {
    return enqueueApprovalForSoftEnforcementResult(
      this.state,
      result,
      context,
    );
  }
}

export const lucaLinkApprovalStore = new LucaLinkApprovalStore();

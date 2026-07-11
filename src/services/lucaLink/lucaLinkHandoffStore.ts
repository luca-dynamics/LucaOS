/**
 * Manager-owned LucaLink handoff state.
 *
 * Handoff payload shaping and policy evaluation stay pure; this store owns the
 * mutable registry used by the relay adapter and manager facade.
 */
import {
  approveLucaLinkHandoff,
  cancelLucaLinkHandoff,
  clearLucaLinkHandoffRegistry,
  createLucaLinkHandoffRegistry,
  declineLucaLinkHandoff,
  expireLucaLinkHandoffs,
  getLucaLinkHandoff,
  listLucaLinkHandoffs,
  listPendingLucaLinkHandoffs,
  markLucaLinkHandoffAccepted,
  markLucaLinkHandoffReceived,
  markLucaLinkHandoffSent,
  registerLucaLinkHandoff,
  summarizeLucaLinkHandoffRegistry,
  type LucaLinkHandoffMutationResult,
  type LucaLinkHandoffRegistrySummary,
  type LucaLinkHandoffRequest,
  type LucaLinkHandoffRequestInput,
} from "./lucaLinkHandoff";

type HandoffTransitionOptions = {
  now?: number;
  reason?: string;
};

export class LucaLinkHandoffStore {
  private readonly state = createLucaLinkHandoffRegistry();

  get defaultTtlMs(): number {
    return this.state.defaultTtlMs;
  }

  list(): LucaLinkHandoffRequest[] {
    return listLucaLinkHandoffs(this.state);
  }

  listPending(now?: number): LucaLinkHandoffRequest[] {
    return listPendingLucaLinkHandoffs(this.state, now);
  }

  get(handoffId: string): LucaLinkHandoffRequest | undefined {
    return getLucaLinkHandoff(this.state, handoffId);
  }

  summarize(now?: number): LucaLinkHandoffRegistrySummary {
    return summarizeLucaLinkHandoffRegistry(this.state, now);
  }

  clear(): LucaLinkHandoffMutationResult {
    return clearLucaLinkHandoffRegistry(this.state);
  }

  register(
    requestOrInput: LucaLinkHandoffRequest | LucaLinkHandoffRequestInput,
  ): LucaLinkHandoffMutationResult {
    return registerLucaLinkHandoff(this.state, requestOrInput);
  }

  approve(
    handoffId: string,
    options?: HandoffTransitionOptions & { approvedByDeviceId?: string },
  ): LucaLinkHandoffMutationResult {
    return approveLucaLinkHandoff(this.state, handoffId, options);
  }

  decline(
    handoffId: string,
    options?: HandoffTransitionOptions,
  ): LucaLinkHandoffMutationResult {
    return declineLucaLinkHandoff(this.state, handoffId, options);
  }

  cancel(
    handoffId: string,
    options?: HandoffTransitionOptions,
  ): LucaLinkHandoffMutationResult {
    return cancelLucaLinkHandoff(this.state, handoffId, options);
  }

  markSent(
    handoffId: string,
    options?: HandoffTransitionOptions,
  ): LucaLinkHandoffMutationResult {
    return markLucaLinkHandoffSent(this.state, handoffId, options);
  }

  markReceived(
    handoffId: string,
    options?: HandoffTransitionOptions,
  ): LucaLinkHandoffMutationResult {
    return markLucaLinkHandoffReceived(this.state, handoffId, options);
  }

  markAccepted(
    handoffId: string,
    options?: HandoffTransitionOptions,
  ): LucaLinkHandoffMutationResult {
    return markLucaLinkHandoffAccepted(this.state, handoffId, options);
  }

  expire(now?: number): LucaLinkHandoffMutationResult {
    return expireLucaLinkHandoffs(this.state, now);
  }
}

export const lucaLinkHandoffStore = new LucaLinkHandoffStore();

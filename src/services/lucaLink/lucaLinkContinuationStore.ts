/**
 * Manager-owned LucaLink continuation state.
 *
 * Token policy and bridge evaluation remain pure; this store owns the mutable
 * registry used by the manager and transport-facing adapter.
 */
import {
  consumePreparedLucaLinkContinuation,
  evaluateLucaLinkContinuationBridge,
  prepareLucaLinkSafeContinuation,
  type LucaLinkContinuationBridgeInput,
  type LucaLinkContinuationBridgeResult,
} from "./lucaLinkContinuationBridge";
import {
  cancelLucaLinkContinuationToken,
  clearLucaLinkContinuationRegistry,
  consumeLucaLinkContinuationToken,
  createLucaLinkContinuationRegistry,
  expireLucaLinkContinuationTokens,
  getValidLucaLinkContinuationTokens,
  listLucaLinkContinuationTokens,
  registerLucaLinkContinuation,
  registerContinuationFromApprovalRequest,
  summarizeLucaLinkContinuationRegistry,
  validateLucaLinkContinuationToken,
  type LucaLinkContinuationMutationResult,
  type LucaLinkContinuationRegistryState,
  type LucaLinkContinuationRegistrySummary,
  type LucaLinkContinuationToken,
  type LucaLinkContinuationValidationContext,
  type LucaLinkContinuationValidationResult,
} from "./lucaLinkContinuation";
import type { LucaLinkApprovalRequest } from "./lucaLinkApprovalQueue";

export class LucaLinkContinuationStore {
  private readonly state: LucaLinkContinuationRegistryState =
    createLucaLinkContinuationRegistry();

  list(): LucaLinkContinuationToken[] {
    return listLucaLinkContinuationTokens(this.state);
  }

  listValid(): LucaLinkContinuationToken[] {
    return getValidLucaLinkContinuationTokens(this.state);
  }

  summarize(): LucaLinkContinuationRegistrySummary {
    return summarizeLucaLinkContinuationRegistry(this.state);
  }

  clear(): LucaLinkContinuationMutationResult {
    return clearLucaLinkContinuationRegistry(this.state);
  }

  createFromApprovalRequest(
    request: LucaLinkApprovalRequest,
  ): LucaLinkContinuationMutationResult {
    return registerContinuationFromApprovalRequest(this.state, request);
  }

  register(token: LucaLinkContinuationToken): LucaLinkContinuationMutationResult {
    return registerLucaLinkContinuation(this.state, token);
  }

  validate(
    tokenId: string,
    context?: LucaLinkContinuationValidationContext,
  ): LucaLinkContinuationValidationResult {
    return validateLucaLinkContinuationToken(this.state, tokenId, context);
  }

  consume(
    tokenId: string,
    context?: LucaLinkContinuationValidationContext & {
      consumedByDeviceId?: string;
      reason?: string;
    },
  ): LucaLinkContinuationMutationResult {
    return consumeLucaLinkContinuationToken(this.state, tokenId, context);
  }

  cancel(tokenId: string, reason?: string): LucaLinkContinuationMutationResult {
    return cancelLucaLinkContinuationToken(this.state, tokenId, { reason });
  }

  evaluate(
    tokenId: string,
    context: Omit<LucaLinkContinuationBridgeInput, "tokenId"> = {},
  ): LucaLinkContinuationBridgeResult {
    return evaluateLucaLinkContinuationBridge(this.state, {
      ...context,
      tokenId,
    });
  }

  prepare(
    tokenId: string,
    context: Omit<LucaLinkContinuationBridgeInput, "tokenId"> = {},
  ): LucaLinkContinuationBridgeResult {
    return prepareLucaLinkSafeContinuation(this.state, {
      ...context,
      tokenId,
    });
  }

  consumePrepared(
    tokenId: string,
    context: Omit<LucaLinkContinuationBridgeInput, "tokenId"> & {
      consumedByDeviceId?: string;
      reason?: string;
    } = {},
  ): LucaLinkContinuationBridgeResult {
    const prepared = this.prepare(tokenId, context);
    if (!prepared.preparedAction) return prepared;
    return consumePreparedLucaLinkContinuation(
      this.state,
      prepared.preparedAction,
      context,
    );
  }

  expire(now?: number): LucaLinkContinuationMutationResult {
    return expireLucaLinkContinuationTokens(this.state, now);
  }
}

export const lucaLinkContinuationStore = new LucaLinkContinuationStore();

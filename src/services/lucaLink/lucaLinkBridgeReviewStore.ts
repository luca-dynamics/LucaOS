/**
 * Manager-owned LucaLink bridge review state.
 *
 * Bridge review evaluation remains pure; this store owns review registry
 * mutations so the relay adapter does not manage review records directly.
 */
import {
  approveBridgeReviewForSandbox,
  cancelBridgeReview,
  createLucaLinkBridgeReviewRecord,
  createLucaLinkBridgeReviewRegistry,
  getBridgeReview,
  listBridgeReviews,
  registerBridgeReview,
  rejectBridgeReview,
  summarizeBridgeReviews,
  updateBridgeReview,
  type LucaLinkBridgeReviewRecord,
  type LucaLinkBridgeReviewSummary,
} from "./lucaLinkBridgeReview";
import type { LucaLinkHostBridgeBlueprint } from "./lucaLinkHostAdaptation";

export class LucaLinkBridgeReviewStore {
  private readonly state = createLucaLinkBridgeReviewRegistry();

  list(): LucaLinkBridgeReviewRecord[] {
    return listBridgeReviews(this.state);
  }

  get(reviewId: string): LucaLinkBridgeReviewRecord | undefined {
    return getBridgeReview(this.state, reviewId);
  }

  summarize(): LucaLinkBridgeReviewSummary {
    return summarizeBridgeReviews(this.list());
  }

  createFromBlueprint(
    input: Partial<LucaLinkHostBridgeBlueprint>,
  ): LucaLinkBridgeReviewRecord {
    return registerBridgeReview(
      this.state,
      createLucaLinkBridgeReviewRecord(input),
    );
  }

  register(review: LucaLinkBridgeReviewRecord): LucaLinkBridgeReviewRecord {
    return registerBridgeReview(this.state, review);
  }

  update(
    review: LucaLinkBridgeReviewRecord,
  ): LucaLinkBridgeReviewRecord | undefined {
    return updateBridgeReview(this.state, review);
  }

  approveForSandbox(
    reviewId: string,
    options?: { approvedByDeviceId?: string; now?: number },
  ): LucaLinkBridgeReviewRecord | undefined {
    const review = this.get(reviewId);
    if (!review) return undefined;
    return this.update(approveBridgeReviewForSandbox(review, options));
  }

  reject(
    reviewId: string,
    options?: { reason?: string; now?: number },
  ): LucaLinkBridgeReviewRecord | undefined {
    const review = this.get(reviewId);
    if (!review) return undefined;
    return this.update(rejectBridgeReview(review, options));
  }

  cancel(
    reviewId: string,
    options?: { reason?: string; now?: number },
  ): LucaLinkBridgeReviewRecord | undefined {
    const review = this.get(reviewId);
    if (!review) return undefined;
    return this.update(cancelBridgeReview(review, options));
  }
}

export const lucaLinkBridgeReviewStore = new LucaLinkBridgeReviewStore();

/**
 * Manager-owned LucaLink adapter draft state.
 *
 * Adapter draft generation remains model-only and text-only; this store owns
 * the mutable draft registry used by Device Center and runtime QA surfaces.
 */
import {
  createAdapterDraftFromBlueprint,
  createAdapterDraftFromBridgeReview,
  createLucaLinkAdapterDraftRegistry,
  getAdapterDraft,
  listAdapterDrafts,
  registerAdapterDraft,
  summarizeAdapterDrafts,
  updateAdapterDraft,
  type LucaLinkAdapterDraft,
  type LucaLinkAdapterDraftSummary,
} from "./lucaLinkAdapterDrafts";
import type { LucaLinkBridgeReviewRecord } from "./lucaLinkBridgeReview";
import type { LucaLinkHostBridgeBlueprint } from "./lucaLinkHostAdaptation";

export class LucaLinkAdapterDraftStore {
  private readonly state = createLucaLinkAdapterDraftRegistry();

  list(): LucaLinkAdapterDraft[] {
    return listAdapterDrafts(this.state);
  }

  get(draftId: string): LucaLinkAdapterDraft | undefined {
    return getAdapterDraft(this.state, draftId);
  }

  summarize(): LucaLinkAdapterDraftSummary {
    return summarizeAdapterDrafts(this.list());
  }

  register(draft: LucaLinkAdapterDraft): LucaLinkAdapterDraft {
    return registerAdapterDraft(this.state, draft);
  }

  createFromBlueprint(
    input: Partial<LucaLinkHostBridgeBlueprint>,
  ): LucaLinkAdapterDraft {
    return this.register(createAdapterDraftFromBlueprint(input));
  }

  createFromBridgeReview(review: LucaLinkBridgeReviewRecord): LucaLinkAdapterDraft {
    return this.register(createAdapterDraftFromBridgeReview(review));
  }

  cancel(draftId: string, now = Date.now()): LucaLinkAdapterDraft | undefined {
    const draft = this.get(draftId);
    if (!draft) return undefined;
    return updateAdapterDraft(this.state, {
      ...draft,
      status: "cancelled",
      updatedAt: now,
    });
  }

  clear(): void {
    this.state.records = [];
  }
}

export const lucaLinkAdapterDraftStore = new LucaLinkAdapterDraftStore();

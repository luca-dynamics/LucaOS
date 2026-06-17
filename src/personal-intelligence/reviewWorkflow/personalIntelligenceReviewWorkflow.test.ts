import { describe, expect, it } from "vitest";
import {
  cancelMemoryReviewPreview,
  confirmMemoryReviewPreview,
  createMemoryReviewActionPreview,
  createMemoryReviewWorkflowState,
  createPersonalIntelligenceReviewOperationSummary,
  emptyPersonalIntelligenceReviewWorkflowGraphFixture,
  personalIntelligenceReviewWorkflowGraphFixture,
  PROTECTED_REVIEW_WORKFLOW_FIXTURE_VALUE,
  selectMemoryReviewItem,
  sensitiveInferredReviewWorkflowFixture,
  syncRiskReviewWorkflowFixture,
} from ".";

const now = new Date("2026-06-09T12:00:00.000Z");

function serialized(value: unknown): string {
  return JSON.stringify(value);
}

describe("Personal Intelligence review workflow", () => {
  it("creates workflow state from the memory control review queue", () => {
    const state = createMemoryReviewWorkflowState(personalIntelligenceReviewWorkflowGraphFixture, {
      mode: "pro",
      now,
      workflowId: "workflow:test",
    });

    expect(state.workflowId).toBe("workflow:test");
    expect(state.items.length).toBeGreaterThan(0);
    expect(state.queue.sideEffectsPerformed).toBe(false);
    expect(state.sideEffectsPerformed).toBe(false);
    expect(state.persistencePerformed).toBe(false);
  });

  it("creates review-only state for an empty graph", () => {
    const state = createMemoryReviewWorkflowState(emptyPersonalIntelligenceReviewWorkflowGraphFixture, {
      mode: "basic",
      now,
    });

    expect(state.phase).toBe("review_only");
    expect(state.items).toEqual([]);
    expect(state.result?.requiresUserReview).toBe(false);
  });

  it("selects an existing memory without creating side effects", () => {
    const state = createMemoryReviewWorkflowState(personalIntelligenceReviewWorkflowGraphFixture, { mode: "pro", now });
    const selected = selectMemoryReviewItem(state, "memory-control:pending-preference", "approve_memory");

    expect(selected.phase).toBe("selected");
    expect(selected.selection?.targetMemoryId).toBe("memory-control:pending-preference");
    expect(selected.selection?.selectedAction).toBe("approve_memory");
    expect(selected.sideEffectsPerformed).toBe(false);
  });

  it("returns a blocked state when selecting a missing memory", () => {
    const state = createMemoryReviewWorkflowState(personalIntelligenceReviewWorkflowGraphFixture, { mode: "pro", now });
    const selected = selectMemoryReviewItem(state, "memory-control:missing", "approve_memory");

    expect(selected.phase).toBe("blocked");
    expect(selected.result?.reason).toBe("target_not_found");
    expect(selected.result?.persistencePerformed).toBe(false);
  });

  it("previews by composing memoryControls preview helpers", () => {
    const state = createMemoryReviewWorkflowState(personalIntelligenceReviewWorkflowGraphFixture, { mode: "pro", now });
    const previewed = createMemoryReviewActionPreview(
      personalIntelligenceReviewWorkflowGraphFixture,
      state,
      "memory-control:pending-preference",
      "approve_memory",
      { now },
    );

    expect(previewed.preview?.summary).toContain("approve memory preview");
    expect(previewed.preview?.currentStateSummary?.approvalState).toBe("pending");
    expect(previewed.preview?.proposedStateSummary?.approvalState).toBe("approved");
    expect(previewed.preview?.sideEffectsPerformed).toBe(false);
  });

  it("approve_memory preview does not mutate the original graph", () => {
    const before = serialized(personalIntelligenceReviewWorkflowGraphFixture);
    const state = createMemoryReviewWorkflowState(personalIntelligenceReviewWorkflowGraphFixture, { mode: "pro", now });

    createMemoryReviewActionPreview(
      personalIntelligenceReviewWorkflowGraphFixture,
      state,
      "memory-control:pending-preference",
      "approve_memory",
      { now },
    );

    expect(serialized(personalIntelligenceReviewWorkflowGraphFixture)).toBe(before);
  });

  it("forget_memory requires confirmation", () => {
    const state = createMemoryReviewWorkflowState(personalIntelligenceReviewWorkflowGraphFixture, { mode: "creator", now });
    const previewed = createMemoryReviewActionPreview(
      personalIntelligenceReviewWorkflowGraphFixture,
      state,
      "memory-control:normal-preference",
      "forget_memory",
      { now },
    );

    expect(previewed.phase).toBe("confirmation_required");
    expect(previewed.preview?.requiresConfirmation).toBe(true);
  });

  it("sensitive/private correction requires review confirmation", () => {
    const state = createMemoryReviewWorkflowState(personalIntelligenceReviewWorkflowGraphFixture, { mode: "creator", now });
    const previewed = createMemoryReviewActionPreview(
      personalIntelligenceReviewWorkflowGraphFixture,
      state,
      sensitiveInferredReviewWorkflowFixture.id,
      "correct_memory",
      { changes: { summary: "Fictional redacted correction." }, now },
    );

    expect(previewed.preview?.decision).toBe("approval_required");
    expect(previewed.preview?.requiresUserReview).toBe(true);
    expect(previewed.preview?.requiresConfirmation).toBe(true);
  });

  it("confirm returns a confirmed result but never persists or mutates", () => {
    const state = createMemoryReviewWorkflowState(personalIntelligenceReviewWorkflowGraphFixture, { mode: "creator", now });
    const previewed = createMemoryReviewActionPreview(
      personalIntelligenceReviewWorkflowGraphFixture,
      state,
      "memory-control:normal-preference",
      "forget_memory",
      { now },
    );
    const confirmed = confirmMemoryReviewPreview(previewed);

    expect(confirmed.phase).toBe("confirmed");
    expect(confirmed.result?.confirmed).toBe(true);
    expect(confirmed.result?.persistencePerformed).toBe(false);
    expect(confirmed.result?.mutationPerformed).toBe(false);
    expect(confirmed.eventSummary).toContain("persistence is deferred");
  });

  it("cancel returns a cancelled result without mutation", () => {
    const before = serialized(personalIntelligenceReviewWorkflowGraphFixture);
    const state = createMemoryReviewWorkflowState(personalIntelligenceReviewWorkflowGraphFixture, { mode: "pro", now });
    const previewed = createMemoryReviewActionPreview(
      personalIntelligenceReviewWorkflowGraphFixture,
      state,
      "memory-control:normal-preference",
      "archive_memory",
      { now },
    );
    const cancelled = cancelMemoryReviewPreview(previewed);

    expect(cancelled.phase).toBe("cancelled");
    expect(cancelled.result?.confirmed).toBe(false);
    expect(serialized(personalIntelligenceReviewWorkflowGraphFixture)).toBe(before);
  });

  it("Basic hides raw memory IDs and protected values", () => {
    const state = createMemoryReviewWorkflowState(personalIntelligenceReviewWorkflowGraphFixture, { mode: "basic", now });
    const sensitive = state.items.find((item) => item.memoryId === sensitiveInferredReviewWorkflowFixture.id);
    const previewed = createMemoryReviewActionPreview(
      personalIntelligenceReviewWorkflowGraphFixture,
      state,
      sensitiveInferredReviewWorkflowFixture.id,
      "correct_memory",
      { changes: { summary: "Fictional redacted correction." }, now },
    );

    expect(sensitive?.title).toBe("Protected memory");
    expect(sensitive?.displayId).toBeUndefined();
    expect(previewed.preview?.targetMemoryId).toBe("hidden");
    expect(serialized(previewed)).not.toContain(PROTECTED_REVIEW_WORKFLOW_FIXTURE_VALUE);
  });

  it("Pro shows counts/metadata but not protected values", () => {
    const state = createMemoryReviewWorkflowState(personalIntelligenceReviewWorkflowGraphFixture, { mode: "pro", now });
    const syncRisk = state.items.find((item) => item.memoryId === syncRiskReviewWorkflowFixture.id);

    expect(syncRisk?.reasonCount).toBeGreaterThan(0);
    expect(syncRisk?.sensitivity).toBe("secret");
    expect(serialized(state)).not.toContain(PROTECTED_REVIEW_WORKFLOW_FIXTURE_VALUE);
  });

  it("Creator shows safe audit/event flags but not protected raw values", () => {
    const state = createMemoryReviewWorkflowState(personalIntelligenceReviewWorkflowGraphFixture, { mode: "creator", now });
    const syncRisk = state.items.find((item) => item.memoryId === syncRiskReviewWorkflowFixture.id);
    const previewed = createMemoryReviewActionPreview(
      personalIntelligenceReviewWorkflowGraphFixture,
      state,
      syncRiskReviewWorkflowFixture.id,
      "mark_do_not_sync",
      { now },
    );

    expect(syncRisk?.audit?.safeMemoryId).toBe(syncRiskReviewWorkflowFixture.id);
    expect(previewed.result?.sideEffectsPerformed).toBe(false);
    expect(previewed.result?.persistencePerformed).toBe(false);
    expect(serialized(previewed)).not.toContain(PROTECTED_REVIEW_WORKFLOW_FIXTURE_VALUE);
  });

  it("all output paths include side effect and persistence false flags", () => {
    const state = createMemoryReviewWorkflowState(personalIntelligenceReviewWorkflowGraphFixture, { mode: "creator", now });
    const previewed = createMemoryReviewActionPreview(
      personalIntelligenceReviewWorkflowGraphFixture,
      state,
      "memory-control:normal-preference",
      "archive_memory",
      { now },
    );
    const confirmed = confirmMemoryReviewPreview(previewed);
    const cancelled = cancelMemoryReviewPreview(previewed);

    for (const output of [state, previewed, confirmed, cancelled]) {
      expect(output.sideEffectsPerformed).toBe(false);
      expect(output.persistencePerformed).toBe(false);
      expect(output.mutationPerformed).toBe(false);
      expect(output.result?.sideEffectsPerformed).toBe(false);
      expect(output.result?.persistencePerformed).toBe(false);
      expect(output.result?.mutationPerformed).toBe(false);
    }
  });

  it("leaves the original graph unchanged after select, preview, confirm, and cancel", () => {
    const before = serialized(personalIntelligenceReviewWorkflowGraphFixture);
    const state = createMemoryReviewWorkflowState(personalIntelligenceReviewWorkflowGraphFixture, { mode: "creator", now });
    const selected = selectMemoryReviewItem(state, "memory-control:normal-preference", "archive_memory");
    const previewed = createMemoryReviewActionPreview(
      personalIntelligenceReviewWorkflowGraphFixture,
      selected,
      "memory-control:normal-preference",
      "archive_memory",
      { now },
    );
    confirmMemoryReviewPreview(previewed);
    cancelMemoryReviewPreview(previewed);

    expect(serialized(personalIntelligenceReviewWorkflowGraphFixture)).toBe(before);
  });

  it("creates a pure Operation Center style summary without writing events", () => {
    const state = createMemoryReviewWorkflowState(personalIntelligenceReviewWorkflowGraphFixture, { mode: "creator", now });
    const previewed = createMemoryReviewActionPreview(
      personalIntelligenceReviewWorkflowGraphFixture,
      state,
      "memory-control:normal-preference",
      "forget_memory",
      { now },
    );

    expect(createPersonalIntelligenceReviewOperationSummary(previewed.result!)).toBe(
      "Personal Intelligence review preview: confirmation required. Action: forget memory. Persistence: deferred. Side effects: none.",
    );
  });
});

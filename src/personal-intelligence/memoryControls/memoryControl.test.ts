import { describe, expect, it } from "vitest";
import { shouldSurfaceMemoryInCreator } from "../memoryGraph";
import {
  conflictingPreferenceMemoryControlFixture,
  createMemoryControlReviewQueue,
  evaluateMemoryControlAction,
  expiredTemporaryContextMemoryControlFixture,
  normalPreferenceMemoryControlFixture,
  pendingApprovalMemoryControlFixture,
  personalMemoryControlGraphFixture,
  previewMemoryControlAction,
  sensitiveInferredMemoryControlFixture,
  staleProjectMemoryControlFixture,
  syncRiskMemoryControlFixture,
  temporaryContextMemoryControlFixture,
} from ".";
import type { PersonalMemoryControlAction } from ".";

const now = new Date("2026-06-09T12:00:00.000Z");

function preview(action: PersonalMemoryControlAction, targetMemoryId: string, extras = {}) {
  return previewMemoryControlAction(
    personalMemoryControlGraphFixture,
    { targetMemoryId, action, ...extras },
    { now },
  );
}

describe("memory control previews", () => {
  it("previews approval without mutating the original node or graph", () => {
    const before = JSON.stringify(personalMemoryControlGraphFixture);
    const result = preview("approve_memory", pendingApprovalMemoryControlFixture.id);

    expect(result.proposedNode?.approvalState).toBe("approved");
    expect(result.proposedNode?.lifecycle).toBe("active");
    expect(pendingApprovalMemoryControlFixture.approvalState).toBe("pending");
    expect(JSON.stringify(personalMemoryControlGraphFixture)).toBe(before);
    expect(result.sideEffectsPerformed).toBe(false);
  });

  it("previews denial without mutating the original node or graph", () => {
    const before = JSON.stringify(personalMemoryControlGraphFixture);
    const result = preview("deny_memory", pendingApprovalMemoryControlFixture.id);

    expect(result.proposedNode?.approvalState).toBe("denied");
    expect(result.proposedNode?.lifecycle).toBe("pending_approval");
    expect(JSON.stringify(personalMemoryControlGraphFixture)).toBe(before);
    expect(result.proposedNode && shouldSurfaceMemoryInCreator(result.proposedNode, now)).toBe(false);
  });

  it("previews forgetting as a forgotten lifecycle that cannot surface as active", () => {
    const result = preview("forget_memory", normalPreferenceMemoryControlFixture.id);

    expect(result.decision).toBe("approval_required");
    expect(result.proposedNode?.lifecycle).toBe("forgotten");
    expect(result.proposedNode && shouldSurfaceMemoryInCreator(result.proposedNode, now)).toBe(false);
  });

  it("previews do-not-sync as local-only with sync disabled", () => {
    const result = preview("mark_do_not_sync", normalPreferenceMemoryControlFixture.id);

    expect(result.proposedNode?.privacy).toMatchObject({ localOnly: true, allowSync: false });
  });

  it("blocks sync allowance for sensitive and secret memory", () => {
    for (const node of [sensitiveInferredMemoryControlFixture, syncRiskMemoryControlFixture]) {
      const result = preview("mark_sync_allowed", node.id);
      expect(result.decision).toBe("blocked");
      expect(result.reason).toBe("sensitive_memory_cannot_sync");
    }
  });

  it("requires a valid future expiration when making memory temporary", () => {
    const missing = preview("make_temporary", normalPreferenceMemoryControlFixture.id);
    const valid = preview("make_temporary", normalPreferenceMemoryControlFixture.id, {
      expiresAt: "2026-06-11T12:00:00.000Z",
    });

    expect(missing.decision).toBe("blocked");
    expect(missing.reason).toBe("expiration_required");
    expect(valid.decision).toBe("allowed");
    expect(valid.proposedNode?.expiresAt).toBe("2026-06-11T12:00:00.000Z");
  });

  it("requires review for edits and corrections to sensitive or private memory", () => {
    const sensitive = evaluateMemoryControlAction(
      sensitiveInferredMemoryControlFixture,
      "correct_memory",
      { changes: { summary: "Corrected protected fixture." }, now },
    );
    const privateMemory = evaluateMemoryControlAction(
      temporaryContextMemoryControlFixture,
      "edit_memory",
      { changes: { title: "Updated fixture" }, now },
    );

    expect(sensitive.decision).toBe("approval_required");
    expect(sensitive.reason).toBe("sensitive_change_requires_review");
    expect(privateMemory.decision).toBe("approval_required");
    expect(privateMemory.reason).toBe("private_change_requires_review");
  });

  it("requires restore and review before editing expired memory", () => {
    const result = evaluateMemoryControlAction(
      expiredTemporaryContextMemoryControlFixture,
      "edit_memory",
      { changes: { title: "Updated fixture" }, now },
    );

    expect(result.decision).toBe("blocked");
    expect(result.reason).toBe("inactive_memory_requires_restore");
  });

  it("marks every supported action preview as side-effect free", () => {
    const actions: PersonalMemoryControlAction[] = [
      "approve_memory",
      "deny_memory",
      "forget_memory",
      "correct_memory",
      "edit_memory",
      "make_temporary",
      "make_private",
      "mark_do_not_sync",
      "mark_sync_allowed",
      "archive_memory",
      "restore_memory",
    ];

    for (const action of actions) {
      const result = previewMemoryControlAction(
        personalMemoryControlGraphFixture,
        {
          targetMemoryId: normalPreferenceMemoryControlFixture.id,
          action,
          changes: { summary: "Harmless preview correction." },
          expiresAt: "2026-06-11T12:00:00.000Z",
        },
        { now },
      );
      expect(result.sideEffectsPerformed).toBe(false);
      expect(result.summary).toContain("No changes were applied");
    }
  });
});

describe("memory control review queue", () => {
  it("redacts protected content and raw metadata in Basic", () => {
    const queue = createMemoryControlReviewQueue(personalMemoryControlGraphFixture, "basic", now);
    const sensitive = queue.items.find(
      (item) => item.memoryId === sensitiveInferredMemoryControlFixture.id,
    );

    expect(sensitive).toMatchObject({
      title: "Protected memory",
      redacted: true,
      category: undefined,
      sensitivity: undefined,
      audit: undefined,
    });
    expect(sensitive?.detail).not.toContain("protected fictional detail");
    expect(queue.sideEffectsPerformed).toBe(false);
  });

  it("provides category, sensitivity, and staleness metadata in Pro", () => {
    const basic = createMemoryControlReviewQueue(personalMemoryControlGraphFixture, "basic", now);
    const pro = createMemoryControlReviewQueue(personalMemoryControlGraphFixture, "pro", now);
    const basicPending = basic.items.find(
      (item) => item.memoryId === pendingApprovalMemoryControlFixture.id,
    );
    const proPending = pro.items.find(
      (item) => item.memoryId === pendingApprovalMemoryControlFixture.id,
    );

    expect(basicPending?.category).toBeUndefined();
    expect(proPending).toMatchObject({
      category: "preference",
      sensitivity: "personal",
      staleness: "fresh",
    });
  });

  it("provides safe audit metadata in Creator without revealing protected values", () => {
    const queue = createMemoryControlReviewQueue(personalMemoryControlGraphFixture, "creator", now);
    const sensitive = queue.items.find(
      (item) => item.memoryId === sensitiveInferredMemoryControlFixture.id,
    );

    expect(sensitive?.audit).toMatchObject({
      source: "assistant_inferred",
      confidence: "low",
      evidenceCount: 1,
    });
    expect(sensitive?.audit?.evidenceIds).toEqual(["evidence:fictional"]);
    expect(sensitive?.title).toBe("Protected memory");
    expect(sensitive?.detail).not.toContain("fictional-protected-value");
  });

  it("surfaces pending, stale, conflicting, sync-risk, and temporary review reasons", () => {
    const queue = createMemoryControlReviewQueue(personalMemoryControlGraphFixture, "pro", now);
    const byId = new Map(queue.items.map((item) => [item.memoryId, item]));

    expect(byId.get(pendingApprovalMemoryControlFixture.id)?.reasons).toContain("pending_approval");
    expect(byId.get(staleProjectMemoryControlFixture.id)?.reasons).toContain("stale_important");
    expect(byId.get(conflictingPreferenceMemoryControlFixture.id)?.reasons).toContain("conflict");
    expect(byId.get(syncRiskMemoryControlFixture.id)?.reasons).toContain("sync_risk");
    expect(byId.get(expiredTemporaryContextMemoryControlFixture.id)?.reasons).toContain(
      "temporary_expired",
    );
  });
});

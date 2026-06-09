import { describe, expect, it } from "vitest";
import { previewMemoryControlAction, personalMemoryControlGraphFixture } from "../memoryControls";
import {
  confirmMemoryReviewPreview,
  createMemoryReviewActionPreview,
  createMemoryReviewWorkflowState,
  personalIntelligenceReviewWorkflowGraphFixture,
} from "../reviewWorkflow";
import {
  archivePersistenceCandidate,
  blockedPreviewPersistenceCandidate,
  cancelledPersistenceCandidate,
  confirmedApprovePersistenceCandidate,
  confirmedForgetPersistenceCandidate,
  doNotSyncPersistenceCandidate,
  missingPreviousStateRollbackPersistenceCandidate,
  privateMemoryPersistenceCandidate,
  PROTECTED_PERSISTENCE_BOUNDARY_FIXTURE_VALUE,
  sensitiveCorrectionPersistenceCandidate,
  syncRiskPersistenceCandidate,
} from "./personalIntelligencePersistenceBoundaryFixtures";
import {
  createPersistenceBoundaryOperationSummary,
  createPersistenceCandidateFromMemoryControlPreview,
  createPersistenceCandidateFromReviewResult,
  evaluatePersistenceBoundary,
  summarizePersistenceBoundaryResult,
} from "./personalIntelligencePersistenceBoundaryHelpers";
import helpersSource from "./personalIntelligencePersistenceBoundaryHelpers.ts?raw";
import policySource from "./personalIntelligencePersistenceBoundaryPolicy.ts?raw";
import typesSource from "./personalIntelligencePersistenceBoundaryTypes.ts?raw";

const serialized = (value: unknown) => JSON.stringify(value);

describe("personal intelligence persistence boundary", () => {
  it("confirmed review result creates a dry-run persistence candidate", () => {
    const result = evaluatePersistenceBoundary(confirmedApprovePersistenceCandidate);

    expect(confirmedApprovePersistenceCandidate.confirmed).toBe(true);
    expect(result.decision).toBe("eligible");
    expect(result.eligibleForFuturePersistence).toBe(true);
    expect(result.dryRunOnly).toBe(true);
  });

  it("cancelled review result is blocked", () => {
    const result = evaluatePersistenceBoundary(cancelledPersistenceCandidate);

    expect(result.decision).toBe("blocked");
    expect(result.rejection?.code).toBe("cancelled_review_result");
    expect(result.eligibleForFuturePersistence).toBe(false);
  });

  it("blocked preview is blocked", () => {
    const result = evaluatePersistenceBoundary(blockedPreviewPersistenceCandidate);

    expect(result.decision).toBe("blocked");
    expect(result.rejection?.code).toBe("blocked_preview");
  });

  it("forget_memory requires explicit confirmation and rollback plan", () => {
    const result = evaluatePersistenceBoundary(confirmedForgetPersistenceCandidate);

    expect(result.decision).toBe("requires_review");
    expect(result.requiresExplicitUserConfirmation).toBe(true);
    expect(result.rollbackPlan.requiresUserConfirmation).toBe(true);
    expect(result.rollbackPlan.available).toBe(true);
  });

  it("make_private requires explicit confirmation and audit-before-write", () => {
    const result = evaluatePersistenceBoundary(privateMemoryPersistenceCandidate);

    expect(result.requiresExplicitUserConfirmation).toBe(true);
    expect(result.requiresAuditBeforeWrite).toBe(true);
    expect(result.privacyImpact.protected).toBe(true);
  });

  it("mark_do_not_sync requires explicit confirmation", () => {
    const result = evaluatePersistenceBoundary(doNotSyncPersistenceCandidate);

    expect(result.requiresExplicitUserConfirmation).toBe(true);
    expect(result.syncImpact.level).toBe("high");
  });

  it("mark_sync_allowed is blocked for sensitive or secret memory", () => {
    const result = evaluatePersistenceBoundary(syncRiskPersistenceCandidate);

    expect(result.decision).toBe("blocked");
    expect(result.rejection?.code).toBe("blocked_preview");
    expect(result.syncImpact.summary).toContain("sensitive and secret");
  });

  it("mark_sync_allowed is rejected for sensitive or secret summaries even after confirmation", () => {
    const basePreview = previewMemoryControlAction(
      personalMemoryControlGraphFixture,
      { targetMemoryId: "memory-control:sync-risk", action: "mark_do_not_sync", requestedBy: "user" },
      { now: new Date("2026-06-09T09:00:00.000Z"), mode: "creator" },
    );
    const candidate = createPersistenceCandidateFromMemoryControlPreview(
      { ...basePreview, action: "mark_sync_allowed", decision: "allowed", reason: "action_available" },
      { confirmed: true, mode: "creator" },
    );
    const result = evaluatePersistenceBoundary(candidate);

    expect(result.decision).toBe("rejected");
    expect(result.rejection?.code).toBe("sync_restricted");
  });

  it("sensitive correction requires audit-before-write", () => {
    const result = evaluatePersistenceBoundary(sensitiveCorrectionPersistenceCandidate);

    expect(result.requiresAuditBeforeWrite).toBe(true);
    expect(result.decision).toBe("requires_review");
  });

  it("audit event is unrecorded and result remains dry-run without persistence or mutation", () => {
    const result = evaluatePersistenceBoundary(confirmedApprovePersistenceCandidate);

    expect(result.auditEvent.recorded).toBe(false);
    expect(result.dryRunOnly).toBe(true);
    expect(result.persistencePerformed).toBe(false);
    expect(result.mutationPerformed).toBe(false);
    expect(result.sideEffectsPerformed).toBe(false);
  });

  it("rollback plan contains previous and proposed state summaries when available", () => {
    const result = evaluatePersistenceBoundary(archivePersistenceCandidate);

    expect(result.rollbackPlan.previousStateSummary).not.toBeNull();
    expect(result.rollbackPlan.proposedStateSummary).not.toBeNull();
    expect(result.rollbackPlan.available).toBe(true);
  });

  it("rollback unavailable is explicit when previous state is missing", () => {
    const result = evaluatePersistenceBoundary(missingPreviousStateRollbackPersistenceCandidate);

    expect(result.rollbackPlan.available).toBe(false);
    expect(result.rollbackPlan.reason).toContain("Previous state is unavailable");
  });

  it("Basic summary hides raw protected IDs and values", () => {
    const result = evaluatePersistenceBoundary(sensitiveCorrectionPersistenceCandidate);
    const summary = summarizePersistenceBoundaryResult(result, "basic");

    expect(summary).not.toContain("memory-control:sensitive-inference");
    expect(summary).not.toContain(PROTECTED_PERSISTENCE_BOUNDARY_FIXTURE_VALUE);
    expect(summary).toContain("protected memory details are hidden");
  });

  it("Pro summary shows risk and impact but no protected values", () => {
    const result = evaluatePersistenceBoundary(sensitiveCorrectionPersistenceCandidate);
    const summary = summarizePersistenceBoundaryResult(result, "pro");

    expect(summary).toContain("Risk:");
    expect(summary).toContain("Privacy impact:");
    expect(summary).toContain("Sync impact:");
    expect(summary).not.toContain(PROTECTED_PERSISTENCE_BOUNDARY_FIXTURE_VALUE);
  });

  it("Creator summary shows safe audit IDs but no protected raw values", () => {
    const result = evaluatePersistenceBoundary(sensitiveCorrectionPersistenceCandidate);
    const summary = summarizePersistenceBoundaryResult(result, "creator");

    expect(summary).toContain("Audit event:");
    expect(summary).toContain("Rollback plan:");
    expect(summary).not.toContain(PROTECTED_PERSISTENCE_BOUNDARY_FIXTURE_VALUE);
  });

  it("serialized result never contains protected fixture value", () => {
    const result = evaluatePersistenceBoundary(sensitiveCorrectionPersistenceCandidate);

    expect(serialized(result)).not.toContain(PROTECTED_PERSISTENCE_BOUNDARY_FIXTURE_VALUE);
  });

  it("original graph and review result are not mutated", () => {
    const beforeGraph = serialized(personalIntelligenceReviewWorkflowGraphFixture);
    const state = createMemoryReviewWorkflowState(personalIntelligenceReviewWorkflowGraphFixture, {
      mode: "creator",
      now: new Date("2026-06-09T09:00:00.000Z"),
    });
    const confirmed = confirmMemoryReviewPreview(
      createMemoryReviewActionPreview(
        personalIntelligenceReviewWorkflowGraphFixture,
        state,
        "memory-control:normal-preference",
        "forget_memory",
      ),
    );
    const beforeResult = serialized(confirmed.result);
    const candidate = createPersistenceCandidateFromReviewResult(confirmed.result!);

    evaluatePersistenceBoundary(candidate);

    expect(serialized(personalIntelligenceReviewWorkflowGraphFixture)).toBe(beforeGraph);
    expect(serialized(confirmed.result)).toBe(beforeResult);
  });

  it("operation summary is pure and reports deferred persistence", () => {
    const result = evaluatePersistenceBoundary(confirmedForgetPersistenceCandidate);

    expect(createPersistenceBoundaryOperationSummary(result)).toContain("Persistence: deferred. Side effects: none.");
  });

  it("does not import storage, network, model, tool, or runtime APIs in boundary sources", () => {
    const sources = [helpersSource, policySource, typesSource];
    const forbidden = [
      /localStorage|sessionStorage|indexedDB/,
      /from\s+["'](?:node:)?fs/,
      /fetch\s*\(/,
      /WebSocket/,
      /modelRouter|ModelRouter|openai|anthropic|google\/genai/i,
      /toolExecution|runtimePlanning|OperationCenter|operation-center/,
      /settingsService|memoryStore|database|persistenceAdapter/i,
    ];

    for (const source of sources) {
      for (const pattern of forbidden) expect(source).not.toMatch(pattern);
    }
  });
});

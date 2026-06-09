import {
  previewMemoryControlAction,
  personalMemoryControlGraphFixture,
  sensitiveInferredMemoryControlFixture,
  syncRiskMemoryControlFixture,
  temporaryContextMemoryControlFixture,
  type PersonalMemoryControlPreview,
} from "../memoryControls";
import {
  cancelMemoryReviewPreview,
  confirmMemoryReviewPreview,
  createMemoryReviewActionPreview,
  createMemoryReviewWorkflowState,
  personalIntelligenceReviewWorkflowGraphFixture,
} from "../reviewWorkflow";
import { createPersistenceCandidateFromMemoryControlPreview, createPersistenceCandidateFromReviewResult } from "./personalIntelligencePersistenceBoundaryHelpers";
import type { PersonalIntelligencePersistenceCandidate } from "./personalIntelligencePersistenceBoundaryTypes";

export const PROTECTED_PERSISTENCE_BOUNDARY_FIXTURE_VALUE = "fictional-protected-value";

const now = new Date("2026-06-09T09:00:00.000Z");
const workflowState = createMemoryReviewWorkflowState(personalIntelligenceReviewWorkflowGraphFixture, { mode: "creator", now });

const confirmedApproveState = confirmMemoryReviewPreview(
  createMemoryReviewActionPreview(
    personalIntelligenceReviewWorkflowGraphFixture,
    workflowState,
    "memory-control:pending-preference",
    "approve_memory",
    { now },
  ),
);

const confirmedForgetState = confirmMemoryReviewPreview(
  createMemoryReviewActionPreview(
    personalIntelligenceReviewWorkflowGraphFixture,
    workflowState,
    "memory-control:normal-preference",
    "forget_memory",
    { now },
  ),
);

const cancelledState = cancelMemoryReviewPreview(
  createMemoryReviewActionPreview(
    personalIntelligenceReviewWorkflowGraphFixture,
    workflowState,
    "memory-control:normal-preference",
    "archive_memory",
    { now },
  ),
);

function requireResult<T>(value: T | null | undefined, label: string): T {
  if (!value) throw new Error(`Missing persistence boundary fixture ${label}.`);
  return value;
}

export const confirmedApprovePersistenceCandidate = createPersistenceCandidateFromReviewResult(
  requireResult(confirmedApproveState.result, "confirmed approve result"),
  confirmedApproveState,
);

export const confirmedForgetPersistenceCandidate = createPersistenceCandidateFromReviewResult(
  requireResult(confirmedForgetState.result, "confirmed forget result"),
  confirmedForgetState,
);

export const cancelledPersistenceCandidate = createPersistenceCandidateFromReviewResult(
  requireResult(cancelledState.result, "cancelled result"),
  cancelledState,
);

export const blockedPreviewPersistencePreview = previewMemoryControlAction(
  personalMemoryControlGraphFixture,
  { targetMemoryId: "memory-control:missing", action: "approve_memory", requestedBy: "user" },
  { mode: "creator", now },
);

export const blockedPreviewPersistenceCandidate = createPersistenceCandidateFromMemoryControlPreview(
  blockedPreviewPersistencePreview,
  { confirmed: true, mode: "creator" },
);

export const sensitiveCorrectionPersistenceCandidate = createPersistenceCandidateFromMemoryControlPreview(
  previewMemoryControlAction(
    personalMemoryControlGraphFixture,
    {
      targetMemoryId: sensitiveInferredMemoryControlFixture.id,
      action: "correct_memory",
      changes: { summary: "Fictional redacted correction." },
      requestedBy: "user",
    },
    { mode: "creator", now },
  ),
  { confirmed: true, mode: "creator" },
);

export const syncRiskPersistenceCandidate = createPersistenceCandidateFromMemoryControlPreview(
  previewMemoryControlAction(
    personalMemoryControlGraphFixture,
    { targetMemoryId: syncRiskMemoryControlFixture.id, action: "mark_sync_allowed", requestedBy: "user" },
    { mode: "creator", now },
  ),
  { confirmed: true, mode: "creator" },
);

export const privateMemoryPersistenceCandidate = createPersistenceCandidateFromMemoryControlPreview(
  previewMemoryControlAction(
    personalMemoryControlGraphFixture,
    { targetMemoryId: temporaryContextMemoryControlFixture.id, action: "make_private", requestedBy: "user" },
    { mode: "creator", now },
  ),
  { confirmed: true, mode: "creator" },
);

export const doNotSyncPersistenceCandidate = createPersistenceCandidateFromMemoryControlPreview(
  previewMemoryControlAction(
    personalMemoryControlGraphFixture,
    { targetMemoryId: "memory-control:normal-preference", action: "mark_do_not_sync", requestedBy: "user" },
    { mode: "creator", now },
  ),
  { confirmed: true, mode: "creator" },
);

export const archivePersistenceCandidate = createPersistenceCandidateFromMemoryControlPreview(
  previewMemoryControlAction(
    personalMemoryControlGraphFixture,
    { targetMemoryId: "memory-control:normal-preference", action: "archive_memory", requestedBy: "user" },
    { mode: "creator", now },
  ),
  { confirmed: true, mode: "creator" },
);

export const restorePersistenceCandidate = createPersistenceCandidateFromMemoryControlPreview(
  previewMemoryControlAction(
    personalMemoryControlGraphFixture,
    { targetMemoryId: "memory-control:expired-context", action: "restore_memory", requestedBy: "user" },
    { mode: "creator", now },
  ),
  { confirmed: true, mode: "creator" },
);

const missingPreviousPreview: PersonalMemoryControlPreview = {
  ...blockedPreviewPersistencePreview,
  targetMemoryId: "memory-control:missing-previous-state",
  action: "archive_memory",
  decision: "allowed",
  reason: "action_available",
  risk: "high",
  currentStateSummary: null,
  proposedStateSummary: null,
  proposedNode: null,
  warnings: ["Previous state intentionally unavailable for rollback fixture."],
  summary: "Missing previous state fixture. No changes were applied.",
  sideEffectsPerformed: false,
};

export const missingPreviousStateRollbackPersistenceCandidate: PersonalIntelligencePersistenceCandidate =
  createPersistenceCandidateFromMemoryControlPreview(missingPreviousPreview, { confirmed: true, mode: "creator" });

export const personalIntelligencePersistenceBoundaryCandidates = Object.freeze([
  confirmedApprovePersistenceCandidate,
  confirmedForgetPersistenceCandidate,
  cancelledPersistenceCandidate,
  blockedPreviewPersistenceCandidate,
  sensitiveCorrectionPersistenceCandidate,
  syncRiskPersistenceCandidate,
  privateMemoryPersistenceCandidate,
  doNotSyncPersistenceCandidate,
  archivePersistenceCandidate,
  restorePersistenceCandidate,
  missingPreviousStateRollbackPersistenceCandidate,
]);

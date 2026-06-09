import {
  conflictingPreferenceMemoryControlFixture,
  expiredTemporaryContextMemoryControlFixture,
  normalPreferenceMemoryControlFixture,
  pendingApprovalMemoryControlFixture,
  personalMemoryControlGraphFixture,
  sensitiveInferredMemoryControlFixture,
  staleProjectMemoryControlFixture,
  syncRiskMemoryControlFixture,
  temporaryContextMemoryControlFixture,
} from "../memoryControls";
import type { PersonalMemoryGraph } from "../memoryGraph";

export const PROTECTED_REVIEW_WORKFLOW_FIXTURE_VALUE = "fictional-protected-value";

export const pendingPreferenceReviewWorkflowFixture = pendingApprovalMemoryControlFixture;
export const sensitiveInferredReviewWorkflowFixture = sensitiveInferredMemoryControlFixture;
export const staleProjectReviewWorkflowFixture = staleProjectMemoryControlFixture;
export const conflictingPreferenceReviewWorkflowFixture = conflictingPreferenceMemoryControlFixture;
export const temporaryNearExpirationReviewWorkflowFixture = temporaryContextMemoryControlFixture;
export const expiredTemporaryReviewWorkflowFixture = expiredTemporaryContextMemoryControlFixture;
export const syncRiskReviewWorkflowFixture = syncRiskMemoryControlFixture;
export const normalReviewWorkflowFixture = normalPreferenceMemoryControlFixture;

export const personalIntelligenceReviewWorkflowGraphFixture = personalMemoryControlGraphFixture;

export const emptyPersonalIntelligenceReviewWorkflowGraphFixture: PersonalMemoryGraph = {
  graphId: "memory-graph:empty-review-workflow-fixture",
  version: 1,
  generatedAt: "2026-06-08T09:00:00.000Z",
  nodes: [],
  edges: [],
};

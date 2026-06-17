import type { PersonalMemoryGraph, PersonalMemoryNode } from "../memoryGraph";

const createdAt = "2026-01-01T09:00:00.000Z";
const recentAt = "2026-06-08T09:00:00.000Z";

const base = {
  sensitivity: "personal",
  source: "user_stated",
  confidence: "high",
  lifecycle: "active",
  approvalState: "approved",
  privacy: { localOnly: true, allowSync: false, redactValueInSummaries: false },
  createdAt,
  updatedAt: recentAt,
  tags: ["fictional-fixture"] as readonly string[],
  evidence: [
    {
      source: "user_stated",
      reason: "Safe fictional fixture evidence.",
      sourceId: "evidence:fictional",
    },
  ] as const,
} satisfies Partial<PersonalMemoryNode>;

export const pendingApprovalMemoryControlFixture: PersonalMemoryNode = {
  ...base,
  id: "memory-control:pending-preference",
  category: "preference",
  title: "Sample focus preference",
  summary: "A fictional preference is waiting for approval.",
  lifecycle: "pending_approval",
  approvalState: "pending",
};

export const sensitiveInferredMemoryControlFixture: PersonalMemoryNode = {
  ...base,
  id: "memory-control:sensitive-inference",
  category: "sensitive_fact",
  title: "Protected inferred detail",
  summary: "This protected fictional detail must not appear in a basic review queue.",
  value: "fictional-protected-value",
  sensitivity: "sensitive",
  source: "assistant_inferred",
  confidence: "low",
  approvalState: "requires_review",
  privacy: { localOnly: true, allowSync: false, redactValueInSummaries: true },
};

export const staleProjectMemoryControlFixture: PersonalMemoryNode = {
  ...base,
  id: "memory-control:stale-project",
  category: "project",
  title: "Fictional seed catalog",
  summary: "An old fictional project status needs confirmation.",
  updatedAt: "2025-01-01T09:00:00.000Z",
  lastUsedAt: "2025-01-01T09:00:00.000Z",
  projectId: "project:fictional-seed-catalog",
};

export const conflictingPreferenceMemoryControlFixture: PersonalMemoryNode = {
  ...base,
  id: "memory-control:conflicting-preference",
  category: "preference",
  title: "Sample detailed summaries",
  summary: "Prefers detailed summaries in a fictional planning context.",
};

export const normalPreferenceMemoryControlFixture: PersonalMemoryNode = {
  ...base,
  id: "memory-control:normal-preference",
  category: "preference",
  title: "Sample concise summaries",
  summary: "Prefers concise summaries in a fictional everyday context.",
  privacy: { localOnly: false, allowSync: true, redactValueInSummaries: false },
};

export const temporaryContextMemoryControlFixture: PersonalMemoryNode = {
  ...base,
  id: "memory-control:temporary-context",
  category: "temporary_context",
  title: "Fictional review context",
  summary: "A harmless temporary context is close to expiration.",
  sensitivity: "private",
  expiresAt: "2026-06-10T12:00:00.000Z",
};

export const expiredTemporaryContextMemoryControlFixture: PersonalMemoryNode = {
  ...base,
  id: "memory-control:expired-context",
  category: "temporary_context",
  title: "Expired fictional context",
  summary: "A harmless temporary context has expired.",
  sensitivity: "private",
  lifecycle: "expired",
  expiresAt: "2026-06-08T12:00:00.000Z",
};

export const syncRiskMemoryControlFixture: PersonalMemoryNode = {
  ...base,
  id: "memory-control:sync-risk",
  category: "sensitive_fact",
  title: "Protected sync-risk fixture",
  summary: "A fictional sensitive memory has an unsafe declarative sync flag.",
  sensitivity: "secret",
  approvalState: "requires_review",
  privacy: { localOnly: false, allowSync: true, redactValueInSummaries: true },
};

export const personalMemoryControlGraphFixture: PersonalMemoryGraph = {
  graphId: "memory-graph:control-foundation-fixture",
  version: 1,
  generatedAt: recentAt,
  nodes: [
    pendingApprovalMemoryControlFixture,
    sensitiveInferredMemoryControlFixture,
    staleProjectMemoryControlFixture,
    conflictingPreferenceMemoryControlFixture,
    normalPreferenceMemoryControlFixture,
    temporaryContextMemoryControlFixture,
    expiredTemporaryContextMemoryControlFixture,
    syncRiskMemoryControlFixture,
  ],
  edges: [
    {
      id: "edge:fictional-preference-conflict",
      fromNodeId: conflictingPreferenceMemoryControlFixture.id,
      toNodeId: normalPreferenceMemoryControlFixture.id,
      type: "conflicts_with",
      reason: "The fictional preferences apply to different contexts and need review.",
      createdAt: recentAt,
    },
  ],
};

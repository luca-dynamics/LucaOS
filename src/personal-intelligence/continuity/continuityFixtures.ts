import {
  activeProjectMemoryFixture,
  conflictingPreferenceMemoryFixture,
  preferenceMemoryFixture,
  sensitivePendingReviewMemoryFixture,
  temporaryContextMemoryFixture,
} from "../memoryGraph";
import type { PersonalMemoryGraph, PersonalMemoryNode } from "../memoryGraph";

const fixtureTime = "2026-06-09T10:00:00.000Z";
const projectId = "project:lucaos-continuity-fixture";

export const continuityProjectFixture: PersonalMemoryNode = {
  ...activeProjectMemoryFixture,
  id: "memory:project:lucaos-continuity",
  title: "LucaOS Continuity Engine",
  summary: "A fictional project fixture for the first deterministic continuity layer.",
  value: { status: "active", phase: "foundation" },
  projectId,
  createdAt: fixtureTime,
  updatedAt: fixtureTime,
  lastUsedAt: fixtureTime,
  tags: ["lucaos-style", "continuity-fixture"],
};

export const continuityOpenTaskFixture: PersonalMemoryNode = {
  ...activeProjectMemoryFixture,
  id: "memory:task:review-memory-graph",
  category: "active_task",
  title: "Review Memory Graph foundation",
  summary: "Review the fictional foundation inputs before continuing the continuity layer.",
  value: { status: "open" },
  projectId,
  createdAt: fixtureTime,
  updatedAt: "2026-06-09T10:30:00.000Z",
  lastUsedAt: "2026-06-09T10:30:00.000Z",
  tags: ["open", "continuity-fixture"],
};

export const continuityBlockedTaskFixture: PersonalMemoryNode = {
  ...continuityOpenTaskFixture,
  id: "memory:task:runtime-verification",
  title: "Verify continuity runtime assumptions",
  summary: "Check the fictional runtime assumptions without executing any runtime integration.",
  updatedAt: "2026-06-09T10:15:00.000Z",
  lastUsedAt: "2026-06-09T10:15:00.000Z",
  tags: ["open", "blocked", "continuity-fixture"],
};

export const continuityDecisionFixture: PersonalMemoryNode = {
  ...activeProjectMemoryFixture,
  id: "memory:decision:continue-engine",
  category: "system_observation",
  title: "Continue with the Continuity Engine foundation",
  summary: "The fictional project context records a decision to build the pure continuity snapshot layer next.",
  value: { decision: "continuity-foundation" },
  source: "project_context",
  projectId,
  createdAt: fixtureTime,
  updatedAt: "2026-06-09T10:20:00.000Z",
  lastUsedAt: "2026-06-09T10:20:00.000Z",
  tags: ["decision", "recent-decision", "continuity-fixture"],
};

export const continuityTemporaryContextFixture: PersonalMemoryNode = {
  ...temporaryContextMemoryFixture,
  id: "memory:context:continuity-handoff",
  title: "Continuity handoff context",
  summary: "Restore the fictional Memory Graph review context for the next work session.",
  sensitivity: "personal",
  projectId,
  createdAt: fixtureTime,
  updatedAt: "2026-06-09T10:25:00.000Z",
  lastUsedAt: "2026-06-09T10:25:00.000Z",
  expiresAt: "2026-06-10T10:25:00.000Z",
  tags: ["temporary", "handoff", "continuity-fixture"],
};

export const continuityStalePreferenceFixture: PersonalMemoryNode = {
  ...preferenceMemoryFixture,
  id: "memory:preference:stale-review-style",
  title: "Older review style preference",
  summary: "A fictional preference for short review checklists that now needs confirmation.",
  value: "short-checklist",
  createdAt: "2025-10-01T09:00:00.000Z",
  updatedAt: "2025-10-01T09:00:00.000Z",
  lastUsedAt: "2025-10-01T09:00:00.000Z",
  projectId,
  tags: ["stale-fixture", "continuity-fixture"],
};

export const continuityConflictingPreferenceFixture: PersonalMemoryNode = {
  ...conflictingPreferenceMemoryFixture,
  id: "memory:preference:full-review-notes",
  title: "Full review notes preference",
  summary: "A fictional preference for full notes during project reviews.",
  value: "full-review-notes",
  projectId,
  createdAt: fixtureTime,
  updatedAt: fixtureTime,
  lastUsedAt: fixtureTime,
  tags: ["continuity-fixture", "planning"],
};

export const continuityPendingSensitiveFixture: PersonalMemoryNode = {
  ...sensitivePendingReviewMemoryFixture,
  id: "memory:sensitive:continuity-approval",
  title: "Fixture secret pending review",
  summary: "This fictional sensitive detail must never appear in continuity output.",
  value: "DO_NOT_DISCLOSE_FIXTURE_SECRET",
  createdAt: fixtureTime,
  updatedAt: fixtureTime,
  projectId,
  tags: ["continuity-fixture", "dependency", "review-required"],
};

export const continuityMemoryGraphFixture: PersonalMemoryGraph = {
  graphId: "memory-graph:continuity-phase-1-fixture",
  version: 1,
  generatedAt: fixtureTime,
  nodes: [
    continuityProjectFixture,
    continuityOpenTaskFixture,
    continuityBlockedTaskFixture,
    continuityDecisionFixture,
    continuityTemporaryContextFixture,
    continuityStalePreferenceFixture,
    continuityConflictingPreferenceFixture,
    continuityPendingSensitiveFixture,
  ],
  edges: [
    {
      id: "edge:continuity-task-project",
      fromNodeId: continuityOpenTaskFixture.id,
      toNodeId: continuityProjectFixture.id,
      type: "belongs_to_project",
      createdAt: fixtureTime,
    },
    {
      id: "edge:blocked-task-project",
      fromNodeId: continuityBlockedTaskFixture.id,
      toNodeId: continuityProjectFixture.id,
      type: "belongs_to_project",
      createdAt: fixtureTime,
    },
    {
      id: "edge:decision-project",
      fromNodeId: continuityDecisionFixture.id,
      toNodeId: continuityProjectFixture.id,
      type: "belongs_to_project",
      createdAt: fixtureTime,
    },
    {
      id: "edge:blocked-sensitive-dependency",
      fromNodeId: continuityBlockedTaskFixture.id,
      toNodeId: continuityPendingSensitiveFixture.id,
      type: "depends_on",
      createdAt: fixtureTime,
      reason: "The fictional verification task waits for a protected review decision.",
    },
    {
      id: "edge:preference-conflict",
      fromNodeId: continuityStalePreferenceFixture.id,
      toNodeId: continuityConflictingPreferenceFixture.id,
      type: "conflicts_with",
      createdAt: fixtureTime,
      reason: "The fictional review styles disagree and need clarification.",
    },
  ],
};

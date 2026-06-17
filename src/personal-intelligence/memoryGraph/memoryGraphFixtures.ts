import type { PersonalMemoryGraph, PersonalMemoryNode } from "./memoryGraphTypes";

const createdAt = "2026-06-09T09:00:00.000Z";
const expiresAt = "2026-06-10T09:00:00.000Z";

const localPrivacy = {
  localOnly: true,
  allowSync: false,
  redactValueInSummaries: false,
} as const;

const base = {
  confidence: "confirmed",
  lifecycle: "active",
  approvalState: "not_required",
  privacy: localPrivacy,
  createdAt,
  updatedAt: createdAt,
  tags: [] as readonly string[],
} as const;

export const userIdentityMemoryFixture: PersonalMemoryNode = {
  ...base,
  id: "memory:identity:sample-user",
  category: "identity",
  title: "Preferred display name",
  summary: "The sample user prefers the display name Alex.",
  value: "Alex",
  sensitivity: "personal",
  privacyZone: "private",
  source: "user_confirmed",
  tags: ["profile"],
  evidence: [{ source: "user_confirmed", reason: "Confirmed in the sample profile setup." }],
};

export const preferenceMemoryFixture: PersonalMemoryNode = {
  ...base,
  id: "memory:preference:concise-updates",
  category: "preference",
  title: "Project update style",
  summary: "Prefers concise project updates.",
  value: "concise",
  sensitivity: "personal",
  privacyZone: "private",
  source: "user_stated",
  tags: ["communication"],
  evidence: [{ source: "user_stated", reason: "Stated in a harmless fixture conversation." }],
};

export const conflictingPreferenceMemoryFixture: PersonalMemoryNode = {
  ...base,
  id: "memory:preference:detailed-updates",
  category: "preference",
  title: "Detailed planning updates",
  summary: "Prefers detailed updates for planning sessions.",
  value: "detailed",
  sensitivity: "personal",
  privacyZone: "private",
  source: "user_stated",
  confidence: "high",
  tags: ["communication", "planning"],
  evidence: [{ source: "user_stated", reason: "Stated in a separate harmless fixture context." }],
};

export const activeProjectMemoryFixture: PersonalMemoryNode = {
  ...base,
  id: "memory:project:sample-garden-app",
  category: "project",
  title: "Sample garden app",
  summary: "An active sample project for planning a small garden journal app.",
  value: { status: "active" },
  sensitivity: "personal",
  privacyZone: "project",
  source: "project_context",
  confidence: "high",
  projectId: "project:sample-garden-app",
  tags: ["sample-project"],
  evidence: [{ source: "project_context", reason: "Present in the fake project fixture." }],
};

export const goalMemoryFixture: PersonalMemoryNode = {
  ...base,
  id: "memory:goal:sample-prototype",
  category: "goal",
  title: "Prepare a reviewable prototype",
  summary: "Prepare a reviewable prototype plan for the sample project.",
  sensitivity: "personal",
  privacyZone: "project",
  source: "user_confirmed",
  projectId: "project:sample-garden-app",
  tags: ["sample-project", "prototype"],
  evidence: [{ source: "user_confirmed", reason: "Confirmed as the fixture project's next goal." }],
};

export const deviceMemoryFixture: PersonalMemoryNode = {
  ...base,
  id: "memory:device:sample-laptop",
  category: "device",
  title: "Sample development laptop",
  summary: "A fictional laptop associated with the sample project.",
  sensitivity: "private",
  privacyZone: "device",
  source: "user_confirmed",
  deviceId: "device:sample-laptop",
  tags: ["sample-device"],
  evidence: [{ source: "user_confirmed", reason: "Added explicitly for fixture testing." }],
};

export const temporaryContextMemoryFixture: PersonalMemoryNode = {
  ...base,
  id: "memory:context:sample-review-window",
  category: "temporary_context",
  title: "Sample review window",
  summary: "Keep the harmless prototype review context available until tomorrow.",
  sensitivity: "private",
  privacyZone: "project",
  source: "user_stated",
  confidence: "high",
  expiresAt,
  projectId: "project:sample-garden-app",
  tags: ["temporary", "sample-project"],
  evidence: [{ source: "user_stated", reason: "Explicit short-lived context in the fixture." }],
};

export const sensitivePendingReviewMemoryFixture: PersonalMemoryNode = {
  ...base,
  id: "memory:sensitive:pending-sample",
  category: "sensitive_fact",
  title: "Pending private detail",
  summary: "A fictional private fact is withheld until review.",
  sensitivity: "sensitive",
  privacyZone: "private",
  source: "assistant_inferred",
  confidence: "low",
  lifecycle: "pending_approval",
  approvalState: "requires_review",
  privacy: { localOnly: true, allowSync: false, redactValueInSummaries: true },
  tags: ["fixture", "review-required"],
  evidence: [{ source: "assistant_inferred", reason: "Fake inference included only to test review policy." }],
};

export const personalMemoryGraphFixture: PersonalMemoryGraph = {
  graphId: "memory-graph:safe-foundation-fixture",
  version: 1,
  generatedAt: createdAt,
  nodes: [
    userIdentityMemoryFixture,
    preferenceMemoryFixture,
    conflictingPreferenceMemoryFixture,
    activeProjectMemoryFixture,
    goalMemoryFixture,
    deviceMemoryFixture,
    temporaryContextMemoryFixture,
    sensitivePendingReviewMemoryFixture,
  ],
  edges: [
    {
      id: "edge:goal-project",
      fromNodeId: goalMemoryFixture.id,
      toNodeId: activeProjectMemoryFixture.id,
      type: "belongs_to_project",
      createdAt,
    },
    {
      id: "edge:project-goal",
      fromNodeId: activeProjectMemoryFixture.id,
      toNodeId: goalMemoryFixture.id,
      type: "supports_goal",
      createdAt,
    },
    {
      id: "edge:project-device",
      fromNodeId: activeProjectMemoryFixture.id,
      toNodeId: deviceMemoryFixture.id,
      type: "observed_on_device",
      createdAt,
    },
    {
      id: "edge:preference-conflict",
      fromNodeId: preferenceMemoryFixture.id,
      toNodeId: conflictingPreferenceMemoryFixture.id,
      type: "conflicts_with",
      reason: "The preferred level of detail depends on context and needs clarification.",
      createdAt,
    },
  ],
};

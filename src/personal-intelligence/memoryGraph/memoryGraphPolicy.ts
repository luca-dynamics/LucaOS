import type {
  PersonalMemoryApprovalState,
  PersonalMemoryCategory,
  PersonalMemoryConfidence,
  PersonalMemoryLifecycle,
  PersonalMemorySensitivity,
  PersonalMemorySource,
} from "./memoryGraphTypes";

export const PERSONAL_MEMORY_CATEGORIES: readonly PersonalMemoryCategory[] = [
  "identity",
  "preference",
  "project",
  "goal",
  "routine",
  "relationship",
  "device",
  "skill",
  "active_task",
  "temporary_context",
  "sensitive_fact",
  "system_observation",
];

export const PERSONAL_MEMORY_SENSITIVITIES: readonly PersonalMemorySensitivity[] = [
  "public",
  "personal",
  "private",
  "sensitive",
  "secret",
];

export const PERSONAL_MEMORY_SOURCES: readonly PersonalMemorySource[] = [
  "user_stated",
  "user_confirmed",
  "assistant_inferred",
  "system_observed",
  "imported",
  "device_observed",
  "project_context",
];

export const PERSONAL_MEMORY_CONFIDENCE_LEVELS: readonly PersonalMemoryConfidence[] = [
  "low",
  "medium",
  "high",
  "confirmed",
];

export const PERSONAL_MEMORY_LIFECYCLES: readonly PersonalMemoryLifecycle[] = [
  "active",
  "draft",
  "pending_approval",
  "archived",
  "forgotten",
  "expired",
];

export const PERSONAL_MEMORY_APPROVAL_STATES: readonly PersonalMemoryApprovalState[] = [
  "not_required",
  "pending",
  "approved",
  "denied",
  "requires_review",
];

export const MEMORY_REVIEW_SOURCES: ReadonlySet<PersonalMemorySource> = new Set([
  "assistant_inferred",
  "system_observed",
  "device_observed",
  "imported",
]);

export const NON_SYNCABLE_SENSITIVITIES: ReadonlySet<PersonalMemorySensitivity> = new Set([
  "sensitive",
  "secret",
]);

/** Staleness windows describe review freshness; they do not delete memory. */
export const MEMORY_STALENESS_WINDOWS_MS: Readonly<Record<PersonalMemoryCategory, number>> = {
  identity: 365 * 24 * 60 * 60 * 1000,
  preference: 180 * 24 * 60 * 60 * 1000,
  project: 45 * 24 * 60 * 60 * 1000,
  goal: 45 * 24 * 60 * 60 * 1000,
  routine: 30 * 24 * 60 * 60 * 1000,
  relationship: 180 * 24 * 60 * 60 * 1000,
  device: 30 * 24 * 60 * 60 * 1000,
  skill: 90 * 24 * 60 * 60 * 1000,
  active_task: 7 * 24 * 60 * 60 * 1000,
  temporary_context: 24 * 60 * 60 * 1000,
  sensitive_fact: 30 * 24 * 60 * 60 * 1000,
  system_observation: 14 * 24 * 60 * 60 * 1000,
};

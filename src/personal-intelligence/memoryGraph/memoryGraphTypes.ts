import type { LucaExperienceMode } from "../../experience/experienceMode";
import type { PrivacyZone } from "../privacy/privacyZones";

export type PersonalMemoryCategory =
  | "identity"
  | "preference"
  | "project"
  | "goal"
  | "routine"
  | "relationship"
  | "device"
  | "skill"
  | "active_task"
  | "temporary_context"
  | "sensitive_fact"
  | "system_observation";

export type PersonalMemorySensitivity =
  | "public"
  | "personal"
  | "private"
  | "sensitive"
  | "secret";

export type PersonalMemorySource =
  | "user_stated"
  | "user_confirmed"
  | "assistant_inferred"
  | "system_observed"
  | "imported"
  | "device_observed"
  | "project_context";

export type PersonalMemoryConfidence = "low" | "medium" | "high" | "confirmed";

export type PersonalMemoryLifecycle =
  | "active"
  | "draft"
  | "pending_approval"
  | "archived"
  | "forgotten"
  | "expired";

export type PersonalMemoryStaleness = "fresh" | "aging" | "stale" | "expired" | "unknown";

export type PersonalMemoryApprovalState =
  | "not_required"
  | "pending"
  | "approved"
  | "denied"
  | "requires_review";

export type PersonalMemoryEdgeType =
  | "supports_goal"
  | "belongs_to_project"
  | "depends_on"
  | "related_to"
  | "owned_by_user"
  | "observed_on_device"
  | "uses_skill"
  | "conflicts_with"
  | "supersedes";

export type PersonalMemoryJsonValue =
  | string
  | number
  | boolean
  | null
  | PersonalMemoryJsonValue[]
  | { [key: string]: PersonalMemoryJsonValue };

export interface PersonalMemoryEvidence {
  source: PersonalMemorySource;
  reason: string;
  observedAt?: string;
  sourceId?: string;
  sourceType?: string;
}

/**
 * Privacy controls are declarative only. They do not perform sync, disclosure,
 * persistence, or authority grants.
 */
export interface PersonalMemoryPrivacyControls {
  localOnly: boolean;
  allowSync: boolean;
  redactValueInSummaries: boolean;
}

export interface PersonalMemoryNode {
  id: string;
  category: PersonalMemoryCategory;
  title: string;
  summary: string;
  value?: PersonalMemoryJsonValue;
  sensitivity: PersonalMemorySensitivity;
  privacyZone?: PrivacyZone;
  source: PersonalMemorySource;
  confidence: PersonalMemoryConfidence;
  lifecycle: PersonalMemoryLifecycle;
  approvalState: PersonalMemoryApprovalState;
  privacy: PersonalMemoryPrivacyControls;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
  expiresAt?: string;
  projectId?: string;
  deviceId?: string;
  tags: readonly string[];
  evidence: readonly PersonalMemoryEvidence[];
}

export interface PersonalMemoryEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  type: PersonalMemoryEdgeType;
  createdAt: string;
  reason?: string;
}

export interface PersonalMemoryGraph {
  graphId: string;
  version: 1;
  nodes: readonly PersonalMemoryNode[];
  edges: readonly PersonalMemoryEdge[];
  generatedAt: string;
}

export interface PersonalMemoryConflict {
  edge: PersonalMemoryEdge;
  from: PersonalMemoryNode;
  to: PersonalMemoryNode;
}

export interface PersonalMemoryGraphCounts {
  total: number;
  active: number;
  byCategory: Record<PersonalMemoryCategory, number>;
  bySensitivity: Record<PersonalMemorySensitivity, number>;
  byApprovalState: Record<PersonalMemoryApprovalState, number>;
}

export interface PersonalMemorySummaryItem {
  id: string;
  category: PersonalMemoryCategory;
  title: string;
  detail: string;
  sensitivity: PersonalMemorySensitivity;
  approvalState: PersonalMemoryApprovalState;
  source?: PersonalMemorySource;
  confidence?: PersonalMemoryConfidence;
  staleness?: PersonalMemoryStaleness;
  redacted: boolean;
}

export interface PersonalMemoryGraphSummary extends PersonalMemoryGraphCounts {
  graphId: string;
  mode: LucaExperienceMode;
  visibleMemories: readonly PersonalMemorySummaryItem[];
  conflictCount: number;
  generatedAt: string;
  sideEffectsPerformed: false;
}

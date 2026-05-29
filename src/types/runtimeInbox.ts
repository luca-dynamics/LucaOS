import type { ProvenanceMetadata, ProvenanceTrustLevel } from "./provenance";

export type RuntimeInboxEventSource =
  | "user"
  | "system"
  | "scheduler"
  | "memory"
  | "skill"
  | "tool_request"
  | "external_stub";

export interface RuntimeInboxEvent {
  inboxEventId: string;
  source: RuntimeInboxEventSource;
  sourceTrustLevel: ProvenanceTrustLevel;
  title: string;
  body: string;
  eventType: string;
  createdAt: string;
  readAt?: string;
  archivedAt?: string;
  provenance: ProvenanceMetadata;
  requiresApproval: boolean;
  relatedJobId?: string;
  relatedSessionId?: string;
  relatedSkillId?: string;
  metadata: Record<string, unknown>;
}

export interface RuntimeInboxDiagnosticsSummary {
  totalEvents: number;
  unreadEvents: number;
  archivedEvents: number;
  externalInertEvents: number;
  approvalEvents: number;
}

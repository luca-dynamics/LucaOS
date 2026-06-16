import type { PresenceApprovalPrompt, PresenceApprovalStatus } from "../presenceTypes";

export type PresenceApprovalSource =
  | "miniChat"
  | "hologram"
  | "widget"
  | "dashboard"
  | "luca-link"
  | "runtime"
  | "tool"
  | "system"
  | (string & {});

export type PresenceApprovalDecisionValue = "approve" | "approved" | "deny" | "denied" | "reject" | "rejected" | "cancel" | "expired";

export type JsonSafeRecord = Record<string, unknown>;

export interface PresenceApprovalRequest extends PresenceApprovalPrompt {
  status?: PresenceApprovalStatus | string;
}

export interface PresenceApprovalDecision extends JsonSafeRecord {
  id?: string;
  requestId?: string;
  decision?: PresenceApprovalDecisionValue | string;
  approved?: boolean;
  status?: PresenceApprovalStatus | string;
  source?: PresenceApprovalSource;
  metadata?: unknown;
  timestamp?: string | number;
}

export interface PresenceApprovalRouteEnvelope extends JsonSafeRecord {
  kind: "presence.approval.route";
  source?: PresenceApprovalSource;
  status: PresenceApprovalStatus | string;
  prompt: PresenceApprovalPrompt | null;
  request?: PresenceApprovalRequest | null;
  decision?: PresenceApprovalDecision | null;
  timestamp?: string | number;
}

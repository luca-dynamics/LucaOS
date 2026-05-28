import type { ModelMode } from "./modelRouting";

export type RuntimeLifecycleState =
  | "stopped"
  | "starting"
  | "resuming"
  | "idle"
  | "busy"
  | "degraded"
  | "quarantined"
  | "stopping";


export type RuntimeContinuityEventType =
  | "heartbeat"
  | "resumed"
  | "paused"
  | "stopped"
  | "dry_run_tick"
  | "degraded"
  | "quarantined"
  | "approval_pending"
  | "scheduler_due_detected";

export type RuntimeContinuityEventSeverity = "info" | "warning" | "blocked";

export interface RuntimeContinuityEventEnvelope {
  eventId: string;
  runtimeId: string;
  sessionId: string;
  type: RuntimeContinuityEventType;
  createdAt: string;
  severity: RuntimeContinuityEventSeverity;
  source: string;
  provenanceId?: string;
  summary: string;
  metadata: Record<string, unknown>;
}

export interface RuntimeContinuityLoopStatus {
  lifecycleState: RuntimeLifecycleState;
  running: boolean;
  dryRunOnly: true;
  inFlight: boolean;
  intervalMs: number;
  lastTickAt?: string;
  nextTickAt?: string;
  dueDryRunJobs: number;
  pendingApprovalCount: number;
  scheduledJobCount: number;
  quarantinedItemCount: number;
  degradedReasons: string[];
  runtimeId: string;
  sessionId: string;
  lastHeartbeatAt?: string;
  lastResumedAt?: string;
  lastReason?: string;
}

export interface RuntimeContinuitySnapshot {
  runtimeId: string;
  sessionId: string;
  lifecycleState: RuntimeLifecycleState;
  activeMode: ModelMode | "unknown";
  activeModelRouteSummary: string;
  activeMemoryRouteSummary: string;
  activeToolScopes: string[];
  pendingApprovalCount: number;
  scheduledJobCount: number;
  quarantinedItemCount: number;
  lastHeartbeatAt?: string;
  lastResumedAt?: string;
  restartReason?: string;
  degradedReasons: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RuntimeContinuitySummary {
  runtimeId: string;
  sessionId: string;
  lifecycleState: RuntimeLifecycleState;
  canSafelyResume: boolean;
  userSafeStatus: string;
  pendingApprovalCount: number;
  scheduledJobCount: number;
  quarantinedItemCount: number;
  degradedReasons: string[];
  activeMode: RuntimeContinuitySnapshot["activeMode"];
  lastHeartbeatAt?: string;
  lastResumedAt?: string;
  loopStatus?: RuntimeContinuityLoopStatus;
}

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
}

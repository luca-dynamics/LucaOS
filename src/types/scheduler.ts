import type { ProvenanceMetadata, ProvenanceApprovalState } from "./provenance";

export type SchedulerJobStatus = "idle" | "due" | "dry_run_ready" | "blocked" | "disabled" | "quarantined" | "deleted";
export type SchedulerCapability = "notify" | "memory_read" | "memory_write" | "skill" | "tool" | "network" | "shell" | "filesystem";
export type SchedulerDeliveryTarget = "in_app" | "notification" | "memory_only" | "none";

export interface SchedulerJobSchedule {
  kind: "once" | "interval" | "cron" | "manual";
  runAt?: string;
  intervalMs?: number;
  cronExpression?: string;
  timezone?: string;
}

export interface SchedulerJob {
  jobId: string;
  title: string;
  description: string;
  schedule: SchedulerJobSchedule;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastRunAt?: string;
  nextRunAt?: string;
  provenance: ProvenanceMetadata;
  requiredApproval: ProvenanceApprovalState;
  allowedCapabilities: SchedulerCapability[];
  deliveryTarget: SchedulerDeliveryTarget;
  dryRunOnly: true;
  status: SchedulerJobStatus;
}

export interface SchedulerDryRunResult {
  jobId: string;
  title: string;
  due: boolean;
  wouldRun: boolean;
  dryRunOnly: true;
  requiredApproval: ProvenanceApprovalState;
  userSafeReason: string;
  blockedBy: string[];
}

export interface SchedulerDiagnosticsSummary {
  totalJobs: number;
  enabledJobs: number;
  disabledJobs: number;
  dueJobs: number;
  pendingApprovals: number;
  quarantinedJobs: number;
  riskyJobs: number;
  dryRunOnly: true;
}

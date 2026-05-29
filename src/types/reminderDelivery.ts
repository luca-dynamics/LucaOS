import type { SchedulerDeliveryTarget } from "./scheduler";

export type ReminderDeliveryStatus = "pending" | "delivered" | "skipped" | "blocked" | "failed";

export interface ReminderDeliveryRecord {
  deliveryId: string;
  jobId: string;
  title: string;
  message: string;
  dueAt: string;
  deliveredAt?: string;
  status: ReminderDeliveryStatus;
  reason: string;
  provenanceId: string;
  dryRunOnly: boolean;
  deliveryTarget: Extract<SchedulerDeliveryTarget, "in_app" | "notification">;
  createdAt: string;
  updatedAt: string;
}

export interface ReminderDeliveryDiagnosticsSummary {
  totalDeliveries: number;
  deliveredCount: number;
  blockedCount: number;
  failedCount: number;
  pendingCount: number;
  lastDeliveredAt?: string;
  safeLoopDeliveryEnabled: boolean;
}

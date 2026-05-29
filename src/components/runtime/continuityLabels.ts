// continuityLabels — PR #127: Reminder & Session Continuity UX Polish
// Pure helper functions for continuity labels, tones, and next-action copy.
// No service imports. No localStorage. No execution. No side effects.

import type { AgentSessionLifecycleState } from "../../types/agentSessionContinuity";
import type { ReminderDeliveryStatus } from "../../types/reminderDelivery";
import type { RuntimePlanStatus } from "../../types/runtimePlan";
import type { AgentPlanningCheckpointStatus } from "../../types/agentPlanningCheckpoint";

// ---------------------------------------------------------------------------
// Tone
// ---------------------------------------------------------------------------

export type ContinuityTone = "good" | "warn" | "danger" | "neutral" | "info";

export function getContinuityToneColor(tone: ContinuityTone): string {
  switch (tone) {
    case "good": return "text-emerald-300";
    case "warn": return "text-amber-300";
    case "danger": return "text-red-300";
    case "info": return "text-sky-300";
    case "neutral": return "text-[var(--app-text-muted)]";
  }
}

export function getContinuityToneBorder(tone: ContinuityTone): string {
  switch (tone) {
    case "good": return "border-emerald-500/20";
    case "warn": return "border-amber-500/20";
    case "danger": return "border-red-500/20";
    case "info": return "border-sky-500/20";
    case "neutral": return "border-white/10";
  }
}

export function getContinuityToneBg(tone: ContinuityTone): string {
  switch (tone) {
    case "good": return "bg-emerald-500/5";
    case "warn": return "bg-amber-500/5";
    case "danger": return "bg-red-500/5";
    case "info": return "bg-sky-500/5";
    case "neutral": return "bg-black/10";
  }
}

// ---------------------------------------------------------------------------
// Session continuity
// ---------------------------------------------------------------------------

export function getSessionContinuityLabel(lifecycleState: AgentSessionLifecycleState): string {
  switch (lifecycleState) {
    case "active": return "Active";
    case "paused": return "Paused";
    case "resumable": return "Can resume";
    case "completed": return "Completed";
    case "archived": return "Archived";
    case "quarantined": return "Needs review";
    default: return "Unknown";
  }
}

export function getSessionContinuityTone(lifecycleState: AgentSessionLifecycleState): ContinuityTone {
  switch (lifecycleState) {
    case "active": return "good";
    case "paused": return "neutral";
    case "resumable": return "info";
    case "completed": return "good";
    case "archived": return "neutral";
    case "quarantined": return "danger";
    default: return "neutral";
  }
}

export function getSessionNextAction(lifecycleState: AgentSessionLifecycleState, safeToResume: boolean): string {
  switch (lifecycleState) {
    case "active": return "Session is active";
    case "paused": return "Can be resumed or archived";
    case "resumable": return safeToResume ? "Safe to continue — review in Activity" : "Review before resume";
    case "completed": return "No action needed";
    case "archived": return "No action needed";
    case "quarantined": return "Needs review — review in Activity";
    default: return "No action needed";
  }
}

// ---------------------------------------------------------------------------
// Reminder delivery
// ---------------------------------------------------------------------------

export function getReminderDeliveryLabel(status: ReminderDeliveryStatus): string {
  switch (status) {
    case "pending": return "Pending";
    case "delivered": return "Delivered";
    case "skipped": return "Skipped";
    case "blocked": return "Blocked";
    case "failed": return "Failed";
    default: return "Unknown";
  }
}

export function getReminderDeliveryTone(status: ReminderDeliveryStatus): ContinuityTone {
  switch (status) {
    case "pending": return "warn";
    case "delivered": return "good";
    case "skipped": return "neutral";
    case "blocked": return "danger";
    case "failed": return "danger";
    default: return "neutral";
  }
}

export function getReminderNextAction(status: ReminderDeliveryStatus): string {
  switch (status) {
    case "pending": return "Waiting for delivery";
    case "delivered": return "Review in inbox";
    case "skipped": return "No action needed";
    case "blocked": return "Blocked for safety";
    case "failed": return "Delivery failed";
    default: return "No action needed";
  }
}

// ---------------------------------------------------------------------------
// Runtime plan
// ---------------------------------------------------------------------------

export function getPlanContinuityLabel(status: RuntimePlanStatus): string {
  switch (status) {
    case "proposed": return "Plan proposed";
    case "active": return "Active plan";
    case "waiting_approval": return "Waiting for approval";
    case "waiting_user": return "Waiting for user";
    case "blocked": return "Blocked for safety";
    case "completed": return "Completed";
    case "archived": return "Archived";
    case "rejected": return "Rejected";
    default: return "Unknown";
  }
}

export function getPlanContinuityTone(status: RuntimePlanStatus): ContinuityTone {
  switch (status) {
    case "proposed": return "info";
    case "active": return "good";
    case "waiting_approval": return "warn";
    case "waiting_user": return "warn";
    case "blocked": return "danger";
    case "completed": return "good";
    case "archived": return "neutral";
    case "rejected": return "neutral";
    default: return "neutral";
  }
}

export function getPlanNextAction(status: RuntimePlanStatus): string {
  switch (status) {
    case "proposed": return "Review and activate or reject";
    case "active": return "Create governed items or complete";
    case "waiting_approval": return "Approval needed";
    case "waiting_user": return "Waiting for user input";
    case "blocked": return "Blocked for safety — review in Activity";
    case "completed": return "No action needed";
    case "archived": return "No action needed";
    case "rejected": return "No action needed";
    default: return "No action needed";
  }
}

// ---------------------------------------------------------------------------
// Planning checkpoint
// ---------------------------------------------------------------------------

export function getCheckpointContinuityLabel(status: AgentPlanningCheckpointStatus): string {
  switch (status) {
    case "proposed": return "Review checkpoint";
    case "approved": return "Approved";
    case "rejected": return "Rejected";
    case "blocked": return "Blocked for safety";
    case "completed": return "Completed";
    case "archived": return "Archived";
    default: return "Unknown";
  }
}

export function getCheckpointContinuityTone(status: AgentPlanningCheckpointStatus): ContinuityTone {
  switch (status) {
    case "proposed": return "warn";
    case "approved": return "good";
    case "rejected": return "neutral";
    case "blocked": return "danger";
    case "completed": return "good";
    case "archived": return "neutral";
    default: return "neutral";
  }
}

export function getCheckpointNextAction(status: AgentPlanningCheckpointStatus): string {
  switch (status) {
    case "proposed": return "Review and approve or reject";
    case "approved": return "Plan may proceed to governed requests";
    case "rejected": return "No action needed";
    case "blocked": return "Blocked for safety — review in Activity";
    case "completed": return "No action needed";
    case "archived": return "No action needed";
    default: return "No action needed";
  }
}

// ---------------------------------------------------------------------------
// Shared no-execution copy
// ---------------------------------------------------------------------------

export type ContinuityItemKind = "session" | "reminder" | "plan" | "checkpoint" | "inbox";

export function getContinuityNoExecutionText(kind: ContinuityItemKind): string {
  switch (kind) {
    case "session": return "State-only — no execution";
    case "reminder": return "Delivered safely — no execution";
    case "plan": return "Plans create governed records — no execution";
    case "checkpoint": return "Checkpoints are state-only — no execution";
    case "inbox": return "No execution";
    default: return "No execution performed";
  }
}

// ---------------------------------------------------------------------------
// Continuity summary helpers
// ---------------------------------------------------------------------------

export function getContinuitySummaryLine(counts: {
  resumableSessions: number;
  activePlans: number;
  pendingCheckpoints: number;
  pendingReminders: number;
  pendingApprovals: number;
  blockedItems: number;
}): string {
  const parts: string[] = [];
  if (counts.resumableSessions > 0) parts.push(`${counts.resumableSessions} session${counts.resumableSessions === 1 ? "" : "s"} can resume`);
  if (counts.activePlans > 0) parts.push(`${counts.activePlans} active plan${counts.activePlans === 1 ? "" : "s"}`);
  if (counts.pendingCheckpoints > 0) parts.push(`${counts.pendingCheckpoints} checkpoint${counts.pendingCheckpoints === 1 ? "" : "s"} need review`);
  if (counts.pendingReminders > 0) parts.push(`${counts.pendingReminders} pending reminder${counts.pendingReminders === 1 ? "" : "s"}`);
  if (counts.pendingApprovals > 0) parts.push(`${counts.pendingApprovals} approval${counts.pendingApprovals === 1 ? "" : "s"} need review`);
  if (counts.blockedItems > 0) parts.push(`${counts.blockedItems} blocked item${counts.blockedItems === 1 ? "" : "s"}`);
  if (parts.length === 0) return "No continuity items need attention";
  return parts.join(" · ");
}

export function compactTimestamp(isoString: string | undefined): string {
  if (!isoString) return "";
  try { return new Date(isoString).toLocaleString(); } catch { return ""; }
}

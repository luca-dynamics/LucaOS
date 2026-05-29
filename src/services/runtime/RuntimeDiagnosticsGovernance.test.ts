import { describe, expect, it } from "vitest";
import { buildGovernanceDiagnosticsForAudience, sanitizeDiagnosticText } from "./RuntimeDiagnosticsService";

const base = {
  runtimeContinuity: { runtimeId: "r", sessionId: "s", lifecycleState: "idle" as const, canSafelyResume: true, userSafeStatus: "ok", pendingApprovalCount: 0, scheduledJobCount: 0, quarantinedItemCount: 0, degradedReasons: [], activeMode: "local" as const },
  scheduler: { totalJobs: 1, enabledJobs: 1, disabledJobs: 0, dueJobs: 0, pendingApprovals: 1, quarantinedJobs: 0, riskyJobs: 1, dryRunOnly: true as const },
  provenance: { totalRecords: 1, pendingApprovals: 1, approvedOnce: 0, quarantinedRecords: 0, revokedRecords: 0, expiredRecords: 0 },
  skills: { totalSkills: 1, enabledSkills: 0, disabledSkills: 0, quarantinedSkills: 0, skillsMissingProvenance: 1, highRiskSkills: 0 },
  memoryGovernance: { totalRecords: 1, visibleRecords: 1, quarantinedRecords: 0, pendingReviewRecords: 1, approvalRequiredWrites: 0, rejectedRecords: 0 },
  reminders: { totalDeliveries: 1, deliveredCount: 1, blockedCount: 0, failedCount: 0, pendingCount: 0, safeLoopDeliveryEnabled: true },
  inbox: { totalEvents: 1, unreadEvents: 1, archivedEvents: 0, externalInertEvents: 0, approvalEvents: 1 },
  sessions: { totalSessions: 1, activeSessions: 0, resumableSessions: 1, pausedSessions: 0, quarantinedSessions: 0, safeToResumeSessions: 1 },
  approvalCenter: { totalRequests: 1, pendingRequests: 1, approvedOnceRequests: 0, rejectedRequests: 0, expiredRequests: 0, revokedRequests: 0 },
  governedRequests: { totalRequests: 1, proposedRequests: 0, approvalRequiredRequests: 1, approvedWaitingExecutionRequests: 0, rejectedRequests: 0, blockedRequests: 0, dryRunOnly: true as const },
};

describe("runtime governance diagnostics", () => {
  it("hides advanced provenance details for normal users", () => {
    const diagnostics = buildGovernanceDiagnosticsForAudience({ ...base, audience: "normal" });
    expect(diagnostics.visibility).toBe("friendly");
    expect(diagnostics.provenance).toEqual({ pendingApprovals: 1 });
    expect(diagnostics.safeSummary).not.toContain("sk-testsecret");
  });

  it("shows summary counts to tactical and origin users", () => {
    expect(buildGovernanceDiagnosticsForAudience({ ...base, audience: "tactical" }).visibility).toBe("compact");
    const tactical = buildGovernanceDiagnosticsForAudience({ ...base, audience: "tactical" });
    expect(tactical.reminders.deliveredCount).toBe(1);
    expect(tactical.inbox.unreadEvents).toBe(1);
    expect(tactical.sessions.safeToResumeSessions).toBe(1);
    expect(tactical.governedRequests.dryRunOnly).toBe(true);
    expect(buildGovernanceDiagnosticsForAudience({ ...base, audience: "origin" }).provenance).toHaveProperty("totalRecords", 1);
  });

  it("redacts raw secrets from diagnostic text", () => {
    expect(sanitizeDiagnosticText("key sk-testsecret12345 should hide")).not.toContain("sk-testsecret");
  });
});

import { describe, expect, it } from "vitest";
import type { RuntimeGovernanceDiagnostics } from "../../services/runtime/RuntimeDiagnosticsService";
import { getGovernancePendingApprovalCount } from "./RuntimeDiagnosticsPanel";

const governance: RuntimeGovernanceDiagnostics = {
  runtimeContinuity: {
    runtimeId: "runtime",
    sessionId: "session",
    lifecycleState: "idle",
    canSafelyResume: true,
    userSafeStatus: "safe",
    pendingApprovalCount: 1,
    scheduledJobCount: 2,
    quarantinedItemCount: 0,
    degradedReasons: [],
    activeMode: "local",
  },
  scheduler: {
    totalJobs: 2,
    enabledJobs: 1,
    disabledJobs: 1,
    dueJobs: 1,
    pendingApprovals: 2,
    quarantinedJobs: 0,
    riskyJobs: 1,
    dryRunOnly: true,
  },
  provenance: {
    totalRecords: 4,
    pendingApprovals: 3,
    approvedOnce: 0,
    quarantinedRecords: 0,
    revokedRecords: 0,
    expiredRecords: 0,
  },
  skills: {
    totalSkills: 1,
    enabledSkills: 1,
    disabledSkills: 0,
    quarantinedSkills: 0,
    skillsMissingProvenance: 0,
    highRiskSkills: 0,
  },
  memoryGovernance: {
    totalRecords: 1,
    visibleRecords: 1,
    quarantinedRecords: 0,
    pendingReviewRecords: 1,
    approvalRequiredWrites: 0,
    rejectedRecords: 0,
  },
  visibility: "compact",
  safeSummary: "6 approvals are waiting before risky actions can proceed.",
};

describe("RuntimeDiagnosticsPanel governance helper", () => {
  it("summarizes pending approvals for compact governance display", () => {
    expect(getGovernancePendingApprovalCount(governance)).toBe(6);
  });
});

import {
  createLearningEventFromBlockedAction,
  createLearningEventFromUserFeedback,
} from "./runtimeLearningEvents";
import {
  createPersonalIntelligenceRuntimeTrace,
  createTraceFromMemoryApprovalDryRun,
  appendRuntimeTraceStage,
} from "./runtimeTraceRecorder";
import { summarizeRuntimeTraceReadiness } from "./runtimeTraceReadiness";

export const RUNTIME_TRACE_FIXTURE_TIMESTAMP = "2026-06-07T12:00:00.000Z";
const fixtureNow = () => new Date(RUNTIME_TRACE_FIXTURE_TIMESTAMP);

export const SAFE_MEMORY_APPROVAL_DRY_RUN_TRACE_FIXTURE =
  createTraceFromMemoryApprovalDryRun(
    {
      dryRun: true,
      status: "dry_run",
      proposalId: "proposal:project-update-preference",
      blockers: [],
      warnings: ["Dry-run evidence only; governed persistence remains separate."],
      sideEffectsPerformed: false,
    },
    {
      traceId: "trace:memory-approval-dry-run",
      title: "Memory approval dry-run",
      source: "personal-intelligence-runtime-safe-fixture",
      privacyZone: "project",
      relatedApprovalId: "approval:safe-fixture",
      now: fixtureNow,
    },
  );

let blockedLiveWriteTrace = createPersonalIntelligenceRuntimeTrace({
  traceId: "trace:blocked-live-write",
  title: "Blocked live-write attempt",
  source: "personal-intelligence-runtime-safe-fixture",
  privacyZone: "project",
  relatedProposalId: "proposal:project-update-preference",
  now: fixtureNow,
});
for (const stage of [
  { stage: "sense", status: "completed", summary: "Observed a request to consider a governed live write." },
  { stage: "understand", status: "completed", summary: "Confirmed the controlled pilot remains disabled." },
  { stage: "plan", status: "completed", summary: "Kept the request inside the approval and dry-run boundary." },
  { stage: "approve", status: "blocked", summary: "Required live-write approval was not satisfied.", requiresApproval: true, approvalSatisfied: false },
  { stage: "act", status: "blocked", summary: "No action executed; live write remained blocked.", requiresApproval: true, approvalSatisfied: false },
] as const) {
  blockedLiveWriteTrace = appendRuntimeTraceStage(blockedLiveWriteTrace, {
    ...stage,
    timestamp: RUNTIME_TRACE_FIXTURE_TIMESTAMP,
  });
}
export const SAFE_BLOCKED_LIVE_WRITE_TRACE_FIXTURE = blockedLiveWriteTrace;

export const SAFE_USER_FEEDBACK_LEARNING_EVENT_FIXTURE =
  createLearningEventFromUserFeedback({
    eventId: "learning:user-feedback:project-updates",
    feedback: "User prefers concise project updates with explicit decisions and next steps.",
    source: "personal-intelligence-runtime-safe-fixture",
    privacyZone: "project",
    confidence: 0.98,
    relatedTraceId: SAFE_MEMORY_APPROVAL_DRY_RUN_TRACE_FIXTURE.traceId,
    now: fixtureNow,
  }).event;

export const SAFE_BLOCKED_ACTION_LEARNING_EVENT_FIXTURE =
  createLearningEventFromBlockedAction({
    eventId: "learning:blocked-live-write",
    actionSummary: "Governed memory live write was proposed but not authorized.",
    reason: "Controlled live-write pilot and approval gates remain closed.",
    source: "personal-intelligence-runtime-safe-fixture",
    privacyZone: "project",
    confidence: 1,
    relatedTraceId: SAFE_BLOCKED_LIVE_WRITE_TRACE_FIXTURE.traceId,
    now: fixtureNow,
  }).event;

export const SAFE_RUNTIME_TRACE_READINESS_FIXTURE = summarizeRuntimeTraceReadiness(
  [SAFE_MEMORY_APPROVAL_DRY_RUN_TRACE_FIXTURE, SAFE_BLOCKED_LIVE_WRITE_TRACE_FIXTURE],
  [SAFE_USER_FEEDBACK_LEARNING_EVENT_FIXTURE, SAFE_BLOCKED_ACTION_LEARNING_EVENT_FIXTURE],
);

import type { LucaExperienceMode } from "../../experience/experienceMode";
import type { PersonalMemoryControlAction, PersonalMemoryControlPreview, PersonalMemoryControlRisk } from "../memoryControls";
import type { PersonalIntelligenceReviewResult, PersonalIntelligenceReviewWorkflowState } from "../reviewWorkflow";
import {
  createPrivacyImpact,
  createSyncImpact,
  decisionForPersistenceBoundary,
  isPersistenceBoundaryProtectedState,
  isPersistenceBoundarySyncRestricted,
  persistenceBoundaryHighRiskActions,
  requiresPersistenceBoundaryAuditBeforeWrite,
  requiresPersistenceBoundaryExplicitConfirmation,
} from "./personalIntelligencePersistenceBoundaryPolicy";
import type {
  PersonalIntelligencePersistenceAuditEvent,
  PersonalIntelligencePersistenceAuditEventType,
  PersonalIntelligencePersistenceBoundaryResult,
  PersonalIntelligencePersistenceCandidate,
  PersonalIntelligencePersistenceDecision,
  PersonalIntelligencePersistenceRejection,
  PersonalIntelligencePersistenceRequestSource,
  PersonalIntelligenceRollbackPlan,
} from "./personalIntelligencePersistenceBoundaryTypes";

const FIXED_BOUNDARY_TIME = "2026-06-09T00:00:00.000Z";
const SAFE_PROTECTED_TARGET = "protected-memory";

function safePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "unknown";
}

function actionLabel(action: PersonalMemoryControlAction): string {
  return action.replace(/_/g, " ");
}

function safeTargetId(targetMemoryId: string, protectedTarget: boolean): string {
  return protectedTarget ? SAFE_PROTECTED_TARGET : targetMemoryId;
}

function requestIdFor(source: PersonalIntelligencePersistenceRequestSource, targetMemoryId: string, action: PersonalMemoryControlAction): string {
  return `pi-persistence-request:${safePart(source)}:${safePart(targetMemoryId)}:${safePart(action)}`;
}

function eventTypeFor(decision: PersonalIntelligencePersistenceDecision): PersonalIntelligencePersistenceAuditEventType {
  if (decision === "blocked" || decision === "rejected") return "personal_intelligence_persistence_blocked";
  if (decision === "requires_review") return "personal_intelligence_persistence_requires_review";
  if (decision === "eligible") return "personal_intelligence_persistence_candidate_created";
  return "personal_intelligence_persistence_dry_run_confirmed";
}

function rejectionFor(args: {
  readonly confirmed: boolean;
  readonly action: PersonalMemoryControlAction;
  readonly phase?: string;
  readonly previewDecision: string;
  readonly hasPreview: boolean;
  readonly syncRestricted: boolean;
}): PersonalIntelligencePersistenceRejection | undefined {
  if (!args.hasPreview) return { code: "review_result_missing_preview", reason: "A persistence candidate requires a memory-control preview summary." };
  if (args.phase === "cancelled") return { code: "cancelled_review_result", reason: "Cancelled review results cannot become persistence candidates." };
  if (!args.confirmed) return { code: "unconfirmed_review_result", reason: "Only confirmed review results can become persistence candidates." };
  if (args.previewDecision === "blocked" || args.previewDecision === "unsupported") return { code: "blocked_preview", reason: "Blocked or unsupported previews cannot cross the persistence boundary." };
  if (args.syncRestricted) return { code: "sync_restricted", reason: "Sensitive or secret memory cannot be marked sync-allowed, even after confirmation." };
  if (!args.action) return { code: "missing_action", reason: "A persistence request must name a memory-control action." };
  return undefined;
}

export function createPersistenceCandidateFromReviewResult(
  result: PersonalIntelligenceReviewResult,
  workflowState?: PersonalIntelligenceReviewWorkflowState,
): PersonalIntelligencePersistenceCandidate {
  if (!result.action) {
    throw new Error("A review result must include an action before it can be evaluated by the persistence boundary.");
  }
  const preview = result.preview;
  if (!preview) {
    throw new Error("A review result must include a preview before it can be evaluated by the persistence boundary.");
  }
  return {
    requestId: requestIdFor("review_workflow_confirmation", result.targetMemoryId, result.action),
    source: "review_workflow_confirmation",
    targetMemoryId: result.targetMemoryId,
    displayTargetMemoryId: preview.displayTargetMemoryId,
    action: result.action,
    confirmed: result.confirmed === true,
    mode: result.mode,
    preview: {
      decision: preview.decision,
      reason: preview.reason,
      risk: "low",
      warnings: preview.warnings,
      currentStateSummary: preview.currentStateSummary,
      proposedStateSummary: preview.proposedStateSummary,
      sideEffectsPerformed: false,
    },
    reviewResult: result,
    workflowState,
    createdAt: FIXED_BOUNDARY_TIME,
    dryRunOnly: true,
  };
}

export function createPersistenceCandidateFromMemoryControlPreview(
  preview: PersonalMemoryControlPreview,
  options: { readonly source?: PersonalIntelligencePersistenceRequestSource; readonly confirmed?: boolean; readonly mode?: LucaExperienceMode } = {},
): PersonalIntelligencePersistenceCandidate {
  const source = options.source ?? "memory_control_preview";
  return {
    requestId: requestIdFor(source, preview.targetMemoryId, preview.action),
    source,
    targetMemoryId: preview.targetMemoryId,
    action: preview.action,
    confirmed: options.confirmed === true,
    mode: options.mode ?? "creator",
    preview: {
      decision: preview.decision,
      reason: preview.reason,
      risk: preview.risk,
      warnings: preview.warnings,
      currentStateSummary: preview.currentStateSummary,
      proposedStateSummary: preview.proposedStateSummary,
      sideEffectsPerformed: false,
    },
    createdAt: FIXED_BOUNDARY_TIME,
    dryRunOnly: true,
  };
}

export function createRollbackPlan(candidate: PersonalIntelligencePersistenceCandidate): PersonalIntelligenceRollbackPlan {
  const previous = candidate.preview.currentStateSummary;
  const proposed = candidate.preview.proposedStateSummary;
  const requiresGuidance = persistenceBoundaryHighRiskActions.has(candidate.action);
  const available = Boolean(previous && proposed);
  return {
    rollbackPlanId: `pi-rollback-plan:${safePart(candidate.requestId)}`,
    targetMemoryId: candidate.targetMemoryId,
    action: candidate.action,
    previousStateSummary: previous,
    proposedStateSummary: proposed,
    rollbackAction: available
      ? `Restore the previous declarative memory summary for ${actionLabel(candidate.action)} after renewed user confirmation.`
      : "Rollback cannot be described until the previous and proposed summaries are available.",
    requiresUserConfirmation: requiresGuidance,
    available,
    reason: available
      ? "Previous and proposed state summaries are available for a future descriptive undo plan. No rollback has executed."
      : "Previous state is unavailable; future persistence must reject or collect safe prior-state evidence before writing.",
    dryRunOnly: true,
    executed: false,
  };
}

export function createPersistenceAuditEvent(args: {
  readonly candidate: PersonalIntelligencePersistenceCandidate;
  readonly decision: PersonalIntelligencePersistenceDecision;
  readonly reason: string;
  readonly risk: PersonalMemoryControlRisk | "critical";
  readonly requiresUserConfirmation: boolean;
  readonly requiresAuditBeforeWrite: boolean;
  readonly rollbackPlan: PersonalIntelligenceRollbackPlan;
}): PersonalIntelligencePersistenceAuditEvent {
  const privacyImpact = createPrivacyImpact(args.candidate.action, args.candidate.preview.currentStateSummary, args.candidate.preview.proposedStateSummary);
  const syncImpact = createSyncImpact(args.candidate.action, args.candidate.preview.currentStateSummary, args.candidate.preview.proposedStateSummary);
  return {
    eventId: `pi-audit-event:${safePart(args.candidate.requestId)}:${safePart(eventTypeFor(args.decision))}`,
    eventType: eventTypeFor(args.decision),
    requestId: args.candidate.requestId,
    targetMemoryId: args.candidate.targetMemoryId,
    action: args.candidate.action,
    decision: args.decision,
    risk: args.risk,
    reason: args.reason,
    source: args.candidate.source,
    createdAt: args.candidate.createdAt,
    requiresUserConfirmation: args.requiresUserConfirmation,
    requiresAuditBeforeWrite: args.requiresAuditBeforeWrite,
    privacyImpact,
    syncImpact,
    rollbackPlanId: args.rollbackPlan.rollbackPlanId,
    recorded: false,
    dryRunOnly: true,
  };
}

export function evaluatePersistenceBoundary(candidate: PersonalIntelligencePersistenceCandidate): PersonalIntelligencePersistenceBoundaryResult {
  const current = candidate.preview.currentStateSummary;
  const proposed = candidate.preview.proposedStateSummary;
  const syncRestricted = isPersistenceBoundarySyncRestricted(candidate.action, current, proposed);
  const decision = decisionForPersistenceBoundary({
    action: candidate.action,
    confirmed: candidate.confirmed,
    previewDecision: candidate.preview.decision,
    currentStateSummary: current,
    proposedStateSummary: proposed,
  });
  const rejection = rejectionFor({
    confirmed: candidate.confirmed,
    action: candidate.action,
    phase: candidate.reviewResult?.phase,
    previewDecision: candidate.preview.decision,
    hasPreview: Boolean(candidate.preview),
    syncRestricted,
  });
  const privacyImpact = createPrivacyImpact(candidate.action, current, proposed);
  const syncImpact = createSyncImpact(candidate.action, current, proposed);
  const requiresExplicitUserConfirmation = requiresPersistenceBoundaryExplicitConfirmation(candidate.action) || candidate.preview.decision === "approval_required";
  const requiresAuditBeforeWrite = requiresPersistenceBoundaryAuditBeforeWrite(candidate.action, current, proposed);
  const rollbackPlan = createRollbackPlan(candidate);
  const reason = rejection?.reason ?? (decision === "eligible"
    ? "Confirmed review intent is eligible for future persistence after an audit event and write authority are implemented."
    : decision === "requires_review"
      ? "Confirmed intent remains review-gated; future persistence must require explicit confirmation, audit, and rollback planning."
      : "Persistence is blocked by the dry-run boundary policy.");
  const risk = syncRestricted ? "critical" : candidate.preview.risk;
  const auditEvent = createPersistenceAuditEvent({
    candidate,
    decision,
    reason,
    risk,
    requiresUserConfirmation: requiresExplicitUserConfirmation,
    requiresAuditBeforeWrite,
    rollbackPlan,
  });
  const eligibleForFuturePersistence = decision === "eligible" || decision === "requires_review";
  return {
    requestId: candidate.requestId,
    source: candidate.source,
    targetMemoryId: candidate.targetMemoryId,
    displayTargetMemoryId: candidate.displayTargetMemoryId,
    action: candidate.action,
    decision,
    reason,
    risk,
    auditEvent,
    rollbackPlan,
    privacyImpact,
    syncImpact,
    rejection,
    plan: {
      requestId: candidate.requestId,
      action: candidate.action,
      decision,
      eligibleForFuturePersistence,
      blockedActions: ["durable memory write", "memory graph mutation", "sync", "model call", "tool call", "Operation Center event write"],
      deferredActions: ["audit recording", "storage backend write", "rollback execution"],
      dryRunOnly: true,
      persistencePerformed: false,
      mutationPerformed: false,
      sideEffectsPerformed: false,
    },
    requiresExplicitUserConfirmation,
    requiresAuditBeforeWrite,
    eligibleForFuturePersistence,
    dryRunOnly: true,
    sideEffectsPerformed: false,
    persistencePerformed: false,
    mutationPerformed: false,
  };
}

export function summarizePersistenceBoundaryResult(
  result: PersonalIntelligencePersistenceBoundaryResult,
  mode: LucaExperienceMode = "basic",
): string {
  const protectedTarget = result.privacyImpact.protected || result.syncImpact.protected || isPersistenceBoundaryProtectedState(result.rollbackPlan.previousStateSummary);
  const target = safeTargetId(result.displayTargetMemoryId ?? result.targetMemoryId, mode === "basic" && protectedTarget);
  if (mode === "basic") {
    return [
      `Memory action: ${actionLabel(result.action)}.`,
      `Confirmation required: ${result.requiresExplicitUserConfirmation ? "yes" : "no"}.`,
      "Persistence: deferred.",
      protectedTarget ? "Privacy warning: protected memory details are hidden." : "Privacy: no protected details shown.",
    ].join(" ");
  }
  if (mode === "pro") {
    return [
      `Action: ${result.action}.`,
      `Decision: ${result.decision}.`,
      `Risk: ${result.risk}.`,
      `Privacy impact: ${result.privacyImpact.summary}`,
      `Sync impact: ${result.syncImpact.summary}`,
      `Rollback available: ${result.rollbackPlan.available ? "yes" : "no"}.`,
    ].join(" ");
  }
  return [
    `Request: ${safePart(result.requestId)} for ${target}.`,
    `Audit event: ${safePart(result.auditEvent.eventId)}.`,
    `Rollback plan: ${safePart(result.rollbackPlan.rollbackPlanId)}.`,
    `dryRunOnly: ${result.dryRunOnly}; recorded: ${result.auditEvent.recorded}; persistencePerformed: ${result.persistencePerformed}.`,
  ].join(" ");
}

export function createPersistenceBoundaryOperationSummary(result: PersonalIntelligencePersistenceBoundaryResult): string {
  return `Personal Intelligence persistence candidate: ${result.decision.replace(/_/g, " ")}. Action: ${actionLabel(result.action)}. Audit ${result.requiresAuditBeforeWrite ? "required" : "available"} before write. Persistence: deferred. Side effects: none.`;
}

import { createLearningPersistenceProposal } from "../persistence/learningPersistenceProposal";
import type { LearningPersistenceProposalOptions } from "../persistence/persistenceTypes";
import type { PrivacyZone } from "../privacy/privacyZones";
import { findUnsafeRuntimeEvidence } from "./runtimeTracePolicy";
import type {
  LearningEventCreationResult,
  LearningEventProposalPreviewResult,
  PersonalIntelligenceRuntimeLearningEvent,
  PersonalIntelligenceRuntimeTrace,
} from "./runtimeTraceTypes";

interface LearningEventBaseInput {
  eventId: string;
  timestamp?: string;
  source: string;
  privacyZone: PrivacyZone;
  confidence: number;
  relatedMissionId?: string;
  relatedMemoryItemIds?: string[];
  relatedTraceId?: string;
  now?: () => Date;
}

interface UserFeedbackInput extends LearningEventBaseInput {
  feedback: string;
}

interface BlockedActionInput extends LearningEventBaseInput {
  actionSummary: string;
  reason: string;
}

interface FailedActionInput extends LearningEventBaseInput {
  actionSummary: string;
  failureSummary: string;
}

interface DryRunResultInput extends LearningEventBaseInput {
  resultSummary: string;
  succeeded: boolean;
  proposalId?: string;
}

interface VerificationResultInput extends LearningEventBaseInput {
  outcomeSummary: string;
  verified: boolean;
  evidenceRef?: string;
}

interface RuntimeTraceLearningOptions {
  eventId: string;
  confidence?: number;
  now?: () => Date;
}

interface ProposalPreviewOptions
  extends Omit<LearningPersistenceProposalOptions, "status"> {
  status?: "draft" | "review_required";
}

export function createLearningEventFromRuntimeTrace(
  trace: PersonalIntelligenceRuntimeTrace,
  options: RuntimeTraceLearningOptions,
): LearningEventCreationResult {
  return finalizeLearningEvent({
    eventId: options.eventId,
    timestamp: (options.now ?? (() => new Date()))().toISOString(),
    inputSummary: `Bounded runtime evidence from trace: ${trace.title}`,
    actionTaken: "Recorded doctrine-stage summaries only; no runtime action or persistence occurred.",
    outcome: trace.status === "verified" ? "success" : trace.status === "failed" ? "failure" : "partial",
    verificationStatus: trace.status === "verified" ? "verified" : trace.status === "failed" ? "failed" : "pending",
    nextAdjustment: trace.blockers.length ? "Resolve trace blockers before proposing persistence." : "Eligible for governed persistence proposal review.",
    relatedMissionId: trace.relatedMissionId,
    privacyZone: trace.privacyZone,
    source: trace.source,
    confidence: options.confidence ?? (trace.status === "verified" ? 0.9 : 0.65),
    relatedTraceId: trace.traceId,
    blockers: [...trace.blockers],
    warnings: [...trace.warnings],
    proposalReady: trace.blockers.length === 0,
    persisted: false,
    writePerformed: false,
  });
}

export function createLearningEventFromUserFeedback(
  input: UserFeedbackInput,
): LearningEventCreationResult {
  return createFromBase(input, {
    inputSummary: "User feedback was received as a bounded preference summary.",
    actionTaken: "Prepared user feedback as a learning-event candidate without changing memory or prompts.",
    outcome: "success",
    verificationStatus: "verified",
    userFeedback: input.feedback,
    nextAdjustment: "Offer this feedback for explicit governed persistence review if desired.",
  });
}

export function createLearningEventFromBlockedAction(
  input: BlockedActionInput,
): LearningEventCreationResult {
  return createFromBase(input, {
    inputSummary: input.actionSummary,
    actionTaken: `Action remained blocked: ${input.reason}`,
    outcome: "cancelled",
    verificationStatus: "verified",
    nextAdjustment: "Retain the blocker and require a separate approved execution path.",
  });
}

export function createLearningEventFromFailedAction(
  input: FailedActionInput,
): LearningEventCreationResult {
  return createFromBase(input, {
    inputSummary: input.actionSummary,
    actionTaken: `Recorded an externally reported failure without retrying or executing the action: ${input.failureSummary}`,
    outcome: "failure",
    verificationStatus: "failed",
    nextAdjustment: "Require review and fresh approval before any future action is considered.",
  });
}

export function createLearningEventFromDryRunResult(
  input: DryRunResultInput,
): LearningEventCreationResult {
  return createFromBase(input, {
    inputSummary: input.resultSummary,
    actionTaken: `Recorded a dry-run result${input.proposalId ? ` for ${input.proposalId}` : ""}; no write was performed.`,
    outcome: input.succeeded ? "success" : "failure",
    verificationStatus: input.succeeded ? "verified" : "failed",
    nextAdjustment: input.succeeded
      ? "The event may be converted into a review-required persistence proposal preview."
      : "Resolve dry-run blockers before proposal review.",
  });
}

export function createLearningEventFromVerificationResult(
  input: VerificationResultInput,
): LearningEventCreationResult {
  return createFromBase(input, {
    inputSummary: input.outcomeSummary,
    actionTaken: `Recorded verification evidence${input.evidenceRef ? ` (${input.evidenceRef})` : ""}.`,
    outcome: input.verified ? "success" : "failure",
    verificationStatus: input.verified ? "verified" : "failed",
    nextAdjustment: input.verified
      ? "Keep the verified outcome available for governed proposal review."
      : "Do not propose persistence until verification failures are reviewed.",
  });
}

export function convertLearningEventToPersistenceProposalPreview(
  event: PersonalIntelligenceRuntimeLearningEvent,
  options: ProposalPreviewOptions,
): LearningEventProposalPreviewResult {
  const unsafeBlockers = findUnsafeRuntimeEvidence(eventContent(event));
  const blockers = [...new Set([...event.blockers, ...unsafeBlockers])];
  const warnings = [...event.warnings];
  const proposal = createLearningPersistenceProposal(cloneEvent(event), {
    ...options,
    status: blockers.length ? "draft" : (options.status ?? "review_required"),
    blockers,
    warnings,
  });
  return {
    proposal: {
      ...proposal,
      approvalMetadata: undefined,
      status: blockers.length ? "draft" : "review_required",
      writePerformed: false,
    },
    warnings: [...warnings],
    blockers: [...blockers],
    approved: false,
    writePerformed: false,
  };
}

function createFromBase(
  input: LearningEventBaseInput,
  fields: Pick<
    PersonalIntelligenceRuntimeLearningEvent,
    "inputSummary" | "actionTaken" | "outcome" | "verificationStatus" | "nextAdjustment"
  > & { userFeedback?: string },
): LearningEventCreationResult {
  return finalizeLearningEvent({
    eventId: input.eventId,
    timestamp: input.timestamp ?? (input.now ?? (() => new Date()))().toISOString(),
    ...fields,
    relatedMissionId: input.relatedMissionId,
    relatedMemoryItemIds: input.relatedMemoryItemIds ? [...input.relatedMemoryItemIds] : undefined,
    privacyZone: input.privacyZone,
    source: input.source,
    confidence: input.confidence,
    relatedTraceId: input.relatedTraceId,
    blockers: [],
    warnings: [],
    proposalReady: true,
    persisted: false,
    writePerformed: false,
  });
}

function finalizeLearningEvent(
  event: PersonalIntelligenceRuntimeLearningEvent,
): LearningEventCreationResult {
  const sensitiveBlockers = ["credential", "financial", "health", "enterprise"].includes(event.privacyZone)
    ? [`Privacy Zone ${event.privacyZone} requires explicit approval metadata before learning-event review.`]
    : [];
  const blockers = [...new Set([...event.blockers, ...sensitiveBlockers, ...findUnsafeRuntimeEvidence(eventContent(event))])];
  const normalized = cloneEvent({
    ...event,
    blockers,
    proposalReady: blockers.length === 0,
    persisted: false,
    writePerformed: false,
  });
  return { event: normalized, warnings: [...normalized.warnings], blockers: [...normalized.blockers] };
}

function eventContent(event: PersonalIntelligenceRuntimeLearningEvent): string {
  return [
    event.inputSummary,
    event.actionTaken,
    event.userFeedback ?? "",
    event.nextAdjustment ?? "",
  ].join("\n");
}

function cloneEvent(
  event: PersonalIntelligenceRuntimeLearningEvent,
): PersonalIntelligenceRuntimeLearningEvent {
  return {
    ...event,
    relatedMemoryItemIds: event.relatedMemoryItemIds ? [...event.relatedMemoryItemIds] : undefined,
    blockers: [...event.blockers],
    warnings: [...event.warnings],
    persisted: false,
    writePerformed: false,
  };
}

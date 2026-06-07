import type { PersonalIntelligencePersistenceProposal } from "../persistence/persistenceTypes";
import {
  PERSONAL_INTELLIGENCE_DOCTRINE_STAGES,
  type CreateRuntimeTraceInput,
  type PersonalIntelligenceRuntimeTrace,
  type PersonalIntelligenceRuntimeTraceStage,
  type RuntimeTraceStageInput,
} from "./runtimeTraceTypes";

interface MemoryApprovalDryRunEvidence {
  dryRun: boolean;
  status: string;
  proposalId: string;
  blockers: readonly string[];
  warnings: readonly string[];
  sideEffectsPerformed: boolean;
}

interface RuntimeTraceContext {
  traceId: string;
  title?: string;
  source: string;
  privacyZone: PersonalIntelligenceRuntimeTrace["privacyZone"];
  relatedMissionId?: string;
  relatedApprovalId?: string;
  now?: () => Date;
}

export function createPersonalIntelligenceRuntimeTrace(
  input: CreateRuntimeTraceInput,
): PersonalIntelligenceRuntimeTrace {
  const timestamp = (input.now ?? (() => new Date()))().toISOString();
  const createdAt = input.createdAt ?? timestamp;
  return {
    traceId: input.traceId,
    title: input.title,
    source: input.source,
    createdAt,
    updatedAt: createdAt,
    privacyZone: input.privacyZone,
    relatedMissionId: input.relatedMissionId,
    relatedProposalId: input.relatedProposalId,
    relatedApprovalId: input.relatedApprovalId,
    status: input.blockers?.length ? "blocked" : (input.status ?? "draft"),
    stages: PERSONAL_INTELLIGENCE_DOCTRINE_STAGES.map((stage) => ({
      stage,
      status: "pending",
      summary: `${stage} evidence has not been recorded.`,
      timestamp: createdAt,
      sideEffectsPerformed: false,
    })),
    warnings: [...(input.warnings ?? [])],
    blockers: [...(input.blockers ?? [])],
    sideEffectsPerformed: false,
  };
}

export function appendRuntimeTraceStage(
  trace: PersonalIntelligenceRuntimeTrace,
  stageInput: RuntimeTraceStageInput,
): PersonalIntelligenceRuntimeTrace {
  const copy = cloneTrace(trace);
  const stageIndex = PERSONAL_INTELLIGENCE_DOCTRINE_STAGES.indexOf(stageInput.stage);
  const priorIncomplete = copy.stages
    .slice(0, stageIndex)
    .some((stage) => stage.status === "pending");
  const blockers = [...copy.blockers];
  let status = stageInput.status;
  let summary = stageInput.summary;

  if (priorIncomplete && status === "completed") {
    status = "blocked";
    blockers.push(`Cannot complete ${stageInput.stage} before prior doctrine stages are recorded.`);
  }
  if (status === "blocked") {
    blockers.push(`${stageInput.stage} stage was blocked: ${summary}`);
  }
  if (stageInput.stage === "act" && status === "completed") {
    const externalOutcome = /\bexternal(?:ly)?\b/i.test(summary);
    if (!stageInput.approvalSatisfied || !externalOutcome) {
      status = "blocked";
      summary = `${summary} Recorded as evidence only; no action was performed by this trace.`;
      blockers.push("Act stage completion requires satisfied approval metadata and an explicitly external outcome.");
    }
  }

  const nextStage: PersonalIntelligenceRuntimeTraceStage = {
    ...stageInput,
    status,
    summary,
    timestamp: stageInput.timestamp ?? copy.updatedAt,
    sideEffectsPerformed: false,
  };
  copy.stages[stageIndex] = nextStage;
  copy.updatedAt = nextStage.timestamp;
  copy.blockers = [...new Set(blockers)];
  copy.status = copy.blockers.length > 0 ? "blocked" : "active";
  copy.sideEffectsPerformed = false;
  return cloneTrace(copy);
}

export function markRuntimeTraceBlocked(
  trace: PersonalIntelligenceRuntimeTrace,
  reason: string,
): PersonalIntelligenceRuntimeTrace {
  return cloneTrace({
    ...trace,
    status: "blocked",
    blockers: [...trace.blockers, reason],
    sideEffectsPerformed: false,
  });
}

export function markRuntimeTraceVerified(
  trace: PersonalIntelligenceRuntimeTrace,
  evidence: string,
): PersonalIntelligenceRuntimeTrace {
  const verified = appendRuntimeTraceStage(trace, {
    stage: "verify",
    status: "completed",
    summary: "Outcome verification evidence was recorded without performing an action.",
    evidenceRef: evidence,
  });
  return cloneTrace({
    ...verified,
    status: verified.blockers.length ? "blocked" : "verified",
    sideEffectsPerformed: false,
  });
}

export function summarizeRuntimeTrace(trace: PersonalIntelligenceRuntimeTrace): string {
  const completed = trace.stages.filter((stage) => stage.status === "completed").length;
  return `${trace.title}: ${trace.status}; ${completed}/${trace.stages.length} doctrine stages completed; ${trace.blockers.length} blockers; side effects performed: false.`;
}

export function createTraceFromMemoryApprovalDryRun(
  result: MemoryApprovalDryRunEvidence,
  context: RuntimeTraceContext,
): PersonalIntelligenceRuntimeTrace {
  const now = context.now ?? (() => new Date());
  const timestamp = now().toISOString();
  let trace = createPersonalIntelligenceRuntimeTrace({
    ...context,
    title: context.title ?? "Memory approval dry-run evidence",
    relatedProposalId: result.proposalId,
    warnings: [...result.warnings],
    blockers: result.sideEffectsPerformed
      ? [...result.blockers, "Dry-run evidence claimed side effects and was blocked."]
      : [...result.blockers],
    now: () => new Date(timestamp),
  });
  const stages: RuntimeTraceStageInput[] = [
    { stage: "sense", status: "completed", summary: "Received a bounded memory approval dry-run result.", timestamp },
    { stage: "understand", status: "completed", summary: `Interpreted dry-run status: ${result.status}.`, timestamp },
    { stage: "plan", status: "completed", summary: "Planned evidence recording only; no persistence was requested.", timestamp },
    { stage: "approve", status: "completed", summary: "Recorded that governed persistence approval remains a separate authority boundary.", requiresApproval: true, approvalSatisfied: Boolean(context.relatedApprovalId), timestamp },
    { stage: "act", status: result.blockers.length ? "blocked" : "skipped", summary: "No action executed; the adapter result was observed as dry-run evidence only.", requiresApproval: true, approvalSatisfied: false, timestamp },
    { stage: "verify", status: result.dryRun && !result.sideEffectsPerformed ? "completed" : "failed", summary: "Verified the result was dry-run-only and reported no side effects.", evidenceRef: `proposal:${result.proposalId}`, timestamp },
    { stage: "learn", status: "completed", summary: "Prepared a bounded learning-event candidate; nothing was persisted.", timestamp },
  ];
  for (const stage of stages) trace = appendRuntimeTraceStage(trace, stage);
  if (result.sideEffectsPerformed) return markRuntimeTraceBlocked(trace, "Runtime trace inputs must report sideEffectsPerformed: false.");
  return result.status === "dry_run"
    ? markRuntimeTraceVerified(trace, `dry-run:${result.proposalId}`)
    : trace;
}

export function createTraceFromPersistenceProposal(
  proposal: PersonalIntelligencePersistenceProposal,
  context: RuntimeTraceContext,
): PersonalIntelligenceRuntimeTrace {
  const timestamp = (context.now ?? (() => new Date()))().toISOString();
  let trace = createPersonalIntelligenceRuntimeTrace({
    ...context,
    title: context.title ?? `Persistence proposal evidence: ${proposal.title}`,
    relatedProposalId: proposal.proposalId,
    warnings: [...proposal.warnings],
    blockers: [...proposal.blockers],
    now: () => new Date(timestamp),
  });
  trace = appendRuntimeTraceStage(trace, {
    stage: "sense", status: "completed", summary: "Received a governed persistence proposal summary.", timestamp,
  });
  trace = appendRuntimeTraceStage(trace, {
    stage: "understand", status: "completed", summary: `Proposal is ${proposal.status} for ${proposal.requestedOperation}.`, timestamp,
  });
  trace = appendRuntimeTraceStage(trace, {
    stage: "plan", status: "completed", summary: "Prepared proposal evidence for review without writing it.", timestamp,
  });
  trace = appendRuntimeTraceStage(trace, {
    stage: "approve", status: "pending", summary: "Explicit approval remains required at the governed persistence boundary.", requiresApproval: true, approvalSatisfied: false, timestamp,
  });
  trace = appendRuntimeTraceStage(trace, {
    stage: "act", status: "blocked", summary: "Persistence is blocked until policy, approval, dry-run, and governed adapter gates complete.", requiresApproval: true, approvalSatisfied: false, timestamp,
  });
  return trace;
}

function cloneTrace(trace: PersonalIntelligenceRuntimeTrace): PersonalIntelligenceRuntimeTrace {
  return {
    ...trace,
    stages: trace.stages.map((stage) => ({ ...stage, sideEffectsPerformed: false })),
    warnings: [...trace.warnings],
    blockers: [...trace.blockers],
    sideEffectsPerformed: false,
  };
}

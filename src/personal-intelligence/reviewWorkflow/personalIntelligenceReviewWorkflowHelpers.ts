import type { LucaExperienceMode } from "../../experience/experienceMode";
import {
  createMemoryControlReviewQueue,
  previewMemoryControlAction,
  summarizeMemoryControlPreview,
  type PersonalMemoryControlAction,
  type PersonalMemoryControlRequest,
  type PersonalMemoryControlReviewItem,
} from "../memoryControls";
import type { PersonalMemoryGraph, PersonalMemoryNode } from "../memoryGraph";
import { actionRequiresExplicitReviewConfirmation, phaseForPreview } from "./personalIntelligenceReviewWorkflowPolicy";
import type {
  PersonalIntelligenceReviewEvent,
  PersonalIntelligenceReviewPreviewState,
  PersonalIntelligenceReviewResult,
  PersonalIntelligenceReviewSelection,
  PersonalIntelligenceReviewWorkflowItem,
  PersonalIntelligenceReviewWorkflowPhase,
  PersonalIntelligenceReviewWorkflowState,
} from "./personalIntelligenceReviewWorkflowTypes";

interface CreateWorkflowOptions {
  readonly mode?: LucaExperienceMode;
  readonly now?: Date;
  readonly workflowId?: string;
}

interface ActionPreviewOptions {
  readonly changes?: PersonalMemoryControlRequest["changes"];
  readonly expiresAt?: string;
  readonly now?: Date;
}

const BASIC_MEMORY_ID = "hidden";
const DEFAULT_WORKFLOW_ID_PREFIX = "personal-intelligence-review";
const DEFAULT_CORRECTION_CHANGES = {
  summary: "Fictional correction preview awaiting explicit user wording.",
} satisfies PersonalMemoryControlRequest["changes"];

function safeWorkflowId(graph: PersonalMemoryGraph, now: Date): string {
  return `${DEFAULT_WORKFLOW_ID_PREFIX}:${graph.graphId}:${now.toISOString()}`;
}

function displayAction(action: PersonalMemoryControlAction): string {
  return action.replace(/_/g, " ");
}

function targetIdForMode(memoryId: string, mode: LucaExperienceMode): string {
  return mode === "basic" ? BASIC_MEMORY_ID : memoryId;
}

function previewSummaryForMode(
  preview: Pick<PersonalMemoryControlRequest, "targetMemoryId"> & { readonly summary: string },
  mode: LucaExperienceMode,
): string {
  return mode === "basic"
    ? preview.summary.replace(preview.targetMemoryId, "hidden memory")
    : preview.summary;
}

function toWorkflowItem(
  item: PersonalMemoryControlReviewItem,
  mode: LucaExperienceMode,
): PersonalIntelligenceReviewWorkflowItem {
  const base = {
    memoryId: item.memoryId,
    title: item.title,
    detail: item.detail,
    reasons: item.reasons,
    suggestedActions: item.suggestedActions,
    redacted: item.redacted,
  } satisfies Pick<
    PersonalIntelligenceReviewWorkflowItem,
    "memoryId" | "title" | "detail" | "reasons" | "suggestedActions" | "redacted"
  >;

  if (mode === "basic") return base;

  return {
    ...base,
    displayId: item.memoryId,
    category: item.category,
    sensitivity: item.sensitivity,
    staleness: item.staleness,
    reasonCount: item.reasons.length,
    audit:
      mode === "creator" && item.audit
        ? { ...item.audit, safeMemoryId: item.memoryId }
        : undefined,
  };
}

function findNode(graph: PersonalMemoryGraph, memoryId: string): PersonalMemoryNode | null {
  return graph.nodes.find((node) => node.id === memoryId) ?? null;
}

function createResult(params: {
  readonly workflowId: string;
  readonly targetMemoryId: string;
  readonly action?: PersonalMemoryControlAction;
  readonly phase: PersonalIntelligenceReviewWorkflowPhase;
  readonly preview: PersonalIntelligenceReviewPreviewState | null;
  readonly decision: PersonalIntelligenceReviewResult["decision"];
  readonly reason: PersonalIntelligenceReviewResult["reason"];
  readonly requiresConfirmation: boolean;
  readonly requiresUserReview: boolean;
  readonly mode: LucaExperienceMode;
  readonly eventSummary: string;
  readonly confirmed?: boolean;
}): PersonalIntelligenceReviewResult {
  return {
    ...params,
    sideEffectsPerformed: false,
    persistencePerformed: false,
    mutationPerformed: false,
  };
}

export function createMemoryReviewEventSummary(result: Pick<
  PersonalIntelligenceReviewResult,
  "phase" | "action" | "decision" | "requiresConfirmation" | "persistencePerformed" | "sideEffectsPerformed"
>): string {
  const action = result.action ? displayAction(result.action) : "no action";
  const confirmation = result.requiresConfirmation ? "confirmation required" : "preview only";
  const persistence = result.persistencePerformed ? "performed" : "deferred";
  const sideEffects = result.sideEffectsPerformed ? "performed" : "none";
  return `Personal Intelligence review preview: ${result.phase.replace(/_/g, " ")} (${confirmation}). Action: ${action}. Decision: ${result.decision.replace(/_/g, " ")}. Persistence: ${persistence}. Side effects: ${sideEffects}.`;
}

export function createPersonalIntelligenceReviewOperationSummary(result: PersonalIntelligenceReviewResult): string {
  const action = result.action ? displayAction(result.action) : "no action";
  return `Personal Intelligence review preview: ${result.phase.replace(/_/g, " ")}. Action: ${action}. Persistence: deferred. Side effects: none.`;
}

export function createMemoryReviewWorkflowState(
  graph: PersonalMemoryGraph,
  options: CreateWorkflowOptions = {},
): PersonalIntelligenceReviewWorkflowState {
  const now = options.now ?? new Date();
  const mode = options.mode ?? "basic";
  const queue = createMemoryControlReviewQueue(graph, mode, now);
  const workflowId = options.workflowId ?? safeWorkflowId(graph, now);
  const result = createResult({
    workflowId,
    targetMemoryId: targetIdForMode("none", mode),
    phase: queue.items.length > 0 ? "idle" : "review_only",
    preview: null,
    decision: queue.items.length > 0 ? "review_only" : "allowed",
    reason: "workflow_ready",
    requiresConfirmation: false,
    requiresUserReview: queue.items.length > 0,
    mode,
    eventSummary:
      queue.items.length > 0
        ? "Memory review workflow is ready. No memory changes have been applied."
        : "Memory review queue is empty. No memory changes have been applied.",
  });

  return {
    workflowId,
    graphId: graph.graphId,
    mode,
    phase: result.phase,
    queue,
    items: queue.items.map((item) => toWorkflowItem(item, mode)),
    selection: null,
    preview: null,
    result,
    eventSummary: result.eventSummary,
    generatedAt: queue.generatedAt,
    sideEffectsPerformed: false,
    persistencePerformed: false,
    mutationPerformed: false,
  };
}

export function selectMemoryReviewItem(
  state: PersonalIntelligenceReviewWorkflowState,
  targetMemoryId: string,
  selectedAction?: PersonalMemoryControlAction,
): PersonalIntelligenceReviewWorkflowState {
  const item = state.items.find((candidate) => candidate.memoryId === targetMemoryId);
  if (!item) {
    const result = createResult({
      workflowId: state.workflowId,
      targetMemoryId: targetIdForMode(targetMemoryId, state.mode),
      action: selectedAction,
      phase: "blocked",
      preview: null,
      decision: "blocked",
      reason: "target_not_found",
      requiresConfirmation: false,
      requiresUserReview: true,
      mode: state.mode,
      eventSummary: "The selected memory review item was not found. No memory changes have been applied.",
    });
    return { ...state, phase: "blocked", selection: null, preview: null, result, eventSummary: result.eventSummary };
  }

  const selection: PersonalIntelligenceReviewSelection = {
    workflowId: state.workflowId,
    targetMemoryId,
    item,
    selectedAction: selectedAction ?? item.suggestedActions[0],
    mode: state.mode,
    sideEffectsPerformed: false,
    persistencePerformed: false,
  };
  const result = createResult({
    workflowId: state.workflowId,
    targetMemoryId: targetIdForMode(targetMemoryId, state.mode),
    action: selection.selectedAction,
    phase: "selected",
    preview: null,
    decision: "review_only",
    reason: "item_selected",
    requiresConfirmation: false,
    requiresUserReview: true,
    mode: state.mode,
    eventSummary: "Memory review item selected. Preview is local only and no memory changes have been applied.",
  });
  return { ...state, phase: "selected", selection, preview: null, result, eventSummary: result.eventSummary };
}

export function createMemoryReviewActionPreview(
  graph: PersonalMemoryGraph,
  state: PersonalIntelligenceReviewWorkflowState,
  targetMemoryId: string,
  action: PersonalMemoryControlAction,
  options: ActionPreviewOptions = {},
): PersonalIntelligenceReviewWorkflowState {
  const request: PersonalMemoryControlRequest = {
    targetMemoryId,
    action,
    changes: action === "correct_memory" || action === "edit_memory" ? options.changes ?? DEFAULT_CORRECTION_CHANGES : options.changes,
    expiresAt: options.expiresAt,
    requestedBy: "user",
  };
  const controlPreview = previewMemoryControlAction(graph, request, { mode: state.mode, now: options.now });
  const node = findNode(graph, targetMemoryId);
  const requiresConfirmation = actionRequiresExplicitReviewConfirmation(action, controlPreview, node);
  const requiresUserReview = requiresConfirmation || controlPreview.decision === "approval_required";
  const phase = phaseForPreview(controlPreview, requiresConfirmation);
  const preview: PersonalIntelligenceReviewPreviewState = {
    workflowId: state.workflowId,
    targetMemoryId: targetIdForMode(targetMemoryId, state.mode),
    displayTargetMemoryId: state.mode === "basic" ? undefined : targetMemoryId,
    action,
    currentStateSummary: controlPreview.currentStateSummary,
    proposedStateSummary: controlPreview.proposedStateSummary,
    summary: previewSummaryForMode(
      { targetMemoryId, summary: summarizeMemoryControlPreview(controlPreview) },
      state.mode,
    ),
    warnings: controlPreview.warnings,
    decision: controlPreview.decision,
    reason: controlPreview.reason,
    requiresConfirmation,
    requiresUserReview,
    mode: state.mode,
    sideEffectsPerformed: false,
    persistencePerformed: false,
  };
  const result = createResult({
    workflowId: state.workflowId,
    targetMemoryId: preview.targetMemoryId,
    action,
    phase,
    preview,
    decision: controlPreview.decision,
    reason: controlPreview.reason,
    requiresConfirmation,
    requiresUserReview,
    mode: state.mode,
    eventSummary: createMemoryReviewEventSummary({
      phase,
      action,
      decision: controlPreview.decision,
      requiresConfirmation,
      persistencePerformed: false,
      sideEffectsPerformed: false,
    }),
  });
  const selection = state.selection?.targetMemoryId === targetMemoryId
    ? { ...state.selection, selectedAction: action }
    : selectMemoryReviewItem(state, targetMemoryId, action).selection;

  return { ...state, phase, selection, preview, result, eventSummary: result.eventSummary };
}

export function confirmMemoryReviewPreview(
  state: PersonalIntelligenceReviewWorkflowState,
): PersonalIntelligenceReviewWorkflowState {
  if (!state.preview) {
    const result = createResult({
      workflowId: state.workflowId,
      targetMemoryId: targetIdForMode("none", state.mode),
      phase: "blocked",
      preview: null,
      decision: "blocked",
      reason: "missing_changes",
      requiresConfirmation: false,
      requiresUserReview: true,
      mode: state.mode,
      eventSummary: "No preview is available to confirm. No memory changes have been applied.",
    });
    return { ...state, phase: "blocked", result, eventSummary: result.eventSummary };
  }

  const eventSummary = "Confirmation records intent only; persistence is deferred. No memory changes have been applied.";
  const event: PersonalIntelligenceReviewEvent = {
    workflowId: state.workflowId,
    targetMemoryId: state.preview.targetMemoryId,
    action: state.preview.action,
    phase: "confirmed",
    decision: "confirmed_intent",
    reason: "confirmation_recorded",
    summary: eventSummary,
    sideEffectsPerformed: false,
    persistencePerformed: false,
    mutationPerformed: false,
  };
  void event;
  const result = createResult({
    workflowId: state.workflowId,
    targetMemoryId: state.preview.targetMemoryId,
    action: state.preview.action,
    phase: "confirmed",
    preview: state.preview,
    decision: "confirmed_intent",
    reason: "confirmation_recorded",
    requiresConfirmation: state.preview.requiresConfirmation,
    requiresUserReview: state.preview.requiresUserReview,
    mode: state.mode,
    eventSummary,
    confirmed: true,
  });
  return { ...state, phase: "confirmed", result, eventSummary };
}

export function cancelMemoryReviewPreview(
  state: PersonalIntelligenceReviewWorkflowState,
): PersonalIntelligenceReviewWorkflowState {
  const eventSummary = "Preview cancelled. No memory changes have been applied.";
  const result = createResult({
    workflowId: state.workflowId,
    targetMemoryId: state.preview?.targetMemoryId ?? targetIdForMode("none", state.mode),
    action: state.preview?.action,
    phase: "cancelled",
    preview: state.preview,
    decision: "cancelled_intent",
    reason: "preview_cancelled",
    requiresConfirmation: false,
    requiresUserReview: false,
    mode: state.mode,
    eventSummary,
    confirmed: false,
  });
  return { ...state, phase: "cancelled", result, eventSummary };
}

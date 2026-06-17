import type { LucaExperienceMode } from "../../experience/experienceMode";
import {
  getMemoryStaleness,
  isMemoryExpired,
  NON_SYNCABLE_SENSITIVITIES,
} from "../memoryGraph";
import type { PersonalMemoryGraph, PersonalMemoryNode } from "../memoryGraph";
import { evaluateMemoryControlAction } from "./memoryControlPolicy";
import type {
  PersonalMemoryControlAction,
  PersonalMemoryControlOptions,
  PersonalMemoryControlPreview,
  PersonalMemoryControlRequest,
  PersonalMemoryControlReviewItem,
  PersonalMemoryControlReviewQueue,
  PersonalMemoryControlStateSummary,
  PersonalMemoryReviewReason,
} from "./memoryControlTypes";

const PROTECTED_TITLE = "Protected memory";
const PROTECTED_DETAIL = "Sensitive memory details are hidden until the user reviews them safely.";
const IMPORTANT_STALE_CATEGORIES = new Set(["identity", "project", "goal", "active_task"]);
const TEMPORARY_REVIEW_WINDOW_MS = 24 * 60 * 60 * 1000;

function cloneNode(node: PersonalMemoryNode): PersonalMemoryNode {
  return {
    ...node,
    value: node.value === undefined ? undefined : JSON.parse(JSON.stringify(node.value)),
    privacy: { ...node.privacy },
    tags: [...node.tags],
    evidence: node.evidence.map((evidence) => ({ ...evidence })),
  };
}

function createStateSummary(
  node: PersonalMemoryNode,
  original: PersonalMemoryNode = node,
): PersonalMemoryControlStateSummary {
  return {
    lifecycle: node.lifecycle,
    approvalState: node.approvalState,
    sensitivity: node.sensitivity,
    localOnly: node.privacy.localOnly,
    allowSync: node.privacy.allowSync,
    expiresAt: node.expiresAt,
    titleChanged: node.title !== original.title,
    summaryChanged: node.summary !== original.summary,
    valueChanged: JSON.stringify(node.value) !== JSON.stringify(original.value),
  };
}

function applyPreview(
  node: PersonalMemoryNode,
  request: PersonalMemoryControlRequest,
): PersonalMemoryNode {
  const proposed = cloneNode(node);
  switch (request.action) {
    case "approve_memory":
      proposed.approvalState = "approved";
      if (proposed.lifecycle === "pending_approval" || proposed.lifecycle === "draft") {
        proposed.lifecycle = "active";
      }
      break;
    case "deny_memory":
      proposed.approvalState = "denied";
      break;
    case "forget_memory":
      proposed.lifecycle = "forgotten";
      break;
    case "correct_memory":
    case "edit_memory":
      if (request.changes?.title !== undefined) proposed.title = request.changes.title;
      if (request.changes?.summary !== undefined) proposed.summary = request.changes.summary;
      if (request.changes?.value !== undefined) proposed.value = request.changes.value;
      if (request.changes?.expiresAt !== undefined) proposed.expiresAt = request.changes.expiresAt;
      if (proposed.sensitivity === "private" || proposed.sensitivity === "sensitive" || proposed.sensitivity === "secret") {
        proposed.approvalState = "requires_review";
      }
      break;
    case "make_temporary":
      proposed.expiresAt = request.expiresAt ?? request.changes?.expiresAt;
      break;
    case "make_private":
      if (proposed.sensitivity === "public" || proposed.sensitivity === "personal") {
        proposed.sensitivity = "private";
      }
      proposed.privacy = {
        ...proposed.privacy,
        localOnly: true,
        allowSync: false,
        redactValueInSummaries: true,
      };
      break;
    case "mark_do_not_sync":
      proposed.privacy = { ...proposed.privacy, localOnly: true, allowSync: false };
      break;
    case "mark_sync_allowed":
      proposed.privacy = { ...proposed.privacy, localOnly: false, allowSync: true };
      break;
    case "archive_memory":
      proposed.lifecycle = "archived";
      break;
    case "restore_memory":
      proposed.lifecycle = "active";
      proposed.expiresAt = undefined;
      if (node.lifecycle === "forgotten" || node.lifecycle === "expired") {
        proposed.approvalState = "requires_review";
      }
      break;
  }
  return proposed;
}

export function summarizeMemoryControlPreview(preview: PersonalMemoryControlPreview): string {
  if (!preview.proposedStateSummary) {
    return `Memory ${preview.targetMemoryId} was not found; no changes were applied.`;
  }
  const disposition = preview.decision.replace(/_/g, " ");
  return `${preview.action.replace(/_/g, " ")} preview for ${preview.targetMemoryId}: ${disposition}. No changes were applied.`;
}

export function previewMemoryControlAction(
  graph: PersonalMemoryGraph,
  request: PersonalMemoryControlRequest,
  options: PersonalMemoryControlOptions = {},
): PersonalMemoryControlPreview {
  const node = graph.nodes.find((candidate) => candidate.id === request.targetMemoryId);
  if (!node) {
    const preview: PersonalMemoryControlPreview = {
      targetMemoryId: request.targetMemoryId,
      action: request.action,
      currentStateSummary: null,
      proposedStateSummary: null,
      proposedNode: null,
      decision: "blocked",
      reason: "target_not_found",
      risk: "low",
      warnings: ["The requested memory does not exist in the supplied graph."],
      summary: "",
      sideEffectsPerformed: false,
    };
    return { ...preview, summary: summarizeMemoryControlPreview(preview) };
  }

  const evaluation = evaluateMemoryControlAction(node, request.action, {
    ...options,
    changes: request.changes,
    expiresAt: request.expiresAt,
  });
  const proposedNode = applyPreview(node, request);
  const preview: PersonalMemoryControlPreview = {
    targetMemoryId: node.id,
    action: request.action,
    currentStateSummary: createStateSummary(node),
    proposedStateSummary: createStateSummary(proposedNode, node),
    proposedNode,
    ...evaluation,
    summary: "",
    sideEffectsPerformed: false,
  };
  return { ...preview, summary: summarizeMemoryControlPreview(preview) };
}

function reviewReasonsFor(
  graph: PersonalMemoryGraph,
  node: PersonalMemoryNode,
  now: Date,
): PersonalMemoryReviewReason[] {
  const reasons: PersonalMemoryReviewReason[] = [];
  const staleness = getMemoryStaleness(node, now);
  const conflict = graph.edges.some(
    (edge) =>
      edge.type === "conflicts_with" &&
      (edge.fromNodeId === node.id || edge.toNodeId === node.id),
  );
  const syncRisk =
    (NON_SYNCABLE_SENSITIVITIES.has(node.sensitivity) && node.privacy.allowSync) ||
    (node.privacy.localOnly && node.privacy.allowSync);

  if (node.approvalState === "pending" || node.lifecycle === "pending_approval") {
    reasons.push("pending_approval");
  }
  if (node.approvalState === "requires_review") reasons.push("requires_review");
  if (staleness === "stale" && IMPORTANT_STALE_CATEGORIES.has(node.category)) {
    reasons.push("stale_important");
  }
  if (conflict) reasons.push("conflict");
  if (syncRisk) reasons.push("sync_risk");
  if (
    (node.sensitivity === "sensitive" || node.sensitivity === "secret") &&
    node.approvalState !== "approved"
  ) {
    reasons.push("sensitive_confirmation");
  }
  if (node.category === "temporary_context" || node.expiresAt) {
    if (isMemoryExpired(node, now)) {
      reasons.push("temporary_expired");
    } else if (node.expiresAt) {
      const timeUntilExpiration = Date.parse(node.expiresAt) - now.getTime();
      if (timeUntilExpiration <= TEMPORARY_REVIEW_WINDOW_MS) {
        reasons.push("temporary_near_expiration");
      }
    }
  }
  return reasons;
}

function suggestedActionsFor(reasons: readonly PersonalMemoryReviewReason[]): PersonalMemoryControlAction[] {
  const actions = new Set<PersonalMemoryControlAction>();
  if (reasons.includes("pending_approval") || reasons.includes("sensitive_confirmation")) {
    actions.add("approve_memory");
    actions.add("deny_memory");
  }
  if (reasons.includes("requires_review") || reasons.includes("conflict") || reasons.includes("stale_important")) {
    actions.add("correct_memory");
    actions.add("archive_memory");
  }
  if (reasons.includes("sync_risk")) actions.add("mark_do_not_sync");
  if (reasons.includes("temporary_near_expiration")) actions.add("make_temporary");
  if (reasons.includes("temporary_expired")) actions.add("restore_memory");
  actions.add("forget_memory");
  return [...actions];
}

function createReviewItem(
  graph: PersonalMemoryGraph,
  node: PersonalMemoryNode,
  reasons: readonly PersonalMemoryReviewReason[],
  mode: LucaExperienceMode,
  now: Date,
): PersonalMemoryControlReviewItem {
  const protectedDetail =
    node.privacy.redactValueInSummaries ||
    node.sensitivity === "sensitive" ||
    node.sensitivity === "secret";
  const edgeIds = graph.edges
    .filter((edge) => edge.fromNodeId === node.id || edge.toNodeId === node.id)
    .map((edge) => edge.id);

  return {
    memoryId: node.id,
    title: protectedDetail ? PROTECTED_TITLE : node.title,
    detail: protectedDetail ? PROTECTED_DETAIL : node.summary,
    category: mode === "basic" ? undefined : node.category,
    sensitivity: mode === "basic" ? undefined : node.sensitivity,
    staleness: mode === "basic" ? undefined : getMemoryStaleness(node, now),
    reasons,
    suggestedActions: suggestedActionsFor(reasons),
    redacted: protectedDetail,
    audit:
      mode === "creator"
        ? {
            source: node.source,
            confidence: node.confidence,
            evidenceIds: node.evidence.flatMap((evidence) =>
              evidence.sourceId ? [evidence.sourceId] : [],
            ),
            evidenceCount: node.evidence.length,
            edgeIds,
          }
        : undefined,
  };
}

export function createMemoryControlReviewQueue(
  graph: PersonalMemoryGraph,
  mode: LucaExperienceMode = "basic",
  now: Date = new Date(),
): PersonalMemoryControlReviewQueue {
  const items = graph.nodes
    .map((node) => ({ node, reasons: reviewReasonsFor(graph, node, now) }))
    .filter(({ reasons }) => reasons.length > 0)
    .map(({ node, reasons }) => createReviewItem(graph, node, reasons, mode, now))
    .sort((left, right) => left.memoryId.localeCompare(right.memoryId));

  return {
    graphId: graph.graphId,
    mode,
    items,
    generatedAt: now.toISOString(),
    sideEffectsPerformed: false,
  };
}

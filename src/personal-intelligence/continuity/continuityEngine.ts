import type { LucaExperienceMode } from "../../experience/experienceMode";
import {
  findConflictingMemories,
  getMemoryRelationships,
  getMemoryStaleness,
  isMemoryActive,
  isMemoryExpired,
  requiresMemoryApproval,
  shouldSurfaceMemoryInBasic,
  shouldSurfaceMemoryInCreator,
  shouldSurfaceMemoryInPro,
} from "../memoryGraph";
import type {
  PersonalMemoryGraph,
  PersonalMemoryNode,
} from "../memoryGraph";
import { scoreContinuityNode, sortByContinuityRelevance } from "./continuityScoring";
import type {
  ContinuityAuditMetadata,
  ContinuityBlockerSummary,
  ContinuityDecisionSummary,
  ContinuityNextAction,
  ContinuityProjectSummary,
  ContinuityTaskSummary,
  ContinuityWarning,
  CreateContinuitySnapshotOptions,
  PersonalContinuitySnapshot,
} from "./continuityTypes";

const DEFAULT_MAX_ITEMS = 5;
const BASIC_MAX_ITEMS = 3;
const REDACTED_CONTEXT = "Protected context is available but its details require review.";

/**
 * Builds an advisory, deterministic projection of an already-supplied graph.
 * It performs no persistence, retrieval, model calls, tool calls, or graph mutation.
 */
export function createContinuitySnapshot(
  graph: PersonalMemoryGraph,
  options: CreateContinuitySnapshotOptions = {},
): PersonalContinuitySnapshot {
  const mode = options.mode ?? "basic";
  const now = options.now ?? new Date();
  const requestedMax = normalizeMaxItems(options.maxItems);
  const maxItems = mode === "basic" ? Math.min(requestedMax, BASIC_MAX_ITEMS) : requestedMax;
  const visibleActiveNodes = graph.nodes.filter(
    (node) => isMemoryActive(node, now) && canSurface(node, mode, now) && !requiresMemoryApproval(node),
  );
  const visibleNodeIds = new Set(visibleActiveNodes.map((node) => node.id));
  const blockedTaskIds = findBlockedTaskIds(graph, now);

  const projectNodes = sortByContinuityRelevance(
    visibleActiveNodes.filter((node) => node.category === "project"),
    graph,
    now,
  );
  const taskNodes = sortByContinuityRelevance(
    visibleActiveNodes.filter((node) => node.category === "active_task"),
    graph,
    now,
  ).slice(0, maxItems);
  const decisionNodes = sortByContinuityRelevance(
    visibleActiveNodes.filter(isDecisionNode),
    graph,
    now,
  ).slice(0, maxItems);

  const activeProjectNode = projectNodes[0] ?? null;
  const openTasks = taskNodes.map((node) =>
    createTaskSummary(node, graph, mode, now, blockedTaskIds.has(node.id), visibleNodeIds),
  );
  const recentDecisions = decisionNodes.map((node) =>
    createDecisionSummary(node, graph, mode, now),
  );
  const blockers = mode === "basic"
    ? []
    : createBlockers(graph, mode, now, visibleNodeIds).slice(0, maxItems);
  const activeProject = activeProjectNode
    ? createProjectSummary(activeProjectNode, graph, mode, now, visibleActiveNodes)
    : null;
  const recommendedNextActions = createNextActions(
    openTasks,
    activeProject,
    blockers,
    mode,
    maxItems,
  );
  const restoredContext = sortByContinuityRelevance(
    visibleActiveNodes.filter((node) => node.category === "temporary_context"),
    graph,
    now,
  )
    .slice(0, maxItems)
    .map((node) => safeSummary(node));

  return {
    graphId: graph.graphId,
    mode,
    activeProject,
    openTasks,
    recentDecisions,
    blockers,
    recommendedNextActions,
    handoffSummary: createHandoff(activeProject, openTasks, recentDecisions, restoredContext),
    staleContextWarnings: mode === "basic"
      ? []
      : createStaleWarnings(graph, mode, now).slice(0, maxItems),
    privacyWarnings: mode === "basic"
      ? []
      : createPrivacyWarnings(graph, mode, now).slice(0, maxItems),
    generatedAt: now.toISOString(),
    sideEffectsPerformed: false,
  };
}

function createProjectSummary(
  node: PersonalMemoryNode,
  graph: PersonalMemoryGraph,
  mode: LucaExperienceMode,
  now: Date,
  visibleNodes: readonly PersonalMemoryNode[],
): ContinuityProjectSummary {
  const projectNodes = visibleNodes.filter((candidate) => belongsToProject(candidate, node, graph));
  return {
    id: node.id,
    title: safeTitle(node),
    summary: safeSummary(node),
    score: scoreContinuityNode(node, graph, now),
    goalTitles: sortByContinuityRelevance(
      projectNodes.filter((candidate) => candidate.category === "goal"),
      graph,
      now,
    ).map(safeTitle),
    openTaskCount: projectNodes.filter((candidate) => candidate.category === "active_task").length,
    ...(mode === "creator" ? { audit: createAudit(node, graph, now, ["selected_active_project"]) } : {}),
  };
}

function createTaskSummary(
  node: PersonalMemoryNode,
  graph: PersonalMemoryGraph,
  mode: LucaExperienceMode,
  now: Date,
  blocked: boolean,
  visibleNodeIds: ReadonlySet<string>,
): ContinuityTaskSummary {
  const dependencyTitles = graph.edges
    .filter((edge) => edge.type === "depends_on" && edge.fromNodeId === node.id)
    .map((edge) => graph.nodes.find((candidate) => candidate.id === edge.toNodeId))
    .filter((candidate): candidate is PersonalMemoryNode => Boolean(candidate && visibleNodeIds.has(candidate.id)))
    .map(safeTitle);

  return {
    id: node.id,
    title: safeTitle(node),
    summary: safeSummary(node),
    score: scoreContinuityNode(node, graph, now),
    ...(node.projectId ? { projectId: node.projectId } : {}),
    blocked,
    dependencyTitles,
    ...(mode === "creator"
      ? { audit: createAudit(node, graph, now, blocked ? ["open_task", "blocked"] : ["open_task"]) }
      : {}),
  };
}

function createDecisionSummary(
  node: PersonalMemoryNode,
  graph: PersonalMemoryGraph,
  mode: LucaExperienceMode,
  now: Date,
): ContinuityDecisionSummary {
  return {
    id: node.id,
    title: safeTitle(node),
    summary: safeSummary(node),
    score: scoreContinuityNode(node, graph, now),
    ...(node.projectId ? { projectId: node.projectId } : {}),
    ...(mode === "creator" ? { audit: createAudit(node, graph, now, ["decision_tag"]) } : {}),
  };
}

function createBlockers(
  graph: PersonalMemoryGraph,
  mode: LucaExperienceMode,
  now: Date,
  visibleNodeIds: ReadonlySet<string>,
): ContinuityBlockerSummary[] {
  const blockers = new Map<string, ContinuityBlockerSummary>();

  for (const task of graph.nodes.filter(
    (node) => node.category === "active_task" && isMemoryActive(node, now) && visibleNodeIds.has(node.id),
  )) {
    if (task.tags.includes("blocked")) {
      blockers.set(`blocked:${task.id}`, {
        id: `blocked:${task.id}`,
        kind: "blocked_task",
        title: `${safeTitle(task)} is blocked`,
        summary: "This open task is marked as blocked and needs review before it can continue.",
        relatedMemoryIds: [task.id],
        ...(mode === "creator" ? { audit: createAudit(task, graph, now, ["blocked_tag"]) } : {}),
      });
    }

    for (const edge of graph.edges.filter(
      (candidate) => candidate.type === "depends_on" && candidate.fromNodeId === task.id,
    )) {
      const dependency = graph.nodes.find((candidate) => candidate.id === edge.toNodeId);
      if (!dependency || !isBlockingDependency(dependency, now)) continue;
      blockers.set(`dependency:${edge.id}`, {
        id: `dependency:${edge.id}`,
        kind: "dependency",
        title: `${safeTitle(task)} has an unresolved dependency`,
        summary: "A dependency is unavailable or requires approval; protected dependency details are not disclosed.",
        relatedMemoryIds: mode === "creator" ? [task.id, dependency.id] : [task.id],
        ...(mode === "creator"
          ? { audit: createAudit(task, graph, now, ["unresolved_dependency", edge.type]) }
          : {}),
      });
    }
  }

  for (const conflict of findConflictingMemories(graph, now)) {
    if (!visibleNodeIds.has(conflict.from.id) || !visibleNodeIds.has(conflict.to.id)) continue;
    blockers.set(`conflict:${conflict.edge.id}`, {
      id: `conflict:${conflict.edge.id}`,
      kind: "conflict",
      title: "Conflicting context needs clarification",
      summary: `${safeTitle(conflict.from)} conflicts with ${safeTitle(conflict.to)}.`,
      relatedMemoryIds: [conflict.from.id, conflict.to.id],
      ...(mode === "creator"
        ? { audit: createAudit(conflict.from, graph, now, ["explicit_conflict_edge"]) }
        : {}),
    });
  }

  return [...blockers.values()].sort((left, right) => left.id.localeCompare(right.id));
}

function createNextActions(
  tasks: readonly ContinuityTaskSummary[],
  project: ContinuityProjectSummary | null,
  blockers: readonly ContinuityBlockerSummary[],
  mode: LucaExperienceMode,
  maxItems: number,
): ContinuityNextAction[] {
  const actions: ContinuityNextAction[] = tasks.map((task) => ({
    id: `continue:${task.id}`,
    title: task.blocked ? `Review blocker: ${task.title}` : `Continue: ${task.title}`,
    rationale: mode === "basic"
      ? task.blocked
        ? "Review what is preventing this task from continuing."
        : "This is the most relevant open work to resume."
      : task.blocked
        ? "The task is continuity-relevant but has an unresolved blocker."
        : `This open task has a deterministic continuity score of ${task.score}.`,
    priority: task.score - (task.blocked ? 100 : 0),
    taskId: task.id,
    ...(task.projectId ? { projectId: task.projectId } : {}),
    blocked: task.blocked,
    ...(mode === "creator" && task.audit ? { audit: task.audit } : {}),
  }));

  if (actions.length === 0 && project) {
    actions.push({
      id: `continue-project:${project.id}`,
      title: `Continue project: ${project.title}`,
      rationale: "No open task is available, so restore the active project context first.",
      priority: project.score,
      projectId: project.id,
      blocked: false,
      ...(mode === "creator" && project.audit ? { audit: project.audit } : {}),
    });
  }

  if (mode !== "basic") {
    for (const blocker of blockers) {
      actions.push({
        id: `resolve:${blocker.id}`,
        title: `Resolve: ${blocker.title}`,
        rationale: "Continuity is limited until this graph-derived blocker is reviewed.",
        priority: -10,
        blocked: true,
        ...(mode === "creator" && blocker.audit ? { audit: blocker.audit } : {}),
      });
    }
  }

  return actions
    .sort((left, right) => right.priority - left.priority || left.id.localeCompare(right.id))
    .slice(0, maxItems);
}

function createHandoff(
  project: ContinuityProjectSummary | null,
  tasks: readonly ContinuityTaskSummary[],
  decisions: readonly ContinuityDecisionSummary[],
  restoredContext: readonly string[],
) {
  const projectText = project ? `Resume ${project.title}.` : "No active project was identified.";
  const taskText = tasks.length === 0
    ? "There are no visible open tasks."
    : `${tasks.length} open ${tasks.length === 1 ? "task is" : "tasks are"} ready for review.`;
  const decisionText = decisions[0] ? ` Most recent decision: ${decisions[0].title}.` : "";
  return {
    headline: project ? `Ready to continue ${project.title}` : "Continuity context is ready",
    detail: `${projectText} ${taskText}${decisionText}`,
    restoredContext,
  };
}

function createStaleWarnings(
  graph: PersonalMemoryGraph,
  mode: LucaExperienceMode,
  now: Date,
): ContinuityWarning[] {
  return sortByContinuityRelevance(
    graph.nodes.filter(
      (node) =>
        isMemoryActive(node, now) &&
        getMemoryStaleness(node, now) === "stale" &&
        canSurface(node, mode, now) &&
        !requiresMemoryApproval(node),
    ),
    graph,
    now,
  ).map((node) => ({
    id: `stale:${node.id}`,
    kind: "stale_context" as const,
    message: `${safeTitle(node)} may be stale and should be confirmed before relying on it.`,
    ...(mode === "creator" ? { relatedMemoryId: node.id, audit: createAudit(node, graph, now, ["stale"]) } : {}),
  }));
}

function createPrivacyWarnings(
  graph: PersonalMemoryGraph,
  mode: LucaExperienceMode,
  now: Date,
): ContinuityWarning[] {
  return graph.nodes
    .filter(
      (node) =>
        node.lifecycle !== "forgotten" &&
        !isMemoryExpired(node, now) &&
        requiresMemoryApproval(node),
    )
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((node, index) => ({
      id: mode === "creator" ? `privacy:${node.id}` : `privacy-review:${index + 1}`,
      kind: "privacy_review" as const,
      message: "Protected memory is pending approval; its title, summary, and value were not used for continuity.",
      ...(mode === "creator"
        ? {
            relatedMemoryId: node.id,
            audit: createAudit(node, graph, now, ["approval_required", "content_redacted"]),
          }
        : {}),
    }));
}

function createAudit(
  node: PersonalMemoryNode,
  graph: PersonalMemoryGraph,
  now: Date,
  reasoningFlags: readonly string[],
): ContinuityAuditMetadata {
  return {
    source: node.source,
    confidence: node.confidence,
    staleness: getMemoryStaleness(node, now),
    relationshipEvidence: getMemoryRelationships(graph, node.id).map((edge) => ({
      edgeId: edge.id,
      type: edge.type,
      relatedNodeId: edge.fromNodeId === node.id ? edge.toNodeId : edge.fromNodeId,
    })),
    reasoningFlags,
  };
}

function findBlockedTaskIds(graph: PersonalMemoryGraph, now: Date): ReadonlySet<string> {
  const blocked = new Set(
    graph.nodes
      .filter((node) => node.category === "active_task" && node.tags.includes("blocked"))
      .map((node) => node.id),
  );
  for (const edge of graph.edges.filter((candidate) => candidate.type === "depends_on")) {
    const dependency = graph.nodes.find((node) => node.id === edge.toNodeId);
    if (dependency && isBlockingDependency(dependency, now)) blocked.add(edge.fromNodeId);
  }
  return blocked;
}

function isBlockingDependency(node: PersonalMemoryNode, now: Date): boolean {
  return !isMemoryActive(node, now) || requiresMemoryApproval(node) || node.tags.includes("blocked");
}

function belongsToProject(
  node: PersonalMemoryNode,
  project: PersonalMemoryNode,
  graph: PersonalMemoryGraph,
): boolean {
  if (node.id === project.id) return false;
  if (node.projectId && (node.projectId === project.projectId || node.projectId === project.id)) return true;
  return graph.edges.some(
    (edge) =>
      edge.type === "belongs_to_project" &&
      edge.fromNodeId === node.id &&
      edge.toNodeId === project.id,
  );
}

function isDecisionNode(node: PersonalMemoryNode): boolean {
  return node.tags.includes("decision") || node.tags.includes("recent-decision");
}

function canSurface(node: PersonalMemoryNode, mode: LucaExperienceMode, now: Date): boolean {
  switch (mode) {
    case "creator":
      return shouldSurfaceMemoryInCreator(node, now);
    case "pro":
      return shouldSurfaceMemoryInPro(node, now);
    case "basic":
    default:
      return shouldSurfaceMemoryInBasic(node, now);
  }
}

function safeTitle(node: PersonalMemoryNode): string {
  return shouldRedact(node) ? "Protected memory" : node.title;
}

function safeSummary(node: PersonalMemoryNode): string {
  return shouldRedact(node) ? REDACTED_CONTEXT : node.summary;
}

function shouldRedact(node: PersonalMemoryNode): boolean {
  return (
    node.privacy.redactValueInSummaries ||
    node.sensitivity === "sensitive" ||
    node.sensitivity === "secret" ||
    requiresMemoryApproval(node)
  );
}

function normalizeMaxItems(maxItems: number | undefined): number {
  if (maxItems === undefined || !Number.isFinite(maxItems)) return DEFAULT_MAX_ITEMS;
  return Math.max(1, Math.floor(maxItems));
}

import type { LucaExperienceMode } from "../../experience/experienceMode";
import {
  MEMORY_REVIEW_SOURCES,
  MEMORY_STALENESS_WINDOWS_MS,
  NON_SYNCABLE_SENSITIVITIES,
  PERSONAL_MEMORY_APPROVAL_STATES,
  PERSONAL_MEMORY_CATEGORIES,
  PERSONAL_MEMORY_SENSITIVITIES,
} from "./memoryGraphPolicy";
import type {
  PersonalMemoryCategory,
  PersonalMemoryConflict,
  PersonalMemoryGraph,
  PersonalMemoryGraphCounts,
  PersonalMemoryGraphSummary,
  PersonalMemoryNode,
  PersonalMemorySensitivity,
  PersonalMemoryStaleness,
  PersonalMemorySummaryItem,
} from "./memoryGraphTypes";

const REDACTED_DETAIL = "Sensitive memory detail hidden; review audit metadata instead.";

export function isMemoryExpired(node: PersonalMemoryNode, now: Date = new Date()): boolean {
  if (node.lifecycle === "expired") return true;
  if (!node.expiresAt) return false;
  const expiresAt = Date.parse(node.expiresAt);
  return !Number.isNaN(expiresAt) && expiresAt <= now.getTime();
}

export function isMemoryActive(node: PersonalMemoryNode, now: Date = new Date()): boolean {
  return node.lifecycle === "active" && !isMemoryExpired(node, now);
}

export function requiresMemoryApproval(node: PersonalMemoryNode): boolean {
  if (node.approvalState === "approved" || node.approvalState === "denied") return false;
  if (node.approvalState === "pending" || node.approvalState === "requires_review") return true;
  if (node.lifecycle === "pending_approval") return true;
  if (node.sensitivity === "secret") return true;
  return (
    (node.sensitivity === "sensitive" || node.category === "sensitive_fact") &&
    MEMORY_REVIEW_SOURCES.has(node.source)
  );
}

/**
 * Returns eligibility only. No helper in this module initiates cross-device sync.
 * Sync requires an explicit allow flag and remains unavailable to sensitive data.
 */
export function canMemorySyncByDefault(node: PersonalMemoryNode, now: Date = new Date()): boolean {
  if (!isMemoryActive(node, now)) return false;
  if (node.privacy.localOnly || !node.privacy.allowSync) return false;
  if (NON_SYNCABLE_SENSITIVITIES.has(node.sensitivity)) return false;
  return !requiresMemoryApproval(node) && node.approvalState !== "denied";
}

export function shouldSurfaceMemoryInBasic(node: PersonalMemoryNode, now: Date = new Date()): boolean {
  return (
    isMemoryActive(node, now) &&
    !requiresMemoryApproval(node) &&
    (node.sensitivity === "public" || node.sensitivity === "personal")
  );
}

export function shouldSurfaceMemoryInPro(node: PersonalMemoryNode, now: Date = new Date()): boolean {
  return (
    isMemoryActive(node, now) &&
    !requiresMemoryApproval(node) &&
    node.sensitivity !== "secret"
  );
}

export function shouldSurfaceMemoryInCreator(node: PersonalMemoryNode, now: Date = new Date()): boolean {
  return node.lifecycle !== "forgotten" && !isMemoryExpired(node, now) && node.approvalState !== "denied";
}

export function getMemoryStaleness(node: PersonalMemoryNode, now: Date = new Date()): PersonalMemoryStaleness {
  if (isMemoryExpired(node, now)) return "expired";
  const referenceDate = node.lastUsedAt ?? node.updatedAt ?? node.createdAt;
  const referenceTime = Date.parse(referenceDate);
  if (Number.isNaN(referenceTime)) return "unknown";
  const age = Math.max(0, now.getTime() - referenceTime);
  const window = MEMORY_STALENESS_WINDOWS_MS[node.category];
  if (age <= window / 2) return "fresh";
  if (age <= window) return "aging";
  return "stale";
}

export function filterActiveMemories(
  graph: PersonalMemoryGraph,
  now: Date = new Date(),
): PersonalMemoryNode[] {
  return graph.nodes.filter((node) => isMemoryActive(node, now));
}

export function filterMemoriesByCategory(
  graph: PersonalMemoryGraph,
  category: PersonalMemoryCategory,
): PersonalMemoryNode[] {
  return graph.nodes.filter((node) => node.category === category);
}

export function filterMemoriesBySensitivity(
  graph: PersonalMemoryGraph,
  sensitivity: PersonalMemorySensitivity,
): PersonalMemoryNode[] {
  return graph.nodes.filter((node) => node.sensitivity === sensitivity);
}

export function findConflictingMemories(
  graph: PersonalMemoryGraph,
  now: Date = new Date(),
): PersonalMemoryConflict[] {
  const activeNodes = new Map(filterActiveMemories(graph, now).map((node) => [node.id, node]));
  return graph.edges.flatMap((edge) => {
    if (edge.type !== "conflicts_with") return [];
    const from = activeNodes.get(edge.fromNodeId);
    const to = activeNodes.get(edge.toNodeId);
    return from && to ? [{ edge, from, to }] : [];
  });
}

export function summarizeMemoryGraph(
  graph: PersonalMemoryGraph,
  now: Date = new Date(),
): PersonalMemoryGraphCounts {
  const active = filterActiveMemories(graph, now);
  const reviewable = graph.nodes.filter(
    (node) => node.lifecycle !== "forgotten" && !isMemoryExpired(node, now),
  );
  return {
    total: graph.nodes.length,
    active: active.length,
    byCategory: countValues(reviewable, PERSONAL_MEMORY_CATEGORIES, (node) => node.category),
    bySensitivity: countValues(reviewable, PERSONAL_MEMORY_SENSITIVITIES, (node) => node.sensitivity),
    byApprovalState: countValues(reviewable, PERSONAL_MEMORY_APPROVAL_STATES, (node) => node.approvalState),
  };
}

export function createMemoryGraphSummary(
  graph: PersonalMemoryGraph,
  mode: LucaExperienceMode = "basic",
  now: Date = new Date(),
): PersonalMemoryGraphSummary {
  const counts = summarizeMemoryGraph(graph, now);
  const visibleMemories = graph.nodes
    .filter((node) => shouldSurfaceForMode(node, mode, now))
    .map((node) => createSummaryItem(node, mode, now));

  return {
    graphId: graph.graphId,
    mode,
    ...counts,
    visibleMemories,
    conflictCount: findConflictingMemories(graph, now).length,
    generatedAt: now.toISOString(),
    sideEffectsPerformed: false,
  };
}

export function getMemoryRelationships(
  graph: PersonalMemoryGraph,
  nodeId: string,
) {
  return graph.edges.filter((edge) => edge.fromNodeId === nodeId || edge.toNodeId === nodeId);
}

export function validateMemoryGraph(graph: PersonalMemoryGraph): string[] {
  const errors: string[] = [];
  const nodeIds = new Set<string>();
  const edgeIds = new Set<string>();

  for (const node of graph.nodes) {
    if (!node.id.trim()) errors.push("memory node id is required");
    if (nodeIds.has(node.id)) errors.push(`duplicate memory node id: ${node.id}`);
    nodeIds.add(node.id);
    if (!node.title.trim()) errors.push(`memory node title is required: ${node.id}`);
    if (!node.summary.trim()) errors.push(`memory node summary is required: ${node.id}`);
    if (Number.isNaN(Date.parse(node.createdAt))) errors.push(`invalid createdAt: ${node.id}`);
    if (Number.isNaN(Date.parse(node.updatedAt))) errors.push(`invalid updatedAt: ${node.id}`);
    if (node.expiresAt && Number.isNaN(Date.parse(node.expiresAt))) errors.push(`invalid expiresAt: ${node.id}`);
    if (node.category === "temporary_context" && !node.expiresAt && node.lifecycle === "active") {
      errors.push(`active temporary context must expire: ${node.id}`);
    }
    if (NON_SYNCABLE_SENSITIVITIES.has(node.sensitivity) && node.privacy.allowSync) {
      errors.push(`sensitive memory cannot allow sync: ${node.id}`);
    }
    if (requiresMemoryApproval(node) && node.approvalState === "not_required") {
      errors.push(`memory requiring approval cannot be marked not_required: ${node.id}`);
    }
  }

  for (const edge of graph.edges) {
    if (!edge.id.trim()) errors.push("memory edge id is required");
    if (edgeIds.has(edge.id)) errors.push(`duplicate memory edge id: ${edge.id}`);
    edgeIds.add(edge.id);
    if (!nodeIds.has(edge.fromNodeId)) errors.push(`edge source does not exist: ${edge.id}`);
    if (!nodeIds.has(edge.toNodeId)) errors.push(`edge target does not exist: ${edge.id}`);
    if (edge.fromNodeId === edge.toNodeId) errors.push(`memory edge cannot reference itself: ${edge.id}`);
    if (Number.isNaN(Date.parse(edge.createdAt))) errors.push(`invalid edge createdAt: ${edge.id}`);
  }

  return errors;
}

function shouldSurfaceForMode(node: PersonalMemoryNode, mode: LucaExperienceMode, now: Date): boolean {
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

function createSummaryItem(
  node: PersonalMemoryNode,
  mode: LucaExperienceMode,
  now: Date,
): PersonalMemorySummaryItem {
  const redact =
    node.privacy.redactValueInSummaries ||
    node.sensitivity === "sensitive" ||
    node.sensitivity === "secret" ||
    requiresMemoryApproval(node);

  return {
    id: node.id,
    category: node.category,
    title: node.title,
    detail: redact ? REDACTED_DETAIL : node.summary,
    sensitivity: node.sensitivity,
    approvalState: node.approvalState,
    ...(mode === "creator"
      ? { source: node.source, confidence: node.confidence, staleness: getMemoryStaleness(node, now) }
      : {}),
    redacted: redact,
  };
}

function countValues<T, K extends string>(
  values: readonly T[],
  keys: readonly K[],
  selector: (value: T) => K,
): Record<K, number> {
  const counts = Object.fromEntries(keys.map((key) => [key, 0])) as Record<K, number>;
  for (const value of values) counts[selector(value)] += 1;
  return counts;
}

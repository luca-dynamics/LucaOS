import {
  getMemoryRelationships,
  getMemoryStaleness,
  isMemoryActive,
  requiresMemoryApproval,
} from "../memoryGraph";
import type {
  PersonalMemoryConfidence,
  PersonalMemoryGraph,
  PersonalMemoryNode,
  PersonalMemoryStaleness,
} from "../memoryGraph";

const CATEGORY_WEIGHT: Readonly<Record<PersonalMemoryNode["category"], number>> = {
  identity: 4,
  preference: 5,
  project: 24,
  goal: 18,
  routine: 6,
  relationship: 4,
  device: 2,
  skill: 8,
  active_task: 28,
  temporary_context: 16,
  sensitive_fact: 0,
  system_observation: 10,
};

const CONFIDENCE_WEIGHT: Readonly<Record<PersonalMemoryConfidence, number>> = {
  low: 0,
  medium: 3,
  high: 6,
  confirmed: 8,
};

const STALENESS_WEIGHT: Readonly<Record<PersonalMemoryStaleness, number>> = {
  fresh: 18,
  aging: 8,
  stale: -16,
  expired: -100,
  unknown: -4,
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Scores continuity relevance only; it does not mutate, approve, persist, or execute memory. */
export function scoreContinuityNode(
  node: PersonalMemoryNode,
  graph: PersonalMemoryGraph,
  now: Date = new Date(),
): number {
  const referenceTime = Date.parse(node.lastUsedAt ?? node.updatedAt ?? node.createdAt);
  const ageDays = Number.isNaN(referenceTime)
    ? 30
    : Math.max(0, Math.floor((now.getTime() - referenceTime) / DAY_MS));
  const recency = Math.max(0, 20 - Math.min(ageDays, 20));
  const relationships = getMemoryRelationships(graph, node.id);
  const relationshipScore = relationships.reduce((score, edge) => {
    if (edge.type === "belongs_to_project" || edge.type === "supports_goal") return score + 6;
    if (edge.type === "depends_on") return score + 3;
    if (edge.type === "conflicts_with") return score - 2;
    return score + 1;
  }, 0);
  const lifecycle = isMemoryActive(node, now) ? 20 : -40;
  const approval = requiresMemoryApproval(node) ? -30 : 0;

  return (
    CATEGORY_WEIGHT[node.category] +
    CONFIDENCE_WEIGHT[node.confidence] +
    STALENESS_WEIGHT[getMemoryStaleness(node, now)] +
    recency +
    relationshipScore +
    lifecycle +
    approval
  );
}

export function sortByContinuityRelevance(
  nodes: readonly PersonalMemoryNode[],
  graph: PersonalMemoryGraph,
  now: Date = new Date(),
): PersonalMemoryNode[] {
  return [...nodes].sort((left, right) => {
    const scoreDifference =
      scoreContinuityNode(right, graph, now) - scoreContinuityNode(left, graph, now);
    if (scoreDifference !== 0) return scoreDifference;

    const updatedDifference = Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
    if (!Number.isNaN(updatedDifference) && updatedDifference !== 0) return updatedDifference;
    return left.id.localeCompare(right.id);
  });
}

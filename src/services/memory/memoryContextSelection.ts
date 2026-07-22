import { MemoryNode } from "../../types";

/**
 * Selection of archive memories for prompt injection.
 *
 * The archive is inlined into the system instruction. Emitting all of it made
 * the prompt scale with archive size, so selection is scored and budgeted:
 * identity keeps a reserved slice, everything else competes for the remainder.
 *
 * Kept free of service imports so it stays pure and directly testable.
 */

export const MEMORY_CONTEXT_CHAR_BUDGET = 6000;
export const MEMORY_ITEM_CHAR_LIMIT = 300;
export const IDENTITY_RESERVED_SLOTS = 6;

const MEMORY_STOP_WORDS = new Set([
  "the", "and", "for", "with", "that", "this", "these", "those", "are", "was",
  "were", "been", "being", "does", "did", "you", "your", "our", "they", "them",
  "his", "her", "what", "which", "who", "when", "where", "how", "why", "can",
  "could", "should", "would", "will", "just", "about", "please", "need", "want",
  "get", "got", "make", "made", "let", "now", "from", "its", "not", "but",
]);

export function tokenizeForMemory(text: string): string[] {
  return (text || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2 && !MEMORY_STOP_WORDS.has(t));
}

/**
 * Rank a memory for inclusion. Lexical overlap dominates when a query is
 * supplied; without one this degrades to importance/confidence/recency, which
 * is still a deliberate ordering rather than archive order.
 */
export function scoreMemoryRelevance(
  memory: MemoryNode,
  queryTokens: Set<string>,
  oldest: number,
  newest: number,
): number {
  const importance =
    Math.min(Math.max(memory.metadata?.importance ?? 5, 1), 10) / 10;
  const confidence = Math.min(Math.max(memory.confidence ?? 0.5, 0), 1);
  const span = Math.max(newest - oldest, 1);
  const recency = Math.min(
    Math.max(((memory.timestamp || 0) - oldest) / span, 0),
    1,
  );

  let lexical = 0;
  if (queryTokens.size > 0) {
    const memoryTokens = new Set(
      tokenizeForMemory(`${memory.key} ${memory.value}`),
    );
    let hits = 0;
    queryTokens.forEach((t) => {
      if (memoryTokens.has(t)) hits++;
    });
    lexical = hits / queryTokens.size;
  }

  return lexical * 3 + importance + confidence * 0.5 + recency * 0.5;
}

/** Character cost this memory will add once rendered and truncated. */
export function memoryRenderCost(memory: MemoryNode): number {
  return (
    Math.min((memory.value || "").length, MEMORY_ITEM_CHAR_LIMIT) +
    (memory.key || "").length +
    4
  );
}

export interface MemorySelection {
  selected: MemoryNode[];
  omitted: number;
}

export function selectMemoriesForContext(
  memories: MemoryNode[],
  query?: string,
  budget: number = MEMORY_CONTEXT_CHAR_BUDGET,
): MemorySelection {
  if (!memories.length) return { selected: [], omitted: 0 };

  const queryTokens = new Set(tokenizeForMemory(query || ""));
  const timestamps = memories.map((m) => m.timestamp || 0);
  const oldest = Math.min(...timestamps);
  const newest = Math.max(...timestamps);

  const scored = memories
    .map((memory) => ({
      memory,
      score: scoreMemoryRelevance(memory, queryTokens, oldest, newest),
    }))
    .sort((a, b) => b.score - a.score);

  // Identity gets a reserved slice so a topical query cannot evict who the
  // user is; everything else competes on score for the remaining budget.
  const identity = scored
    .filter((s) => s.memory.category === "USER_STATE")
    .slice(0, IDENTITY_RESERVED_SLOTS);
  const reserved = new Set(identity.map((s) => s.memory.id));
  const queue = [
    ...identity,
    ...scored.filter((s) => !reserved.has(s.memory.id)),
  ];

  const selected: MemoryNode[] = [];
  let used = 0;
  for (const { memory } of queue) {
    const cost = memoryRenderCost(memory);
    // Skip rather than break so a small high-value entry further down the
    // queue can still fit once a large one has been passed over.
    if (used + cost > budget) continue;
    selected.push(memory);
    used += cost;
  }

  return { selected, omitted: memories.length - selected.length };
}

import { MemoryNode } from "../../types";

/**
 * Write-time capacity limits for the memory archive.
 *
 * Budgeting only what gets *injected* bounds the prompt but lets the archive
 * itself grow without limit, so the injected view silently becomes a smaller
 * and smaller fraction of what is stored. Enforcing at the write instead keeps
 * the archive itself curated: once a tier is full the agent has to consolidate
 * before it can record anything new.
 *
 * Kept free of service imports so it stays pure and directly testable.
 */

export type MemoryTier = "identity" | "durable" | "transient";

/** Per-entry overhead of the rendered `- key: value` line. */
const ENTRY_OVERHEAD_CHARS = 4;

export const MEMORY_TIER_LIMITS: Record<MemoryTier, number> = {
  // Who the operator is. Small and deliberately hard to fill.
  identity: 2_000,
  // Durable facts, protocols and agent knowledge.
  durable: 8_000,
  // SESSION_STATE expires on its own; capping it would reject routine
  // bookkeeping writes for no benefit.
  transient: Number.POSITIVE_INFINITY,
};

export function tierForCategory(category: MemoryNode["category"]): MemoryTier {
  if (category === "USER_STATE") return "identity";
  if (category === "SESSION_STATE") return "transient";
  return "durable";
}

export function memoryEntryCost(entry: {
  key?: string;
  value?: string;
}): number {
  return (
    (entry.key || "").length + (entry.value || "").length + ENTRY_OVERHEAD_CHARS
  );
}

export interface MemoryCapacityDecision {
  admitted: boolean;
  tier: MemoryTier;
  usedChars: number;
  projectedChars: number;
  limitChars: number;
  /** Actionable guidance, present only when the write is rejected. */
  reason?: string;
}

export interface IncomingMemory {
  key: string;
  value: string;
  category: MemoryNode["category"];
}

/**
 * Decide whether a write fits its tier. Replacing an existing key nets out the
 * entry being overwritten, so consolidating or shrinking an entry always
 * succeeds even when the tier is already at its limit.
 */
export function evaluateMemoryWrite(
  existing: MemoryNode[],
  incoming: IncomingMemory,
): MemoryCapacityDecision {
  const tier = tierForCategory(incoming.category);
  const limitChars = MEMORY_TIER_LIMITS[tier];

  const inTier = existing.filter((m) => tierForCategory(m.category) === tier);
  const usedChars = inTier.reduce((sum, m) => sum + memoryEntryCost(m), 0);

  const replaced = existing.find(
    (m) =>
      m.category === incoming.category &&
      (m.key || "").toLowerCase() === (incoming.key || "").toLowerCase(),
  );
  const replacedCost = replaced ? memoryEntryCost(replaced) : 0;

  const projectedChars = usedChars - replacedCost + memoryEntryCost(incoming);

  if (projectedChars <= limitChars) {
    return { admitted: true, tier, usedChars, projectedChars, limitChars };
  }

  return {
    admitted: false,
    tier,
    usedChars,
    projectedChars,
    limitChars,
    reason: buildConsolidationGuidance(tier, inTier, projectedChars, limitChars),
  };
}

/**
 * The rejection has to tell the agent what to do about it, or it will simply
 * retry the identical write.
 */
function buildConsolidationGuidance(
  tier: MemoryTier,
  inTier: MemoryNode[],
  projectedChars: number,
  limitChars: number,
): string {
  const largest = [...inTier]
    .sort((a, b) => memoryEntryCost(b) - memoryEntryCost(a))
    .slice(0, 5)
    .map((m) => `  - ${m.key} (${memoryEntryCost(m)} chars)`)
    .join("\n");

  return [
    `Memory tier "${tier}" is full: this write would take it to ${projectedChars} of ${limitChars} characters.`,
    `Nothing was saved. Consolidate or remove an existing entry first, then retry — replacing an entry by its exact key always fits.`,
    largest ? `Largest entries in this tier:\n${largest}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

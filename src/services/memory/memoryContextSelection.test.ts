import { describe, expect, it } from "vitest";
import { MemoryNode } from "../../types";
import {
  MEMORY_CONTEXT_CHAR_BUDGET,
  memoryRenderCost,
  selectMemoriesForContext,
} from "./memoryContextSelection";

function makeMemory(overrides: Partial<MemoryNode> = {}): MemoryNode {
  return {
    id: Math.random().toString(36).slice(2),
    key: "key",
    value: "value",
    category: "SEMANTIC",
    timestamp: 1_000,
    confidence: 0.5,
    ...overrides,
  } as MemoryNode;
}

const totalCost = (memories: MemoryNode[]) =>
  memories.reduce((sum, m) => sum + memoryRenderCost(m), 0);

describe("selectMemoriesForContext", () => {
  it("returns nothing for an empty archive", () => {
    expect(selectMemoriesForContext([])).toEqual({ selected: [], omitted: 0 });
  });

  it("keeps every memory when the archive fits the budget", () => {
    const memories = [
      makeMemory({ key: "a" }),
      makeMemory({ key: "b" }),
      makeMemory({ key: "c" }),
    ];

    const { selected, omitted } = selectMemoriesForContext(memories);

    expect(selected).toHaveLength(3);
    expect(omitted).toBe(0);
  });

  it("bounds a large archive to the character budget and reports the omissions", () => {
    const memories = Array.from({ length: 200 }, (_, i) =>
      makeMemory({ key: `fact-${i}`, value: "x".repeat(500) }),
    );

    const { selected, omitted } = selectMemoriesForContext(memories);

    // The regression this guards: selection used to be the whole archive, so
    // prompt size grew without bound as memories accumulated.
    expect(selected.length).toBeLessThan(memories.length);
    expect(totalCost(selected)).toBeLessThanOrEqual(MEMORY_CONTEXT_CHAR_BUDGET);
    expect(omitted).toBe(memories.length - selected.length);
  });

  it("ranks memories that match the query above ones that do not", () => {
    const relevant = makeMemory({
      key: "deploy-target",
      value: "the kubernetes cluster runs in frankfurt",
    });
    const irrelevant = Array.from({ length: 40 }, (_, i) =>
      makeMemory({ key: `unrelated-${i}`, value: "sourdough baking notes" }),
    );

    const { selected } = selectMemoriesForContext(
      [...irrelevant, relevant],
      "where does the kubernetes cluster run?",
      200,
    );

    expect(selected[0]?.id).toBe(relevant.id);
  });

  it("keeps identity memories even when the query is about something else", () => {
    // Deliberately the most expensive entry as well as the lowest scoring, so
    // it only survives if the reserved slice takes it before the budget fills.
    const identity = makeMemory({
      category: "USER_STATE",
      key: "operator-profile",
      value: "z".repeat(300),
      timestamp: 1,
      confidence: 0.1,
      metadata: { importance: 1 },
    });
    const topical = Array.from({ length: 40 }, (_, i) =>
      makeMemory({
        key: `kubernetes-${i}`,
        value: "kubernetes cluster deployment detail",
        timestamp: 9_000,
        metadata: { importance: 10 },
      }),
    );

    // Identity scores last on every axis here, so without the reserved slice a
    // topical query would evict who the operator is.
    const { selected } = selectMemoriesForContext(
      [...topical, identity],
      "kubernetes cluster deployment",
      400,
    );

    expect(selected.map((m) => m.id)).toContain(identity.id);
    // The topical matches should still take the leftover budget.
    expect(selected.length).toBeGreaterThan(1);
  });
});

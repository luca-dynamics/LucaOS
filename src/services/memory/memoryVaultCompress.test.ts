import { describe, expect, it } from "vitest";
import type { MemoryNode } from "../../types";
import { compressMemoryNodes } from "./memoryVaultCompress";

function node(
  partial: Partial<MemoryNode> & Pick<MemoryNode, "id" | "key" | "value">,
): MemoryNode {
  return {
    category: "SEMANTIC",
    timestamp: Date.now(),
    confidence: 0.9,
    ...partial,
  };
}

describe("compressMemoryNodes", () => {
  it("collapses same key keeping newest", () => {
    const { nodes, result } = compressMemoryNodes([
      node({ id: "1", key: "pref", value: "old", timestamp: 1 }),
      node({ id: "2", key: "pref", value: "new", timestamp: 99 }),
    ]);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].value).toBe("new");
    expect(result.removedDuplicates).toBe(1);
  });

  it("collapses exact duplicate bodies", () => {
    const { nodes, result } = compressMemoryNodes([
      node({ id: "a", key: "k1", value: "hello world" }),
      node({ id: "b", key: "k2", value: "  Hello   World  " }),
    ]);
    expect(nodes).toHaveLength(1);
    expect(result.removedDuplicates).toBeGreaterThanOrEqual(1);
  });

  it("truncates long content", () => {
    const long = "x".repeat(1200);
    const { nodes, result } = compressMemoryNodes(
      [node({ id: "z", key: "long", value: long })],
      { maxContentLength: 100 },
    );
    expect(nodes[0].value.length).toBeLessThanOrEqual(101);
    expect(result.truncated).toBe(1);
  });
});

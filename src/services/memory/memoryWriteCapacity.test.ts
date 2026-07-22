import { describe, expect, it } from "vitest";
import { MemoryNode } from "../../types";
import {
  MEMORY_TIER_LIMITS,
  evaluateMemoryWrite,
  memoryEntryCost,
  tierForCategory,
} from "./memoryWriteCapacity";

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

/** Fill a tier to just under its limit. */
function fillDurable(chars: number): MemoryNode[] {
  const entries: MemoryNode[] = [];
  let used = 0;
  let i = 0;
  while (used < chars) {
    const entry = makeMemory({ key: `fact-${i}`, value: "x".repeat(200) });
    entries.push(entry);
    used += memoryEntryCost(entry);
    i++;
  }
  return entries;
}

describe("tierForCategory", () => {
  it("separates identity, transient and durable memory", () => {
    expect(tierForCategory("USER_STATE")).toBe("identity");
    expect(tierForCategory("SESSION_STATE")).toBe("transient");
    expect(tierForCategory("SEMANTIC")).toBe("durable");
    expect(tierForCategory("FACT")).toBe("durable");
  });
});

describe("evaluateMemoryWrite", () => {
  it("admits a write into an empty archive", () => {
    const decision = evaluateMemoryWrite([], {
      key: "deploy-region",
      value: "frankfurt",
      category: "FACT",
    });

    expect(decision.admitted).toBe(true);
    expect(decision.reason).toBeUndefined();
  });

  it("rejects a write that would exceed the durable limit", () => {
    const existing = fillDurable(MEMORY_TIER_LIMITS.durable);

    const decision = evaluateMemoryWrite(existing, {
      key: "one-more",
      value: "y".repeat(500),
      category: "FACT",
    });

    expect(decision.admitted).toBe(false);
    expect(decision.projectedChars).toBeGreaterThan(decision.limitChars);
  });

  it("tells the agent how to recover rather than just refusing", () => {
    const existing = fillDurable(MEMORY_TIER_LIMITS.durable);

    const { reason } = evaluateMemoryWrite(existing, {
      key: "one-more",
      value: "y".repeat(500),
      category: "FACT",
    });

    // A bare refusal invites the model to retry the identical write.
    expect(reason).toContain("Nothing was saved");
    expect(reason).toMatch(/consolidate/i);
    expect(reason).toContain("Largest entries");
  });

  it("always admits a replacement of an existing key, even when full", () => {
    const existing = fillDurable(MEMORY_TIER_LIMITS.durable);
    const target = existing[0];

    const decision = evaluateMemoryWrite(existing, {
      key: target.key,
      value: "shorter",
      category: target.category,
    });

    expect(decision.admitted).toBe(true);
  });

  it("matches the replaced key case-insensitively", () => {
    const existing = [makeMemory({ key: "Deploy-Region", value: "x".repeat(50) })];

    const decision = evaluateMemoryWrite(existing, {
      key: "deploy-region",
      value: "y".repeat(50),
      category: "SEMANTIC",
    });

    // Same logical entry, so usage must not double-count it.
    expect(decision.projectedChars).toBe(decision.usedChars);
  });

  it("keeps identity memory on a tighter budget than durable memory", () => {
    expect(MEMORY_TIER_LIMITS.identity).toBeLessThan(MEMORY_TIER_LIMITS.durable);

    const decision = evaluateMemoryWrite([], {
      key: "profile",
      value: "z".repeat(MEMORY_TIER_LIMITS.identity + 1),
      category: "USER_STATE",
    });

    expect(decision.admitted).toBe(false);
    expect(decision.tier).toBe("identity");
  });

  it("never rejects transient session bookkeeping", () => {
    const decision = evaluateMemoryWrite([], {
      key: "scratch",
      value: "q".repeat(500_000),
      category: "SESSION_STATE",
    });

    expect(decision.admitted).toBe(true);
    expect(decision.tier).toBe("transient");
  });
});

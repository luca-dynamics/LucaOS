import { describe, expect, it } from "vitest";
import {
  getMemoryContractSnapshot,
  inferMemoryTierFromLegacyItem,
  mapLegacyMemoryToLucaMemoryItem,
  mapLucaMemoryItemToLegacyMemory,
} from "./MemoryTierMapping";

describe("Memory tier mapping", () => {
  it("infers session memory", () => {
    expect(inferMemoryTierFromLegacyItem({ category: "task_memory" })).toBe("session");
  });

  it("infers profile memory", () => {
    expect(inferMemoryTierFromLegacyItem({ category: "user_profile" })).toBe("profile");
  });

  it("infers operational or skill memory", () => {
    expect(inferMemoryTierFromLegacyItem({ type: "workflow_execution" })).toBe("operational");
    expect(inferMemoryTierFromLegacyItem({ source: "skill_runner" })).toBe("skill");
  });

  it("infers trace memory", () => {
    expect(inferMemoryTierFromLegacyItem({ category: "mission_tape" })).toBe("trace");
  });

  it("preserves unknown metadata on legacy to luca mapping", () => {
    const mapped = mapLegacyMemoryToLucaMemoryItem({
      id: "1",
      key: "k",
      value: "v",
      metadata: { strangeKey: "keep_me" },
    });
    expect(mapped.metadata?.strangeKey).toBe("keep_me");
  });

  it("maps luca memory to legacy shape", () => {
    const legacy = mapLucaMemoryItemToLegacyMemory({
      id: "m1",
      tier: "profile",
      scope: { userId: "u1" },
      content: "knows typescript",
      source: "agent",
      createdAt: 1,
      metadata: { foo: "bar" },
    });

    expect(legacy.category).toBe("FACT");
    expect((legacy.metadata as Record<string, unknown>).foo).toBe("bar");
  });

  it("builds canonical snapshots with non-invasive metadata", () => {
    const snapshot = getMemoryContractSnapshot({ adapter: "test" });
    expect(snapshot.adapterOnly).toBe(true);
    expect(snapshot.runtimeBehaviorChanged).toBe(false);
  });
});

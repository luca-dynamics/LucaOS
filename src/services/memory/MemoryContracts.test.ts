import { describe, expect, it } from "vitest";
import {
  LUCA_MEMORY_CONTRACT_METADATA,
  type LucaMemoryItem,
  type LucaMemoryStoreAdapter,
} from "./MemoryContracts";
import {
  AgentMemoryServiceAdapter,
  FrontendMemoryServiceAdapter,
  WorkflowMemoryAdapter,
} from "./MemoryAdapters";

describe("Memory contracts", () => {
  it("includes canonical metadata defaults", () => {
    expect(LUCA_MEMORY_CONTRACT_METADATA.contractKind).toBe("luca_memory_contract");
    expect(LUCA_MEMORY_CONTRACT_METADATA.migrationRequired).toBe(false);
    expect(LUCA_MEMORY_CONTRACT_METADATA.adapterOnly).toBe(true);
    expect(LUCA_MEMORY_CONTRACT_METADATA.runtimeBehaviorChanged).toBe(false);
  });

  it("supports canonical memory item shape", () => {
    const item: LucaMemoryItem = {
      id: "m1",
      tier: "session",
      scope: { userId: "u1", sessionId: "s1" },
      content: "hello",
      source: "test",
      createdAt: Date.now(),
    };
    expect(item.scope.userId).toBe("u1");
  });

  it("adapter snapshots remain adapter-only and non-invasive", () => {
    const adapters: LucaMemoryStoreAdapter[] = [
      FrontendMemoryServiceAdapter,
      AgentMemoryServiceAdapter,
      WorkflowMemoryAdapter,
    ];
    for (const adapter of adapters) {
      const snapshot = adapter.getSnapshot?.() || {};
      expect(snapshot.adapterOnly).toBe(true);
      expect(snapshot.runtimeBehaviorChanged).toBe(false);
    }
  });
});

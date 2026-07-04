import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MemoryNode } from "../../types";

// The real memoryService singleton reads localStorage / boots a DB at module
// load, so it can't be constructed in the node test env. This unit only cares
// that the factory delegates to memoryService.saveMemory with the adapter's
// exact arguments — mock the module so the delegation is observable without
// booting the browser-coupled singleton.
vi.mock("../memoryService", () => ({
  memoryService: { saveMemory: vi.fn() },
}));

import { memoryService } from "../memoryService";
import { createLiveMemoryServiceDependency } from "./liveMemoryAdapterDependency";

const saveMemory = vi.mocked(memoryService.saveMemory);

const node: MemoryNode = {
  id: "memory:test",
  key: "Project update preference",
  value: "Prefers concise project updates with explicit decisions and next steps.",
  category: "SEMANTIC",
  timestamp: 1_700_000_000_000,
  confidence: 0.98,
};

describe("createLiveMemoryServiceDependency", () => {
  beforeEach(() => {
    saveMemory.mockReset();
  });

  it("delegates to the real memoryService.saveMemory with the adapter arguments", async () => {
    saveMemory.mockResolvedValue(node);

    const dependency = createLiveMemoryServiceDependency();
    const result = await dependency.saveMemory(
      node.key,
      node.value,
      "SEMANTIC",
      false,
      7,
    );

    expect(saveMemory).toHaveBeenCalledTimes(1);
    expect(saveMemory).toHaveBeenCalledWith(
      node.key,
      node.value,
      "SEMANTIC",
      false,
      7,
    );
    expect(result).toBe(node);
  });

  it("propagates a null result when the service declines to persist", async () => {
    saveMemory.mockResolvedValue(null);

    const dependency = createLiveMemoryServiceDependency();
    const result = await dependency.saveMemory("k", "v", "SEMANTIC", false, 1);

    expect(result).toBeNull();
  });

  it("does not call the service merely by being constructed", () => {
    createLiveMemoryServiceDependency();
    expect(saveMemory).not.toHaveBeenCalled();
  });
});

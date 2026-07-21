import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearOllamaRuntimeProbeCache,
  probeOllamaViaRuntimeFacade,
} from "../ollamaRuntimeProbe";
import { localRuntimeRegistry } from "../RuntimeRegistry";
import type { LocalRuntimeAdapter } from "../LocalRuntimeAdapter";

describe("ollamaRuntimeProbe", () => {
  beforeEach(() => {
    clearOllamaRuntimeProbeCache();
  });

  it("returns unavailable when ollama adapter is missing", async () => {
    const getSpy = vi
      .spyOn(localRuntimeRegistry, "get")
      .mockReturnValue(undefined);

    const result = await probeOllamaViaRuntimeFacade({ force: true, now: () => 1000 });
    expect(result.available).toBe(false);
    expect(result.models).toEqual([]);
    expect(result.message).toMatch(/not registered/i);
    expect(result.checkedAt).toBe(1000);
    getSpy.mockRestore();
  });

  it("maps adapter health into probe result and caches", async () => {
    const health = vi.fn(async () => ({
      runtime: "ollama" as const,
      status: "online" as const,
      reachable: true,
      modelIds: ["llama3.2:1b", "phi3:mini"],
      message: "2 local models available.",
      checkedAt: 42,
    }));
    const adapter = { kind: "ollama", health } as unknown as LocalRuntimeAdapter;
    const getSpy = vi
      .spyOn(localRuntimeRegistry, "get")
      .mockReturnValue(adapter);

    let now = 1000;
    const first = await probeOllamaViaRuntimeFacade({
      force: true,
      ttlMs: 60_000,
      now: () => now,
    });
    expect(first.available).toBe(true);
    expect(first.models).toEqual(["llama3.2:1b", "phi3:mini"]);
    expect(health).toHaveBeenCalledTimes(1);

    now = 2000;
    const cached = await probeOllamaViaRuntimeFacade({
      ttlMs: 60_000,
      now: () => now,
    });
    expect(cached.models).toEqual(first.models);
    expect(health).toHaveBeenCalledTimes(1);

    now = 2000;
    await probeOllamaViaRuntimeFacade({
      force: true,
      ttlMs: 60_000,
      now: () => now,
    });
    expect(health).toHaveBeenCalledTimes(2);

    getSpy.mockRestore();
  });

  it("surfaces adapter health failures as unavailable", async () => {
    const adapter = {
      kind: "ollama",
      health: vi.fn(async () => {
        throw new Error("connection refused");
      }),
    } as unknown as LocalRuntimeAdapter;
    const getSpy = vi
      .spyOn(localRuntimeRegistry, "get")
      .mockReturnValue(adapter);

    const result = await probeOllamaViaRuntimeFacade({ force: true });
    expect(result.available).toBe(false);
    expect(result.models).toEqual([]);
    expect(result.message).toMatch(/connection refused/i);
    getSpy.mockRestore();
  });
});

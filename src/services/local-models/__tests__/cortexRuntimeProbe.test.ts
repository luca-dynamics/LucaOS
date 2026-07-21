import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearCortexRuntimeProbeCache,
  probeCortexViaRuntimeFacade,
} from "../cortexRuntimeProbe";
import { localRuntimeRegistry } from "../RuntimeRegistry";
import { CortexRuntime } from "../runtimes/CortexRuntime";

const jsonResponse = (status: number, body: unknown): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  }) as unknown as Response;

describe("cortexRuntimeProbe", () => {
  beforeEach(() => {
    clearCortexRuntimeProbeCache();
  });

  afterEach(() => {
    localRuntimeRegistry.replace(new CortexRuntime());
    clearCortexRuntimeProbeCache();
  });

  it("returns unavailable when cortex adapter is missing", async () => {
    const getSpy = vi
      .spyOn(localRuntimeRegistry, "get")
      .mockReturnValue(undefined);

    const result = await probeCortexViaRuntimeFacade({
      force: true,
      now: () => 1000,
    });
    expect(result.available).toBe(false);
    expect(result.message).toMatch(/not registered/i);
    getSpy.mockRestore();
  });

  it("maps adapter health and caches briefly", async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (String(url).endsWith("/health")) {
        return jsonResponse(200, { ok: true });
      }
      return jsonResponse(200, { data: [{ id: "gemma-2b" }] });
    });
    localRuntimeRegistry.replace(
      new CortexRuntime({
        baseUrl: "http://127.0.0.1:8000",
        fetchImpl: fetchImpl as unknown as typeof fetch,
        now: () => 42,
      }),
    );

    let now = 1000;
    const first = await probeCortexViaRuntimeFacade({
      force: true,
      ttlMs: 60_000,
      now: () => now,
    });
    expect(first.available).toBe(true);
    expect(first.models.length).toBeGreaterThan(0);
    expect(first.activeGenerations).toBe(0);

    now = 2000;
    const cached = await probeCortexViaRuntimeFacade({
      ttlMs: 60_000,
      now: () => now,
    });
    expect(cached.models).toEqual(first.models);
    // health called once while cache warm
    expect(
      fetchImpl.mock.calls.filter((c) => String(c[0]).endsWith("/health"))
        .length,
    ).toBe(1);
  });

  it("surfaces unreachable health", async () => {
    localRuntimeRegistry.replace(
      new CortexRuntime({
        baseUrl: "http://127.0.0.1:8000",
        fetchImpl: vi.fn(async () =>
          jsonResponse(503, { error: "down" }),
        ) as unknown as typeof fetch,
      }),
    );

    const result = await probeCortexViaRuntimeFacade({ force: true });
    expect(result.available).toBe(false);
    expect(result.message).toMatch(/unreachable|failed/i);
  });
});

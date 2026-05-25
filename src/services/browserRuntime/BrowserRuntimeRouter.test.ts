import { describe, expect, it, vi } from "vitest";
import { BrowserRuntimeRouter } from "./BrowserRuntimeRouter";
import { BrowserRuntimeAdapter, BrowserRuntimeRequest } from "./types";

const request: BrowserRuntimeRequest = {
  requestId: "req-001",
  missionId: "mission-001",
  action: "navigate",
  target: "https://example.com",
  issuedAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
};

describe("BrowserRuntimeRouter scaffold", () => {
  it("routes request to first matching adapter", async () => {
    const execute = vi.fn(async () => ({ accepted: true, runtime: "playwright" as const }));

    const adapter: BrowserRuntimeAdapter = {
      canHandle: () => true,
      execute,
    };

    const router = new BrowserRuntimeRouter([adapter]);
    const result = await router.route(request);

    expect(result.accepted).toBe(true);
    expect(result.runtime).toBe("playwright");
    expect(execute).toHaveBeenCalledWith(request);
  });

  it("returns unknown runtime result when no adapter matches", async () => {
    const router = new BrowserRuntimeRouter([
      {
        canHandle: () => false,
        execute: async () => ({ accepted: true, runtime: "bidi" as const }),
      },
    ]);

    const result = await router.route(request);
    expect(result.accepted).toBe(false);
    expect(result.runtime).toBe("unknown");
  });
});

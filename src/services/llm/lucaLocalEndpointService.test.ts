import { describe, expect, it, vi } from "vitest";
import {
  checkLocalEndpoint,
  recommendServedModelsForRam,
  resolveLocalEndpointConfig,
  selectServedCuratedModels,
} from "./lucaLocalEndpointService";

const jsonResponse = (status: number, body: unknown): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }) as unknown as Response;

const deps = { now: () => 0, sleep: async () => {} };

describe("lucaLocalEndpointService", () => {
  it("treats a blank/whitespace base URL as not configured", () => {
    expect(resolveLocalEndpointConfig({}).configured).toBe(false);
    expect(resolveLocalEndpointConfig({ customOpenAiCompatibleBaseUrl: "   " }).configured).toBe(false);
  });

  it("derives a trimmed config (apiKey optional)", () => {
    const config = resolveLocalEndpointConfig({
      customOpenAiCompatibleBaseUrl: " http://localhost:8080/v1 ",
      customOpenAiCompatibleApiKey: " key ",
    });
    expect(config).toEqual({ configured: true, baseUrl: "http://localhost:8080/v1", apiKey: "key" });

    expect(
      resolveLocalEndpointConfig({ customOpenAiCompatibleBaseUrl: "http://x/v1" }).apiKey,
    ).toBeUndefined();
  });

  it("selects only curated models the endpoint actually serves", () => {
    const served = selectServedCuratedModels(["qwen2.5-7b-instruct", "phi-3-mini-4k-instruct", "not-curated"]);
    expect(served.map((m) => m.id).sort()).toEqual([
      "phi-3-mini-4k-instruct",
      "qwen2.5-7b-instruct",
    ]);
  });

  it("recommends served models that fit system RAM", () => {
    const served = selectServedCuratedModels(["qwen2.5-7b-instruct", "llama-3.2-1b-instruct"]);
    const lowEnd = recommendServedModelsForRam(served, 4_000_000_000).map((m) => m.id);
    expect(lowEnd).toContain("llama-3.2-1b-instruct");
    expect(lowEnd).not.toContain("qwen2.5-7b-instruct");
  });

  it("returns not-configured without probing when no endpoint is set", async () => {
    const fetchImpl = vi.fn();
    const status = await checkLocalEndpoint({}, { ...deps, fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(status.configured).toBe(false);
    expect(status.servedCuratedModels).toEqual([]);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("probes a configured endpoint and surfaces served curated models", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(200, { data: [{ id: "qwen2.5-7b-instruct" }, { id: "some-other-model" }] }),
    );
    const status = await checkLocalEndpoint(
      { customOpenAiCompatibleBaseUrl: "http://localhost:8080/v1" },
      { ...deps, fetchImpl: fetchImpl as unknown as typeof fetch },
    );
    expect(status.configured).toBe(true);
    expect(status.health?.status).toBe("online");
    expect(status.servedCuratedModels.map((m) => m.id)).toEqual(["qwen2.5-7b-instruct"]);
  });
});

import { describe, expect, it, vi } from "vitest";
import {
  interpretEndpointProbe,
  probeOpenAiCompatibleEndpoint,
} from "./lucaEndpointHealth";

const jsonResponse = (status: number, body: unknown): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }) as unknown as Response;

describe("interpretEndpointProbe (pure)", () => {
  it("reports online with a model count when models are served", () => {
    const h = interpretEndpointProbe({ ok: true, httpStatus: 200, modelIds: ["a", "b"] });
    expect(h.status).toBe("online");
    expect(h.reachable).toBe(true);
    expect(h.modelIds).toEqual(["a", "b"]);
    expect(h.message).toContain("2 models");
  });

  it("distinguishes connected-but-empty from online", () => {
    expect(interpretEndpointProbe({ ok: true, httpStatus: 200, modelIds: [] }).status).toBe("no-models");
  });

  it("maps auth, server, and transport failures to honest states", () => {
    expect(interpretEndpointProbe({ ok: false, httpStatus: 401 }).status).toBe("unauthorized");
    expect(interpretEndpointProbe({ ok: false, httpStatus: 503 }).status).toBe("degraded");
    expect(interpretEndpointProbe({ ok: false, httpStatus: 404 }).status).toBe("degraded");
    expect(interpretEndpointProbe({ ok: false, errorKind: "timeout" }).status).toBe("unreachable");
    expect(interpretEndpointProbe({ ok: false, errorKind: "network" }).status).toBe("unreachable");
    expect(interpretEndpointProbe({ ok: false, errorKind: "parse", httpStatus: 200 }).status).toBe("degraded");
  });
});

describe("probeOpenAiCompatibleEndpoint", () => {
  const deps = { now: () => 0, sleep: async () => {} };

  it("hits {baseUrl}/models and returns online with parsed ids", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(200, { data: [{ id: "qwen2.5-7b-instruct" }, { id: "phi-3" }] }));
    const health = await probeOpenAiCompatibleEndpoint(
      { baseUrl: "http://localhost:8080/v1/" },
      { ...deps, fetchImpl: fetchImpl as unknown as typeof fetch },
    );
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://localhost:8080/v1/models",
      expect.objectContaining({ method: "GET" }),
    );
    expect(health.status).toBe("online");
    expect(health.modelIds).toEqual(["qwen2.5-7b-instruct", "phi-3"]);
  });

  it("sends the bearer token when an apiKey is given", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(200, { data: [] }));
    await probeOpenAiCompatibleEndpoint(
      { baseUrl: "http://remote.example/v1", apiKey: "secret" },
      { ...deps, fetchImpl: fetchImpl as unknown as typeof fetch },
    );
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://remote.example/v1/models",
      expect.objectContaining({ headers: { Authorization: "Bearer secret" } }),
    );
  });

  it("maps a 401 response to unauthorized without retrying", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(401, {}));
    const health = await probeOpenAiCompatibleEndpoint(
      { baseUrl: "http://localhost:8080/v1", retries: 2 },
      { ...deps, fetchImpl: fetchImpl as unknown as typeof fetch },
    );
    expect(health.status).toBe("unauthorized");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("retries transient network failures then succeeds", async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new Error("ECONNREFUSED"))
      .mockResolvedValueOnce(jsonResponse(200, { data: [{ id: "m" }] }));
    const health = await probeOpenAiCompatibleEndpoint(
      { baseUrl: "http://localhost:8080/v1", retries: 1 },
      { ...deps, fetchImpl: fetchImpl as unknown as typeof fetch },
    );
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(health.status).toBe("online");
  });

  it("reports unreachable after exhausting retries", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("network down"));
    const health = await probeOpenAiCompatibleEndpoint(
      { baseUrl: "http://localhost:8080/v1", retries: 1 },
      { ...deps, fetchImpl: fetchImpl as unknown as typeof fetch },
    );
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(health.status).toBe("unreachable");
    expect(health.reachable).toBe(false);
  });

  it("classifies an aborted request as a timeout (unreachable)", async () => {
    const fetchImpl = vi.fn(async () => {
      const err = new Error("aborted");
      err.name = "AbortError";
      throw err;
    });
    const health = await probeOpenAiCompatibleEndpoint(
      { baseUrl: "http://localhost:8080/v1", retries: 0 },
      { ...deps, fetchImpl: fetchImpl as unknown as typeof fetch },
    );
    expect(health.status).toBe("unreachable");
  });
});

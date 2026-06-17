import { describe, expect, it, vi } from "vitest";
import source from "./providerHubConnectionTest.ts?raw";
import { canTestProviderHubConnection, createProviderHubModelsEndpoint, normalizeProviderHubTestBaseUrl, testProviderHubConnection } from "./providerHubConnectionTest";

const secret = "sk-test-secret-value-123456";

describe("providerHubConnectionTest", () => {

  it("creates correct default models endpoints for supported OpenAI-compatible providers", () => {
    expect(createProviderHubModelsEndpoint("openai")).toBe("https://api.openai.com/v1/models");
    expect(createProviderHubModelsEndpoint("xai_grok")).toBe("https://api.x.ai/v1/models");
    expect(createProviderHubModelsEndpoint("openrouter")).toBe("https://openrouter.ai/api/v1/models");
    expect(createProviderHubModelsEndpoint("groq")).toBe("https://api.groq.com/openai/v1/models");
    expect(createProviderHubModelsEndpoint("deepseek")).toBe("https://api.deepseek.com/v1/models");
  });

  it("normalizes custom OpenAI-compatible base URLs without duplicating v1 or models", () => {
    expect(createProviderHubModelsEndpoint("custom_openai_compatible", "https://example.com")).toBe("https://example.com/v1/models");
    expect(createProviderHubModelsEndpoint("custom_openai_compatible", "https://example.com/v1")).toBe("https://example.com/v1/models");
    expect(createProviderHubModelsEndpoint("custom_openai_compatible", "https://example.com/v1/")).toBe("https://example.com/v1/models");
    expect(createProviderHubModelsEndpoint("custom_openai_compatible", "https://example.com/api/v1")).toBe("https://example.com/api/v1/models");
    expect(createProviderHubModelsEndpoint("custom_openai_compatible", "https://example.com/api/v1/models")).toBe("https://example.com/api/v1/models");
    expect(createProviderHubModelsEndpoint("custom_openai_compatible", "https://example.com/openai/v1/models?api_key=sk-hidden-secret-123456#frag")).toBe("https://example.com/openai/v1/models");
    expect(normalizeProviderHubTestBaseUrl("https://example.com/api/v1/models")?.toString()).toBe("https://example.com/api/v1");
  });

  it("returns a safe failed result for invalid URLs without network calls", async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    const result = await testProviderHubConnection({ providerId: "custom_openai_compatible", apiKey: secret, baseUrl: "not a url", fetchImpl });
    expect(result.status).toBe("failed");
    expect(result.providerApiCalled).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("does not include secret-like URL values in diagnostics", async () => {
    const secretLikeQuery = "sk-hidden-secret-123456";
    const fetchImpl = vi.fn(async (url: string) => {
      expect(url).toBe("https://example.com/v1/models");
      expect(url).not.toContain(secretLikeQuery);
      return new Response(JSON.stringify({ data: [] }), { status: 200 });
    }) as unknown as typeof fetch;

    const result = await testProviderHubConnection({ providerId: "custom_openai_compatible", apiKey: secret, baseUrl: `https://example.com?api_key=${secretLikeQuery}`, fetchImpl });
    expect(result.status).toBe("success");
    expect(result.safeDiagnosticsText).toContain('"endpointPath":"/v1/models"');
    expect(JSON.stringify(result)).not.toContain(secret);
    expect(JSON.stringify(result)).not.toContain(secretLikeQuery);
  });
  it("returns a successful sanitized result from a mocked supported provider test", async () => {
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(String(_url)).toBe("https://api.openai.com/v1/models");
      expect(JSON.stringify(init?.headers)).toContain("Bearer");
      return new Response(JSON.stringify({ data: [] }), { status: 200 });
    }) as unknown as typeof fetch;

    const result = await testProviderHubConnection({ providerId: "openai", apiKey: secret, fetchImpl });

    expect(result.status).toBe("success");
    expect(result.providerApiCalled).toBe(true);
    expect(result.sideEffectsPerformed).toBe(false);
    expect(result.runtimeRoutingChanged).toBe(false);
    expect(result.secretExposed).toBe(false);
    expect(JSON.stringify(result)).not.toContain(secret);
  });

  it("returns a failed sanitized result from mocked provider failure", async () => {
    const fetchImpl = vi.fn(async () => new Response("nope", { status: 401 })) as unknown as typeof fetch;
    const result = await testProviderHubConnection({ providerId: "groq", apiKey: secret, fetchImpl });
    expect(result.status).toBe("failed");
    expect(result.message).toContain("HTTP 401");
    expect(JSON.stringify(result)).not.toContain(secret);
  });

  it("returns safe failed result on timeout and aborts the request", async () => {
    let aborted = false;
    const fetchImpl = vi.fn((_url: string, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => {
        aborted = true;
        reject(new DOMException("Aborted", "AbortError"));
      });
    })) as unknown as typeof fetch;

    const result = await testProviderHubConnection({ providerId: "openrouter", apiKey: secret, timeoutMs: 10, fetchImpl });
    expect(aborted).toBe(true);
    expect(result.status).toBe("failed");
    expect(result.message).toContain("timed out");
    expect(JSON.stringify(result)).not.toContain(secret);
  });

  it("returns unsupported without network call for providers without a safe endpoint", async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    const result = await testProviderHubConnection({ providerId: "anthropic", apiKey: secret, fetchImpl });
    expect(result.status).toBe("unsupported");
    expect(result.providerApiCalled).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("blocks missing API key before network calls", async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    expect(canTestProviderHubConnection({ providerId: "openai", apiKey: "" }).canTest).toBe(false);
    const result = await testProviderHubConnection({ providerId: "openai", apiKey: "", fetchImpl });
    expect(result.status).toBe("skipped");
    expect(result.providerApiCalled).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("blocks custom OpenAI-compatible tests when base URL is missing", async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    const result = await testProviderHubConnection({ providerId: "custom_openai_compatible", apiKey: secret, fetchImpl });
    expect(result.status).toBe("skipped");
    expect(result.providerApiCalled).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("never imports ProviderFactory or changes runtime routing", () => {
    expect(source).not.toMatch(/ProviderFactory/);
    expect(source).not.toMatch(/createProvider(?!Hub)|route\(/);
  });

  it("local runtime test does not start a process", async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    const result = await testProviderHubConnection({ providerId: "ollama", baseUrl: "http://localhost:11434", fetchImpl });
    expect(result.status).toBe("unsupported");
    expect(result.providerApiCalled).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

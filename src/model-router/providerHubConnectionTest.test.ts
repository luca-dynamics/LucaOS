import { describe, expect, it, vi } from "vitest";
import source from "./providerHubConnectionTest.ts?raw";
import { canTestProviderHubConnection, testProviderHubConnection } from "./providerHubConnectionTest";

const secret = "sk-test-secret-value-123456";

describe("providerHubConnectionTest", () => {
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
    expect(source).not.toMatch(/createProvider|route\(/);
  });

  it("local runtime test does not start a process", async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    const result = await testProviderHubConnection({ providerId: "ollama", baseUrl: "http://localhost:11434", fetchImpl });
    expect(result.status).toBe("unsupported");
    expect(result.providerApiCalled).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  canaryChatViaRuntimeFacade,
  deleteOllamaModelViaRuntimeFacade,
} from "../ollamaRuntimeOps";
import { clearOllamaRuntimeProbeCache } from "../ollamaRuntimeProbe";
import { localRuntimeRegistry } from "../RuntimeRegistry";
import { OllamaRuntime } from "../runtimes/OllamaRuntime";

const jsonResponse = (status: number, body: unknown): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  }) as unknown as Response;

describe("ollamaRuntimeOps", () => {
  beforeEach(() => {
    clearOllamaRuntimeProbeCache();
  });

  afterEach(() => {
    // Restore default adapter so other suites share a clean registry.
    localRuntimeRegistry.replace(new OllamaRuntime());
    clearOllamaRuntimeProbeCache();
  });

  it("deletes model via OllamaRuntime and clears probe cache", async () => {
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).endsWith("/api/delete")) {
        expect(init?.method).toBe("DELETE");
        return jsonResponse(200, {});
      }
      return jsonResponse(200, { models: [] });
    });
    const runtime = new OllamaRuntime({
      baseUrl: "http://127.0.0.1:11434",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    localRuntimeRegistry.replace(runtime);

    const result = await deleteOllamaModelViaRuntimeFacade("phi3:mini");
    expect(result.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://127.0.0.1:11434/api/delete",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("returns failure when delete fails", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(404, { error: "missing" }));
    localRuntimeRegistry.replace(
      new OllamaRuntime({
        baseUrl: "http://127.0.0.1:11434",
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    );

    const result = await deleteOllamaModelViaRuntimeFacade("nope");
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/delete failed|404/i);
  });

  it("canary chat uses OpenAI-compatible chat path", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(200, {
        choices: [{ message: { content: "Luca Test Passed" } }],
      }),
    );
    localRuntimeRegistry.replace(
      new OllamaRuntime({
        baseUrl: "http://127.0.0.1:11434",
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    );

    const result = await canaryChatViaRuntimeFacade({ model: "llama3.2:1b" });
    expect(result.ok).toBe(true);
    expect(result.text).toContain("Luca Test Passed");
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://127.0.0.1:11434/v1/chat/completions",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("canary maps missing model errors", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(404, { error: "model not found" }),
    );
    localRuntimeRegistry.replace(
      new OllamaRuntime({
        baseUrl: "http://127.0.0.1:11434",
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    );

    const result = await canaryChatViaRuntimeFacade({ model: "ghost:0b" });
    expect(result.ok).toBe(false);
    expect(result.text).toMatch(/not found|404/i);
  });
});

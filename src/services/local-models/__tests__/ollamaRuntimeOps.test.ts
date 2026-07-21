import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  canaryChatViaRuntimeFacade,
  chatViaRuntimeFacade,
  deleteOllamaModelViaRuntimeFacade,
  generateViaRuntimeFacade,
  streamGenerateViaRuntimeFacade,
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

const streamResponse = (status: number, chunks: string[]): Response => {
  const encoder = new TextEncoder();
  return {
    ok: status >= 200 && status < 300,
    status,
    body: new ReadableStream({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
        controller.close();
      },
    }),
    text: async () => chunks.join(""),
  } as unknown as Response;
};

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

  it("generateViaRuntimeFacade forwards multimodal generate", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(200, { response: '{"ok":true}', done: true }),
    );
    localRuntimeRegistry.replace(
      new OllamaRuntime({
        baseUrl: "http://127.0.0.1:11434",
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    );

    const result = await generateViaRuntimeFacade({
      model: "moondream",
      prompt: "what is on screen?",
      images: ["base64img"],
      format: "json",
    });
    expect(result.text).toBe('{"ok":true}');
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://127.0.0.1:11434/api/generate",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("chatViaRuntimeFacade uses OpenAI-compatible chat path", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(200, {
        choices: [{ message: { content: "facade chat ok" } }],
      }),
    );
    localRuntimeRegistry.replace(
      new OllamaRuntime({
        baseUrl: "http://127.0.0.1:11434",
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    );

    const result = await chatViaRuntimeFacade({
      model: "llama3.2:1b",
      messages: [{ role: "user", content: "hi" }],
    });
    expect(result.text).toBe("facade chat ok");
  });

  it("streamGenerateViaRuntimeFacade yields tokens", async () => {
    const fetchImpl = vi.fn(async () =>
      streamResponse(200, ['{"response":"a"}\n', '{"response":"b"}\n']),
    );
    localRuntimeRegistry.replace(
      new OllamaRuntime({
        baseUrl: "http://127.0.0.1:11434",
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    );

    const tokens: string[] = [];
    for await (const t of streamGenerateViaRuntimeFacade({
      model: "llama3.2:1b",
      prompt: "x",
    })) {
      tokens.push(t);
    }
    expect(tokens).toEqual(["a", "b"]);
  });
});

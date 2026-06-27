import { describe, expect, it, vi } from "vitest";
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

describe("OllamaRuntime", () => {
  it("lists models from Ollama tags", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(200, { models: [{ name: "llama3.2:3b" }] }),
    );
    const runtime = new OllamaRuntime({
      baseUrl: "http://127.0.0.1:11434/",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await expect(runtime.listModels()).resolves.toEqual(["llama3.2:3b"]);
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://127.0.0.1:11434/api/tags",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("reports no-models health when Ollama is reachable but empty", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(200, { models: [] }));
    const runtime = new OllamaRuntime({
      baseUrl: "http://127.0.0.1:11434",
      fetchImpl: fetchImpl as unknown as typeof fetch,
      now: () => 123,
    });

    const health = await runtime.health();

    expect(health.status).toBe("no-models");
    expect(health.reachable).toBe(true);
    expect(health.checkedAt).toBe(123);
  });

  it("reports unreachable health when tags fail", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(500, { error: "down" }));
    const runtime = new OllamaRuntime({
      baseUrl: "http://127.0.0.1:11434",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const health = await runtime.health();

    expect(health.status).toBe("unreachable");
    expect(health.reachable).toBe(false);
    expect(health.message).toContain("Ollama is unreachable");
  });

  it("normalizes chat responses and tool calls", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(200, {
        choices: [
          {
            message: {
              content: "done",
              tool_calls: [
                {
                  id: "call_1",
                  function: {
                    name: "open_app",
                    arguments: '{"name":"Calendar"}',
                  },
                },
              ],
            },
          },
        ],
        usage: { prompt_tokens: 7, completion_tokens: 3 },
      }),
    );
    const runtime = new OllamaRuntime({
      baseUrl: "http://127.0.0.1:11434",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const response = await runtime.chat({
      model: "llama3.2:3b",
      messages: [{ role: "user", content: "open calendar" }],
      tools: [
        {
          type: "function",
          function: { name: "open_app", parameters: { type: "object" } },
        },
      ],
      maxTokens: 64,
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://127.0.0.1:11434/v1/chat/completions",
      expect.objectContaining({ method: "POST" }),
    );
    const body = JSON.parse(String(fetchImpl.mock.calls[0][1]?.body));
    expect(body).toMatchObject({
      model: "llama3.2:3b",
      messages: [{ role: "user", content: "open calendar" }],
      max_tokens: 64,
      stream: false,
    });
    expect(response).toEqual({
      text: "done",
      toolCalls: [{ id: "call_1", name: "open_app", args: { name: "Calendar" } }],
      usage: { inputTokens: 7, outputTokens: 3 },
      runtime: "ollama",
      model: "llama3.2:3b",
    });
  });

  it("includes response detail when chat fails", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(400, { error: "bad model" }));
    const runtime = new OllamaRuntime({
      baseUrl: "http://127.0.0.1:11434",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await expect(
      runtime.chat({ model: "missing", messages: [{ role: "user", content: "hi" }] }),
    ).rejects.toThrow("Ollama chat failed with HTTP 400");
  });

  it("streams OpenAI-compatible chat chunks", async () => {
    const fetchImpl = vi.fn(async () =>
      streamResponse(200, [
        'data: {"choices":[{"delta":{"content":"hel"}}]}\n',
        'data: {"choices":[{"delta":{"content":"lo"}}]}\n',
        "data: [DONE]\n",
      ]),
    );
    const runtime = new OllamaRuntime({
      baseUrl: "http://127.0.0.1:11434",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const events = [];
    for await (const event of runtime.stream({
      model: "llama3.2:3b",
      messages: [{ role: "user", content: "hi" }],
    })) {
      events.push(event);
    }

    const body = JSON.parse(String(fetchImpl.mock.calls[0][1]?.body));
    expect(body).toMatchObject({ model: "llama3.2:3b", stream: true });
    expect(events).toEqual([
      { type: "token", text: "hel" },
      { type: "token", text: "lo" },
      { type: "done" },
    ]);
  });
});

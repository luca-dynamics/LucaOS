import { describe, expect, it, vi } from "vitest";
import { CortexRuntime } from "../runtimes/CortexRuntime";

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

describe("CortexRuntime", () => {
  it("lists catalog-backed Cortex models without probing inference", async () => {
    const runtime = new CortexRuntime({ baseUrl: "http://127.0.0.1:8000" });

    await expect(runtime.listModels()).resolves.toEqual([
      "gemma-2b",
      "llama-3.2-1b",
      "lfm2.5-230m",
      "phi-3-mini",
      "smollm2-1.7b",
    ]);
  });

  it("reports online health when Cortex /health is reachable", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(200, { ok: true }));
    const runtime = new CortexRuntime({
      baseUrl: "http://127.0.0.1:8000/",
      fetchImpl: fetchImpl as unknown as typeof fetch,
      now: () => 456,
    });

    const health = await runtime.health();

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/health",
      expect.objectContaining({ method: "GET" }),
    );
    expect(health.status).toBe("online");
    expect(health.reachable).toBe(true);
    expect(health.checkedAt).toBe(456);
    expect(health.modelIds).toContain("gemma-2b");
  });

  it("reports unreachable health when Cortex /health fails", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(503, { error: "booting" }));
    const runtime = new CortexRuntime({
      baseUrl: "http://127.0.0.1:8000",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const health = await runtime.health();

    expect(health.status).toBe("unreachable");
    expect(health.reachable).toBe(false);
    expect(health.message).toContain("Cortex is unreachable");
  });

  it("normalizes Cortex chat/completions responses", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(200, {
        choices: [
          {
            message: {
              content: "local answer",
              tool_calls: [
                {
                  id: "call_cortex",
                  function: {
                    name: "remember_fact",
                    arguments: { fact: "Luca owns the runtime facade" },
                  },
                },
              ],
            },
          },
        ],
        usage: { prompt_tokens: 4, completion_tokens: 6 },
      }),
    );
    const runtime = new CortexRuntime({
      baseUrl: "http://127.0.0.1:8000",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const response = await runtime.chat({
      model: "gemma-2b",
      messages: [{ role: "user", content: "remember this" }],
      maxTokens: 128,
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/chat/completions",
      expect.objectContaining({ method: "POST" }),
    );
    const body = JSON.parse(String(fetchImpl.mock.calls[0][1]?.body));
    expect(body).toMatchObject({
      model: "gemma-2b",
      messages: [{ role: "user", content: "remember this" }],
      max_tokens: 128,
      stream: false,
    });
    expect(response).toEqual({
      text: "local answer",
      toolCalls: [
        {
          id: "call_cortex",
          name: "remember_fact",
          args: { fact: "Luca owns the runtime facade" },
        },
      ],
      usage: { inputTokens: 4, outputTokens: 6 },
      runtime: "cortex",
      model: "gemma-2b",
    });
  });

  it("includes response detail when Cortex chat fails", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(500, { detail: "missing deps" }));
    const runtime = new CortexRuntime({
      baseUrl: "http://127.0.0.1:8000",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await expect(
      runtime.chat({ model: "gemma-2b", messages: [{ role: "user", content: "hi" }] }),
    ).rejects.toThrow("Cortex chat failed with HTTP 500");
  });

  it("rejects a second concurrent chat when maxConcurrentGenerations is 1", async () => {
    let releaseFirst!: () => void;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    let call = 0;
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).endsWith("/chat/completions")) {
        call += 1;
        if (call === 1) {
          await firstGate;
          return jsonResponse(200, {
            choices: [{ message: { content: "first" } }],
          });
        }
        return jsonResponse(200, {
          choices: [{ message: { content: "second" } }],
        });
      }
      return jsonResponse(200, { ok: true });
    });
    const runtime = new CortexRuntime({
      baseUrl: "http://127.0.0.1:8000",
      fetchImpl: fetchImpl as unknown as typeof fetch,
      maxConcurrentGenerations: 1,
    });

    const first = runtime.chat({
      model: "gemma-2b",
      messages: [{ role: "user", content: "a" }],
    });
    // Let first acquire generation slot
    await Promise.resolve();
    await expect(
      runtime.chat({
        model: "gemma-2b",
        messages: [{ role: "user", content: "b" }],
      }),
    ).rejects.toThrow(/busy/i);
    expect(runtime.getActiveGenerationCount()).toBe(1);

    releaseFirst();
    await expect(first).resolves.toMatchObject({ text: "first" });
    expect(runtime.getActiveGenerationCount()).toBe(0);
  });

  it("streams Cortex chat/completions chunks", async () => {
    const fetchImpl = vi.fn(async () =>
      streamResponse(200, [
        '{"choices":[{"delta":{"content":"loc"}}]}\n',
        'data: {"choices":[{"delta":{"content":"al"}}]}\n',
        "data: [DONE]\n",
      ]),
    );
    const runtime = new CortexRuntime({
      baseUrl: "http://127.0.0.1:8000",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const events = [];
    for await (const event of runtime.stream({
      model: "gemma-2b",
      messages: [{ role: "user", content: "hi" }],
    })) {
      events.push(event);
    }

    const body = JSON.parse(String(fetchImpl.mock.calls[0][1]?.body));
    expect(body).toMatchObject({ model: "gemma-2b", stream: true });
    expect(events).toEqual([
      { type: "token", text: "loc" },
      { type: "token", text: "al" },
      { type: "done" },
    ]);
  });
});

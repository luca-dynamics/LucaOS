import { afterEach, describe, expect, it, vi } from "vitest";
import {
  chatViaCortexRuntimeFacade,
  normalizeCortexChatMessages,
} from "../cortexRuntimeOps";
import { localRuntimeRegistry } from "../RuntimeRegistry";
import { CortexRuntime } from "../runtimes/CortexRuntime";
import { localInferenceAdmission } from "../LocalInferenceAdmission";

const jsonResponse = (status: number, body: unknown): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  }) as unknown as Response;

describe("cortexRuntimeOps", () => {
  afterEach(() => {
    localRuntimeRegistry.replace(new CortexRuntime());
  });

  it("normalizes Gemini-style parts into plain content", () => {
    const messages = normalizeCortexChatMessages([
      { role: "user", parts: [{ text: "hello" }, { text: "world" }] },
    ]);
    expect(messages).toEqual([
      { role: "user", content: "hello\nworld" },
    ]);
  });

  it("chats via registered CortexRuntime with OpenAI-compatible path", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(200, {
        choices: [{ message: { content: "plan ok" } }],
      }),
    );
    localRuntimeRegistry.replace(
      new CortexRuntime({
        baseUrl: "http://127.0.0.1:8000",
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    );

    const result = await chatViaCortexRuntimeFacade({
      model: "gemma-2b",
      messages: [{ role: "user", content: "hi" }],
    });
    expect(result.text).toBe("plan ok");
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/chat/completions",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("rejects when admission is exhausted", async () => {
    const held = localInferenceAdmission.tryAcquire("cortex");
    expect(held).not.toBeNull();
    try {
      await expect(
        chatViaCortexRuntimeFacade({
          messages: [{ role: "user", content: "x" }],
        }),
      ).rejects.toThrow(/busy/i);
    } finally {
      held?.release();
    }
  });
});

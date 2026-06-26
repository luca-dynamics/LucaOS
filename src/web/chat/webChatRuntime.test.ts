import { describe, expect, it, vi } from "vitest";
import {
  WEB_CHAT_RUNTIME_UNAVAILABLE,
  buildWebChatRequestBody,
  createWebChatRuntime,
  parseWebChatResponse,
  resolveWebChatBaseUrl,
  type WebChatMessage,
} from "./webChatRuntime";

const msg = (role: WebChatMessage["role"], content: string): WebChatMessage => ({
  id: `${role}-${content}`,
  role,
  content,
  timestamp: 0,
});

describe("webChatRuntime", () => {
  it("resolves and trims a configured base url, else null", () => {
    expect(resolveWebChatBaseUrl({ cloudApiUrl: "https://cloud.luca/" })).toBe("https://cloud.luca");
    expect(resolveWebChatBaseUrl({ apiBaseUrl: "https://api.luca//" })).toBe("https://api.luca");
    expect(resolveWebChatBaseUrl({ cloudApiUrl: "", apiBaseUrl: "" })).toBeNull();
  });

  it("builds an OpenAI-compatible request body", () => {
    const body = buildWebChatRequestBody([msg("user", "hi")], "luca-prime");
    expect(body.model).toBe("luca-prime");
    expect(body.messages).toEqual([{ role: "user", content: "hi" }]);
    expect(body.temperature).toBe(0.7);
  });

  it("parses assistant text from an OpenAI-compatible response, else null", () => {
    expect(parseWebChatResponse({ choices: [{ message: { content: "hello" } }] })).toBe("hello");
    expect(parseWebChatResponse({ choices: [] })).toBeNull();
    expect(parseWebChatResponse({})).toBeNull();
    expect(parseWebChatResponse(null)).toBeNull();
  });

  it("returns the honest unavailable message when no route is configured", async () => {
    const runtime = createWebChatRuntime({ env: { cloudApiUrl: "", apiBaseUrl: "" } });
    const reply = await runtime.sendMessage({ messages: [msg("user", "hi")], text: "hi" });
    expect(reply.content).toBe(WEB_CHAT_RUNTIME_UNAVAILABLE);
  });

  it("posts to the configured endpoint and returns the assistant reply", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: "Hi, I'm Luca." } }] }),
    });
    const runtime = createWebChatRuntime({
      env: { cloudApiUrl: "https://cloud.luca" },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const reply = await runtime.sendMessage({ messages: [msg("user", "hi")], text: "hi" });
    expect(reply.content).toBe("Hi, I'm Luca.");
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://cloud.luca/v1/chat/completions",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("falls back to an honest error on a non-ok response or throw", async () => {
    const notOk = createWebChatRuntime({
      env: { cloudApiUrl: "https://cloud.luca" },
      fetchImpl: (() => Promise.resolve({ ok: false, json: async () => ({}) })) as unknown as typeof fetch,
    });
    const a = await notOk.sendMessage({ messages: [msg("user", "hi")], text: "hi" });
    expect(a.content).toContain("couldn't reach that route");

    const throws = createWebChatRuntime({
      env: { cloudApiUrl: "https://cloud.luca" },
      fetchImpl: (() => Promise.reject(new Error("network"))) as unknown as typeof fetch,
    });
    const b = await throws.sendMessage({ messages: [msg("user", "hi")], text: "hi" });
    expect(b.content).toContain("couldn't reach that route");
  });
});

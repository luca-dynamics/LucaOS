import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSettings: vi.fn(),
  ensureOllamaRunning: vi.fn(),
  getModelSpecs: vi.fn(),
  runtimeChat: vi.fn(),
  runtimeStream: vi.fn(),
}));

vi.mock("../settingsService", () => ({
  settingsService: {
    getSettings: mocks.getSettings,
  },
}));

vi.mock("../local-models/LocalModelLibrary", () => ({
  LOCAL_BRAIN_MODEL_IDS: ["gemma-4b", "gemma-2b", "llama-3.2-1b"],
  modelManager: {
    ensureOllamaRunning: mocks.ensureOllamaRunning,
    getModelSpecs: mocks.getModelSpecs,
  },
}));

vi.mock("../local-models/LucaLocalModelRuntime", () => ({
  lucaLocalModelRuntime: {
    chat: mocks.runtimeChat,
    stream: mocks.runtimeStream,
  },
}));

import { LocalLLMAdapter } from "./LocalLLMAdapter";

describe("LocalLLMAdapter Luca local runtime bridge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSettings.mockReturnValue({ brain: { preferOllama: false } });
    mocks.runtimeChat.mockResolvedValue({
      text: "ok from local runtime",
      runtime: "cortex",
      model: "gemma-2b",
    });
  });

  it("routes internal local models through Luca's Cortex runtime facade", async () => {
    mocks.getModelSpecs.mockReturnValue({ id: "gemma-2b", runtime: "internal" });
    const adapter = new LocalLLMAdapter("gemma-2b");

    const response = await adapter.chat([
      { role: "system", content: "be concise" },
      { role: "user", content: "hello" },
    ]);

    expect(mocks.ensureOllamaRunning).not.toHaveBeenCalled();
    expect(mocks.runtimeChat).toHaveBeenCalledWith({
      model: "gemma-2b",
      messages: [
        { role: "system", content: "be concise", toolCallId: undefined },
        { role: "user", content: "hello", toolCallId: undefined },
      ],
      temperature: 0.7,
      tools: undefined,
    });
    expect(response).toEqual({ text: "ok from local runtime", toolCalls: undefined });
  });

  it("resolves Ollama tags before calling Luca's runtime facade", async () => {
    mocks.getSettings.mockReturnValue({ brain: { preferOllama: true } });
    mocks.getModelSpecs.mockReturnValue({
      id: "llama-3.2-1b",
      runtime: "ollama",
      ollamaTag: "llama3.2:1b",
    });
    mocks.runtimeChat.mockResolvedValue({
      text: "tool response",
      runtime: "ollama",
      model: "llama3.2:1b",
      toolCalls: [{ id: "call_1", name: "remember", args: { fact: "local" } }],
    });
    const adapter = new LocalLLMAdapter("llama-3.2-1b");

    const response = await adapter.chat(
      [{ role: "model", content: "prior answer" }],
      undefined,
      "system prompt",
      [{ name: "remember", description: "Save a fact", parameters: { type: "object" } }],
    );

    expect(mocks.ensureOllamaRunning).toHaveBeenCalledTimes(1);
    expect(mocks.runtimeChat).toHaveBeenCalledWith({
      model: "llama3.2:1b",
      messages: [
        { role: "system", content: "system prompt", toolCallId: undefined },
        { role: "assistant", content: "prior answer", toolCallId: undefined },
      ],
      temperature: 0.7,
      tools: [
        {
          type: "function",
          function: {
            name: "remember",
            description: "Save a fact",
            parameters: { type: "object" },
          },
        },
      ],
    });
    expect(response).toEqual({
      text: "tool response",
      toolCalls: [{ id: "call_1", name: "remember", args: { fact: "local" } }],
    });
  });

  it("streams through Luca's runtime facade", async () => {
    mocks.getModelSpecs.mockReturnValue({ id: "gemma-2b", runtime: "internal" });
    mocks.runtimeStream.mockImplementation(async function* () {
      yield { type: "token", text: "hel" };
      yield { type: "token", text: "lo" };
      yield { type: "done" };
    });
    const adapter = new LocalLLMAdapter("gemma-2b");
    const chunks: string[] = [];

    const response = await adapter.chatStream(
      [{ role: "user", content: "say hello" }],
      (chunk) => chunks.push(chunk),
      undefined,
      "system",
      [{ name: "remember", parameters: { type: "object" } }],
    );

    expect(mocks.runtimeStream).toHaveBeenCalledWith({
      model: "gemma-2b",
      messages: [
        { role: "system", content: "system", toolCallId: undefined },
        { role: "user", content: "say hello", toolCallId: undefined },
      ],
      temperature: 0.7,
      signal: undefined,
      tools: [
        {
          type: "function",
          function: {
            name: "remember",
            description: undefined,
            parameters: { type: "object" },
          },
        },
      ],
    });
    expect(chunks).toEqual(["hel", "lo"]);
    expect(response).toEqual({ text: "hello" });
  });
});

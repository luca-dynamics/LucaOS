import { afterEach, describe, expect, it, vi } from "vitest";
import { NativeGgufModelRegistry } from "../NativeGgufModelRegistry";
import { NativeGgufRuntime } from "../runtimes/NativeGgufRuntime";

describe("NativeGgufRuntime", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("requires explicit GGUF registrations", () => {
    const registry = new NativeGgufModelRegistry();
    expect(() => registry.register({ id: "unsafe", modelPath: "C:/model.bin" })).toThrow(
      ".gguf",
    );
  });

  it("loads registered models and normalizes chat", async () => {
    const registry = new NativeGgufModelRegistry();
    registry.register({ id: "tiny", modelPath: "C:/models/tiny.gguf" });
    const prompt = vi.fn(async () => "native response");
    const dispose = vi.fn();
    const runtime = new NativeGgufRuntime(registry, async () => ({
      getLlama: async () => ({
        loadModel: async () => ({
          createContext: async () => ({
            getSequence: () => ({}),
            dispose,
          }),
          dispose,
        }),
      }),
      LlamaChatSession: class {
        prompt = prompt;
        dispose = dispose;
      } as any,
    }));

    const response = await runtime.chat({
      model: "tiny",
      messages: [{ role: "user", content: "hello" }],
    });

    expect(response).toMatchObject({
      text: "native response",
      runtime: "native-gguf",
      model: "tiny",
    });
    expect(prompt).toHaveBeenCalledWith(
      "USER: hello",
      expect.objectContaining({ temperature: undefined }),
    );
  });

  it("reports registered native models in health", async () => {
    const registry = new NativeGgufModelRegistry();
    registry.register({ id: "tiny", modelPath: "C:/models/tiny.gguf" });
    const runtime = new NativeGgufRuntime(registry, async () => ({
      getLlama: async () => ({}),
      LlamaChatSession: class {} as any,
    }));

    await expect(runtime.health()).resolves.toMatchObject({
      runtime: "native-gguf",
      reachable: true,
      modelIds: ["tiny"],
    });
  });

  it("grounds desktop chats and appends deterministic document citations", async () => {
    const chat = vi.fn(async () => "Grounded answer");
    vi.stubGlobal("window", {
      luca: {
        nativeGguf: { chat },
        localDocs: {
          list: async () => [{ embeddingModelId: "embed" }],
          search: async () => [{
            folderName: "Notes",
            relativePath: "luca.md",
            text: "Luca runs locally.",
            score: 0.98,
          }],
        },
      },
    });
    const runtime = new NativeGgufRuntime();
    const response = await runtime.chat({
      model: "tiny",
      messages: [{ role: "user", content: "Where does Luca run?" }],
    });

    expect(chat).toHaveBeenCalledWith(expect.objectContaining({
      prompt: expect.stringContaining("[1] Notes/luca.md\nLuca runs locally."),
    }));
    expect(response.text).toBe("Grounded answer\n\nSources: [1] Notes/luca.md");
  });

  it("yields desktop IPC token events in order", async () => {
    vi.stubGlobal("window", {
      luca: {
        nativeGguf: {
          streamStart: async (_requestId: string, _request: unknown, callback: (event: any) => void) => {
            callback({ type: "token", text: "one" });
            callback({ type: "token", text: "two" });
            callback({ type: "done" });
          },
          streamCancel: async () => true,
        },
        localDocs: { list: async () => [] },
      },
    });
    const runtime = new NativeGgufRuntime();
    const events = [];
    for await (const event of runtime.stream({
      model: "tiny",
      messages: [{ role: "user", content: "stream" }],
    })) events.push(event);

    expect(events).toEqual([
      { type: "token", text: "one" },
      { type: "token", text: "two" },
      { type: "done" },
    ]);
  });
});

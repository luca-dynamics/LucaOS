import { afterEach, describe, expect, it, vi } from "vitest";
import type { LocalRuntimeEvent } from "../LocalModelTypes";
import { NativeGgufModelRegistry } from "../NativeGgufModelRegistry";
import {
  NativeGgufRuntime,
  type NativeLlamaCompletionOptions,
  type NativeLlamaModule,
} from "../runtimes/NativeGgufRuntime";

type PromptStub = (
  prompt: string,
  options?: NativeLlamaCompletionOptions,
) => Promise<string>;

/** A stub `node-llama-cpp` whose chat session runs `prompt`. */
function stubModule(prompt: PromptStub, dispose = vi.fn()): NativeLlamaModule {
  return {
    getLlama: async () => ({
      loadModel: async () => ({
        createContext: async () => ({ getSequence: () => ({}), dispose }),
        dispose,
      }),
    }),
    LlamaChatSession: class {
      prompt = prompt;
      dispose = dispose;
    },
  };
}

/** One retrieved chunk, carrying the page locator the indexer computed. */
function pdfChunk(): LocalDocsSearchResult {
  return {
    folderId: "notes",
    folderName: "Notes",
    relativePath: "luca.md",
    chunkIndex: 0,
    text: "Luca runs locally.",
    locator: { kind: "page", start: 3, end: 3 },
    citation: "luca.md, p. 3",
    score: 0.98,
  };
}

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
    const runtime = new NativeGgufRuntime(registry, async () => stubModule(prompt));

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
    const runtime = new NativeGgufRuntime(registry, async () =>
      stubModule(async () => ""),
    );

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
          search: async () => [pdfChunk()],
        },
      },
    });
    const runtime = new NativeGgufRuntime();
    const response = await runtime.chat({
      model: "tiny",
      messages: [{ role: "user", content: "Where does Luca run?" }],
    });

    // The citation carries the page the answer came from, not just the file:
    // "which document" leaves the reader a whole PDF to search by hand.
    expect(chat).toHaveBeenCalledWith(expect.objectContaining({
      prompt: expect.stringContaining("[1] Notes/luca.md, p. 3\nLuca runs locally."),
    }));
    expect(response.text).toBe("Grounded answer\n\nSources: [1] Notes/luca.md, p. 3");
  });

  it("grounds in-process chats through the same retrieval as the desktop path", async () => {
    const registry = new NativeGgufModelRegistry();
    registry.register({ id: "tiny", modelPath: "C:/models/tiny.gguf" });
    const prompt = vi.fn(async () => "Local answer");
    // Same request, no desktop bridge. This path used to drop the grounding
    // entirely, so an answer was cited or uncited depending only on which
    // process happened to serve it.
    const runtime = new NativeGgufRuntime(
      registry,
      async () => stubModule(prompt),
      async () => [pdfChunk()],
    );

    const response = await runtime.chat({
      model: "tiny",
      messages: [{ role: "user", content: "Where does Luca run?" }],
    });

    expect(prompt).toHaveBeenCalledWith(
      expect.stringContaining("[1] Notes/luca.md, p. 3\nLuca runs locally."),
      expect.anything(),
    );
    expect(response.text).toBe("Local answer\n\nSources: [1] Notes/luca.md, p. 3");
  });

  it("yields desktop IPC token events in order", async () => {
    vi.stubGlobal("window", {
      luca: {
        nativeGguf: {
          streamStart: async (_requestId: string, _request: unknown, callback: (event: NativeGgufStreamEvent) => void) => {
            callback({ requestId: "r", type: "token", text: "one" });
            callback({ requestId: "r", type: "token", text: "two" });
            callback({ requestId: "r", type: "done" });
          },
          streamCancel: async () => true,
        },
        localDocs: { list: async () => [] },
      },
    });
    const runtime = new NativeGgufRuntime();
    const events: LocalRuntimeEvent[] = [];
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

  it("emits in-process tokens before the completion resolves", async () => {
    const registry = new NativeGgufModelRegistry();
    registry.register({ id: "tiny", modelPath: "C:/models/tiny.gguf" });
    let releaseCompletion = () => {};
    const gate = new Promise<void>((resolve) => {
      releaseCompletion = resolve;
    });
    let completionResolved = false;
    const runtime = new NativeGgufRuntime(registry, async () =>
      stubModule(async (_prompt, options) => {
        options?.onTextChunk?.("first ");
        await gate;
        options?.onTextChunk?.("second");
        completionResolved = true;
        return "first second";
      }),
    );

    const stream = runtime.stream({
      model: "tiny",
      messages: [{ role: "user", content: "go" }],
    });
    const first = await stream.next();

    // The generator handed back a token while prompt() is still suspended on
    // the gate. Collecting chunks into an array and yielding after the
    // completion resolved — what this did before — cannot produce this.
    expect(first.value).toEqual({ type: "token", text: "first " });
    expect(completionResolved).toBe(false);

    releaseCompletion();
    const rest: LocalRuntimeEvent[] = [];
    for await (const event of stream) rest.push(event);
    expect(rest).toEqual([{ type: "token", text: "second" }, { type: "done" }]);
  });

  it("surfaces an in-process completion failure as a stream error", async () => {
    const registry = new NativeGgufModelRegistry();
    registry.register({ id: "tiny", modelPath: "C:/models/tiny.gguf" });
    const runtime = new NativeGgufRuntime(registry, async () =>
      stubModule(async () => {
        throw new Error("out of VRAM");
      }),
    );

    const events: LocalRuntimeEvent[] = [];
    for await (const event of runtime.stream({
      model: "tiny",
      messages: [{ role: "user", content: "go" }],
    })) events.push(event);

    expect(events).toEqual([
      { type: "error", error: "out of VRAM" },
      { type: "done" },
    ]);
  });
});

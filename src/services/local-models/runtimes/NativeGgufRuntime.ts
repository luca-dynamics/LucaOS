import type { LocalRuntimeAdapter, LocalRuntimeHealth } from "../LocalRuntimeAdapter";
import { createRuntimeHealth } from "../LocalRuntimeAdapter";
import type {
  LocalChatRequest,
  LocalChatResponse,
  LocalRuntimeEvent,
} from "../LocalModelTypes";
import {
  nativeGgufModelRegistry,
  type NativeGgufModelRegistry,
} from "../NativeGgufModelRegistry";

// The desktop bridge shapes this file consumes — NativeGgufRegistration,
// NativeGgufHealth, LocalDocsFolder, LocalDocsSearchResult, LucaDesktopBridge —
// are declared once as ambient globals in src/types/app-globals.d.ts. They are
// deliberately not restated here: a second copy of the IPC contract is the same
// drift that two competing model catalogs produced.

/** The slice of `node-llama-cpp` this runtime actually calls. */
export interface NativeLlamaCompletionOptions {
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
  stopOnAbortSignal?: boolean;
  onTextChunk?: (chunk: string) => void;
}

interface NativeLlamaChatSession {
  prompt(prompt: string, options?: NativeLlamaCompletionOptions): Promise<string>;
  dispose?(): void;
}

interface NativeLlamaContext {
  getSequence(): unknown;
  dispose?(): Promise<void> | void;
}

interface NativeLlamaModel {
  createContext(options?: { contextSize?: number }): Promise<NativeLlamaContext>;
  dispose?(): Promise<void> | void;
}

interface NativeLlama {
  loadModel(options: { modelPath: string }): Promise<NativeLlamaModel>;
}

export interface NativeLlamaModule {
  getLlama(): Promise<NativeLlama>;
  LlamaChatSession: new (options: {
    contextSequence: unknown;
  }) => NativeLlamaChatSession;
}

type NativeLlamaModuleLoader = () => Promise<NativeLlamaModule>;

/** Retrieves the LocalDocs chunks that should ground one request. */
export type LocalDocsRetriever = (
  request: LocalChatRequest,
) => Promise<LocalDocsSearchResult[]>;

interface LoadedNativeModel {
  id: string;
  model: NativeLlamaModel;
  context: NativeLlamaContext;
  session: NativeLlamaChatSession;
}

export class NativeGgufRuntime implements LocalRuntimeAdapter {
  readonly kind = "native-gguf" as const;
  private loaded: LoadedNativeModel | null = null;

  constructor(
    private readonly models: NativeGgufModelRegistry = nativeGgufModelRegistry,
    private readonly loadModule: NativeLlamaModuleLoader = loadNativeLlamaModule,
    private readonly retrieve: LocalDocsRetriever = retrieveLocalDocsContext,
  ) {}

  async health(): Promise<LocalRuntimeHealth> {
    try {
      const bridge = getNativeBridge();
      if (bridge) {
        const health = await bridge.health();
        return createRuntimeHealth({
          runtime: this.kind,
          reachable: health.reachable,
          modelIds: health.modelIds,
          message: health.error,
        });
      }
      await this.loadModule();
      return createRuntimeHealth({
        runtime: this.kind,
        reachable: true,
        modelIds: this.models.list().map((model) => model.id),
        message: this.models.list().length
          ? `${this.models.list().length} native GGUF models registered.`
          : "Native GGUF runtime is available; no models are registered.",
      });
    } catch (error) {
      return createRuntimeHealth({
        runtime: this.kind,
        reachable: false,
        message: describeError(error),
      });
    }
  }

  async listModels(): Promise<string[]> {
    const bridge = getNativeBridge();
    if (bridge) return (await bridge.list()).map((model) => model.id);
    return this.models.list().map((model) => model.id);
  }

  async ensureReady(): Promise<void> {
    if (getNativeBridge()) return;
    await this.loadModule();
  }

  async chat(request: LocalChatRequest): Promise<LocalChatResponse> {
    // Retrieve once and build one prompt, then pick a route. The desktop path
    // used to ground its answers while the in-process path quietly answered
    // from the model alone — the same question got a cited answer or an
    // uncited one depending on which process happened to serve it.
    const grounding = await this.retrieve(request);
    const prompt = formatPrompt(request, grounding);
    const bridge = getNativeBridge();
    const text = bridge
      ? await bridge.chat({
          model: request.model,
          prompt,
          temperature: request.temperature,
          maxTokens: request.maxTokens,
        })
      : await (await this.load(request.model)).session.prompt(prompt, {
          temperature: request.temperature,
          maxTokens: request.maxTokens,
          signal: request.signal,
        });
    return {
      text: appendSourceCitations(text, grounding),
      runtime: this.kind,
      model: request.model,
    };
  }

  async *stream(request: LocalChatRequest): AsyncGenerator<LocalRuntimeEvent> {
    const grounding = await this.retrieve(request);
    const prompt = formatPrompt(request, grounding);
    const citations = formatSourceCitations(grounding);
    const queue = new StreamQueue<LocalRuntimeEvent>();
    const bridge = getNativeBridge();

    if (bridge) {
      const requestId = createStreamId();
      const abort = () => void bridge.streamCancel(requestId);
      request.signal?.addEventListener("abort", abort, { once: true });
      const settled = bridge
        .streamStart(
          requestId,
          {
            model: request.model,
            prompt,
            temperature: request.temperature,
            maxTokens: request.maxTokens,
          },
          (event) => {
            if (event.type === "token" && event.text) {
              queue.push({ type: "token", text: event.text });
            }
            if (event.type === "error") {
              queue.push({
                type: "error",
                error: event.error || "Native stream failed.",
              });
            }
            if (event.type === "done" || event.type === "error") queue.close();
          },
        )
        .catch((error: unknown) => {
          queue.push({ type: "error", error: describeError(error) });
          queue.close();
        });
      try {
        for await (const event of queue.drain()) yield event;
      } finally {
        request.signal?.removeEventListener("abort", abort);
      }
      await settled;
    } else {
      const loaded = await this.load(request.model);
      let emitted = false;
      const settled = loaded.session
        .prompt(prompt, {
          temperature: request.temperature,
          maxTokens: request.maxTokens,
          signal: request.signal,
          stopOnAbortSignal: true,
          onTextChunk: (chunk: string) => {
            if (!chunk) return;
            emitted = true;
            queue.push({ type: "token", text: chunk });
          },
        })
        .then(
          (result) => {
            // A build that never calls onTextChunk still returns the whole
            // completion; emit it rather than yielding an empty stream.
            if (!emitted && result) queue.push({ type: "token", text: result });
          },
          (error: unknown) => {
            queue.push({ type: "error", error: describeError(error) });
          },
        )
        .finally(() => queue.close());
      // Draining is not awaited behind the completion: tokens leave here as
      // onTextChunk fires them, so the caller sees the first word while the
      // model is still generating the rest.
      for await (const event of queue.drain()) yield event;
      await settled;
    }

    if (citations) yield { type: "token", text: citations };
    yield { type: "done" };
  }

  async unload(): Promise<void> {
    const bridge = getNativeBridge();
    if (bridge) {
      await bridge.unload();
      return;
    }
    const loaded = this.loaded;
    this.loaded = null;
    if (!loaded) return;
    loaded.session.dispose?.();
    await loaded.context.dispose?.();
    await loaded.model.dispose?.();
  }

  private async load(id: string): Promise<LoadedNativeModel> {
    if (this.loaded?.id === id) return this.loaded;
    await this.unload();
    const registration = this.models.require(id);
    const native = await this.loadModule();
    const llama = await native.getLlama();
    const model = await llama.loadModel({ modelPath: registration.modelPath });
    const context = await model.createContext({
      contextSize: registration.contextWindow,
    });
    const session = new native.LlamaChatSession({
      contextSequence: context.getSequence(),
    });
    this.loaded = { id, model, context, session };
    return this.loaded;
  }
}

/**
 * A one-producer, one-consumer async queue. Items become available to the
 * consumer the moment they are pushed, which is what makes `stream()` a stream:
 * the previous implementation collected every chunk into an array and yielded
 * only after the completion resolved — a non-streaming call wearing a
 * generator's clothes, on the surface where time-to-first-token *is* the
 * experience of running a model locally.
 */
class StreamQueue<T> {
  private readonly pending: T[] = [];
  private closed = false;
  private wake: (() => void) | undefined;

  push(item: T): void {
    this.pending.push(item);
    this.signal();
  }

  close(): void {
    this.closed = true;
    this.signal();
  }

  async *drain(): AsyncGenerator<T> {
    for (;;) {
      if (this.pending.length) {
        // Take the whole batch before yielding: a push that lands while the
        // consumer is suspended is picked up on the next pass.
        for (const item of this.pending.splice(0, this.pending.length)) {
          yield item;
        }
        continue;
      }
      if (this.closed) return;
      // No lost-wakeup race here: a Promise executor runs synchronously, so
      // `wake` is assigned before this generator gives up control.
      await new Promise<void>((resolve) => {
        this.wake = resolve;
      });
    }
  }

  private signal(): void {
    const wake = this.wake;
    this.wake = undefined;
    wake?.();
  }
}

function formatPrompt(
  request: LocalChatRequest,
  grounding: LocalDocsSearchResult[] = [],
): string {
  const context = grounding.length
    ? `LOCAL DOCUMENT CONTEXT:\n${grounding
        .map(
          (item, index) =>
            `[${index + 1}] ${item.folderName}/${sourceLabel(item)}\n${item.text}`,
        )
        .join(
          "\n\n",
        )}\n\nUse this context when relevant. Do not invent document claims.\n\n`
    : "";
  return (
    context +
    request.messages
      .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
      .join("\n\n")
  );
}

/**
 * The reader-facing label for one retrieved chunk. The indexer already renders
 * the locator it computed into `citation` — `manual.pdf, p. 3` — so rebuilding
 * `folder/file` here would throw away the page number and leave the reader with
 * a whole document to search by hand.
 */
function sourceLabel(item: LocalDocsSearchResult): string {
  return item.citation || item.relativePath;
}

async function retrieveLocalDocsContext(
  request: LocalChatRequest,
): Promise<LocalDocsSearchResult[]> {
  const bridge = getLocalDocsBridge();
  if (!bridge) return [];
  const query = [...request.messages]
    .reverse()
    .find((message) => message.role === "user")?.content;
  if (!query) return [];
  try {
    const folders = await bridge.list();
    const modelId = folders.find((folder) => folder.embeddingModelId)
      ?.embeddingModelId;
    if (!modelId) return [];
    return await bridge.search({ query, modelId, limit: 4 });
  } catch {
    return [];
  }
}

function formatSourceCitations(results: LocalDocsSearchResult[]): string {
  if (!results.length) return "";
  const unique = [
    ...new Set(results.map((item) => `${item.folderName}/${sourceLabel(item)}`)),
  ];
  return `\n\nSources: ${unique
    .map((source, index) => `[${index + 1}] ${source}`)
    .join("; ")}`;
}

function appendSourceCitations(
  text: string,
  results: LocalDocsSearchResult[],
): string {
  return text + formatSourceCitations(results);
}

async function loadNativeLlamaModule(): Promise<NativeLlamaModule> {
  if (typeof window !== "undefined")
    throw new Error("Native GGUF bindings must run in the LucaOS Desktop host.");
  const moduleName = "node-llama-cpp";
  return import(/* @vite-ignore */ moduleName) as Promise<NativeLlamaModule>;
}

function getNativeBridge(): NonNullable<LucaDesktopBridge["nativeGguf"]> | undefined {
  if (typeof window === "undefined") return undefined;
  return window.luca?.nativeGguf;
}

function getLocalDocsBridge(): NonNullable<LucaDesktopBridge["localDocs"]> | undefined {
  if (typeof window === "undefined") return undefined;
  return window.luca?.localDocs;
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function createStreamId(): string {
  return `gguf-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

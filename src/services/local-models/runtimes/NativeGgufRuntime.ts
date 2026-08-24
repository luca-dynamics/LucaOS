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

interface NativeLlamaModule {
  getLlama(): Promise<any>;
  LlamaChatSession: new (options: { contextSequence: any }) => any;
}

type NativeLlamaModuleLoader = () => Promise<NativeLlamaModule>;

interface LoadedNativeModel {
  id: string;
  model: any;
  context: any;
  session: any;
}

export class NativeGgufRuntime implements LocalRuntimeAdapter {
  readonly kind = "native-gguf" as const;
  private loaded: LoadedNativeModel | null = null;

  constructor(
    private readonly models: NativeGgufModelRegistry = nativeGgufModelRegistry,
    private readonly loadModule: NativeLlamaModuleLoader = loadNativeLlamaModule,
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
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async listModels(): Promise<string[]> {
    const bridge = getNativeBridge();
    if (bridge) return (await bridge.list()).map((model: any) => model.id);
    return this.models.list().map((model) => model.id);
  }

  async ensureReady(): Promise<void> {
    if (getNativeBridge()) return;
    await this.loadModule();
  }

  async chat(request: LocalChatRequest): Promise<LocalChatResponse> {
    const bridge = getNativeBridge();
    if (bridge) {
      const grounding = await retrieveLocalDocsContext(request);
      const text = await bridge.chat({
        model: request.model,
        prompt: formatPrompt(request, grounding),
        temperature: request.temperature,
        maxTokens: request.maxTokens,
      });
      return {
        text: appendSourceCitations(text, grounding),
        runtime: this.kind,
        model: request.model,
      };
    }
    const loaded = await this.load(request.model);
    const result = await loaded.session.prompt(formatPrompt(request), {
      temperature: request.temperature,
      maxTokens: request.maxTokens,
      signal: request.signal,
    });
    return {
      text: result,
      runtime: this.kind,
      model: request.model,
    };
  }

  async *stream(request: LocalChatRequest): AsyncGenerator<LocalRuntimeEvent> {
    const bridge = getNativeBridge();
    if (bridge) {
      const grounding = await retrieveLocalDocsContext(request);
      const requestId = createStreamId();
      const events: any[] = [];
      let wake: (() => void) | undefined;
      let finished = false;
      const onEvent = (event: any) => {
        events.push(event);
        if (event.type === "done" || event.type === "error") finished = true;
        wake?.();
        wake = undefined;
      };
      const abort = () => void bridge.streamCancel(requestId);
      request.signal?.addEventListener("abort", abort, { once: true });
      const completion = bridge.streamStart(requestId, {
        model: request.model,
        prompt: formatPrompt(request, grounding),
        temperature: request.temperature,
        maxTokens: request.maxTokens,
      }, onEvent).catch((error: unknown) => onEvent({ type: "error", error: error instanceof Error ? error.message : String(error) }));
      while (!finished || events.length) {
        if (!events.length) await new Promise<void>((resolve) => { wake = resolve; });
        const event = events.shift();
        if (!event) continue;
        if (event.type === "token" && event.text) yield { type: "token", text: event.text };
        if (event.type === "error") yield { type: "error", error: event.error || "Native stream failed." };
      }
      await completion;
      request.signal?.removeEventListener("abort", abort);
      const citations = formatSourceCitations(grounding);
      if (citations) yield { type: "token", text: citations };
      yield { type: "done" };
      return;
    }
    const loaded = await this.load(request.model);
    const chunks: string[] = [];
    const result = await loaded.session.prompt(formatPrompt(request), {
      temperature: request.temperature,
      maxTokens: request.maxTokens,
      signal: request.signal,
      onTextChunk: (chunk: string) => chunks.push(chunk),
    });
    for (const chunk of chunks) yield { type: "token", text: chunk };
    if (chunks.length === 0 && result) yield { type: "token", text: result };
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
    loaded.session?.dispose?.();
    await loaded.context?.dispose?.();
    await loaded.model?.dispose?.();
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

function formatPrompt(request: LocalChatRequest, grounding: LocalDocsResult[] = []): string {
  const context = grounding.length
    ? `LOCAL DOCUMENT CONTEXT:\n${grounding.map((item, index) =>
        `[${index + 1}] ${item.folderName}/${item.relativePath}\n${item.text}`,
      ).join("\n\n")}\n\nUse this context when relevant. Do not invent document claims.\n\n`
    : "";
  return context + request.messages
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join("\n\n");
}

interface LocalDocsResult {
  folderName: string;
  relativePath: string;
  text: string;
  score: number;
}

async function retrieveLocalDocsContext(request: LocalChatRequest): Promise<LocalDocsResult[]> {
  const bridge = getLocalDocsBridge();
  if (!bridge) return [];
  const query = [...request.messages].reverse().find((message) => message.role === "user")?.content;
  if (!query) return [];
  try {
    const folders = await bridge.list();
    const modelId = folders.find((folder: any) => folder.embeddingModelId)?.embeddingModelId;
    if (!modelId) return [];
    return await bridge.search({ query, modelId, limit: 4 });
  } catch {
    return [];
  }
}

function formatSourceCitations(results: LocalDocsResult[]): string {
  if (!results.length) return "";
  const unique = [...new Set(results.map((item) => `${item.folderName}/${item.relativePath}`))];
  return `\n\nSources: ${unique.map((source, index) => `[${index + 1}] ${source}`).join("; ")}`;
}

function appendSourceCitations(text: string, results: LocalDocsResult[]): string {
  return text + formatSourceCitations(results);
}

async function loadNativeLlamaModule(): Promise<NativeLlamaModule> {
  if (typeof window !== "undefined")
    throw new Error("Native GGUF bindings must run in the LucaOS Desktop host.");
  const moduleName = "node-llama-cpp";
  return import(/* @vite-ignore */ moduleName) as Promise<NativeLlamaModule>;
}

function getNativeBridge(): any | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as any).luca?.nativeGguf;
}

function getLocalDocsBridge(): any | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as any).luca?.localDocs;
}

function createStreamId(): string {
  return `gguf-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

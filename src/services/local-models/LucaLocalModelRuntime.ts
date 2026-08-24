import {
  findLocalModelDescriptor,
  LOCAL_MODEL_CATALOG,
} from "./LocalModelCatalog";
import {
  localInferenceAdmission,
  type LocalInferenceAdmission,
} from "./LocalInferenceAdmission";
import { localModelLease, type LocalModelLease } from "./LocalModelLease";
import type { LocalRuntimeAdapter } from "./LocalRuntimeAdapter";
import {
  localRuntimeRegistry,
  type RuntimeRegistry,
} from "./RuntimeRegistry";
import type {
  LocalChatRequest,
  LocalChatResponse,
  LocalModelDescriptor,
  LocalRuntimeEvent,
} from "./LocalModelTypes";
import { nativeGgufModelRegistry } from "./NativeGgufModelRegistry";

interface LucaLocalModelRuntimeOptions {
  registry?: RuntimeRegistry;
  admission?: LocalInferenceAdmission;
  lease?: LocalModelLease;
  catalog?: LocalModelDescriptor[];
}

export class LucaLocalModelRuntime {
  private readonly registry: RuntimeRegistry;
  private readonly admission: LocalInferenceAdmission;
  private readonly lease: LocalModelLease;
  private readonly catalog: LocalModelDescriptor[];

  constructor(options: LucaLocalModelRuntimeOptions = {}) {
    this.registry = options.registry ?? localRuntimeRegistry;
    this.admission = options.admission ?? localInferenceAdmission;
    this.lease = options.lease ?? localModelLease;
    this.catalog = options.catalog ?? LOCAL_MODEL_CATALOG;
  }

  async chat(request: LocalChatRequest): Promise<LocalChatResponse> {
    const descriptor = this.findDescriptor(request.model);
    const adapter = this.registry.require(descriptor.runtime);
    const token = this.admission.tryAcquire(descriptor.runtime);

    if (!token) {
      throw new Error(`Local runtime is busy: ${descriptor.runtime}`);
    }

    this.lease.acquire(descriptor.id);
    try {
      await adapter.ensureReady?.();
      return await adapter.chat({
        ...request,
        model: descriptor.runtimeModelId,
      });
    } finally {
      this.lease.release(descriptor.id);
      token.release();
    }
  }

  async *stream(request: LocalChatRequest): AsyncGenerator<LocalRuntimeEvent> {
    const descriptor = this.findDescriptor(request.model);
    const adapter = this.registry.require(descriptor.runtime);
    const token = this.admission.tryAcquire(descriptor.runtime);

    if (!token) {
      throw new Error(`Local runtime is busy: ${descriptor.runtime}`);
    }

    this.lease.acquire(descriptor.id);
    try {
      await adapter.ensureReady?.();
      const runtimeRequest = {
        ...request,
        model: descriptor.runtimeModelId,
        stream: true,
      };

      if (adapter.stream) {
        yield* adapter.stream(runtimeRequest);
      } else {
        const response = await adapter.chat(runtimeRequest);
        if (response.text) yield { type: "token", text: response.text };
        if (response.toolCalls) {
          for (const toolCall of response.toolCalls) {
            yield { type: "tool_call", toolCall };
          }
        }
        if (response.usage) yield { type: "stats", ...response.usage };
        yield { type: "done" };
      }
    } finally {
      this.lease.release(descriptor.id);
      token.release();
    }
  }

  getRuntimeForModel(modelId: string): LocalRuntimeAdapter {
    const descriptor = this.findDescriptor(modelId);
    return this.registry.require(descriptor.runtime);
  }

  private findDescriptor(modelId: string): LocalModelDescriptor {
    const descriptor =
      this.catalog.find(
        (model) => model.id === modelId || model.runtimeModelId === modelId,
      ) ?? findLocalModelDescriptor(modelId);

    if (!descriptor) {
      if (modelId.startsWith("native-gguf:")) {
        const runtimeModelId = modelId.slice("native-gguf:".length).trim();
        if (!runtimeModelId) throw new Error("Native GGUF model id is empty.");
        return {
          id: modelId,
          displayName: runtimeModelId,
          runtime: "native-gguf",
          runtimeModelId,
          features: ["chat", "streaming"],
        };
      }
      const native = nativeGgufModelRegistry
        .list()
        .find((model) => model.id === modelId);
      if (native) {
        return {
          id: native.id,
          displayName: native.displayName ?? native.id,
          runtime: "native-gguf",
          runtimeModelId: native.id,
          contextWindow: native.contextWindow,
          features: ["chat", "streaming"],
          install: { strategy: "native-gguf-file", ref: native.modelPath },
          artifact: native.artifact,
        };
      }
      throw new Error(`Unknown local model: ${modelId}`);
    }
    return descriptor;
  }
}

export const lucaLocalModelRuntime = new LucaLocalModelRuntime();

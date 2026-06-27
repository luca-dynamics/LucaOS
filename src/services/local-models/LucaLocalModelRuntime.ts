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
} from "./LocalModelTypes";

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

  getRuntimeForModel(modelId: string): LocalRuntimeAdapter {
    const descriptor = this.findDescriptor(modelId);
    return this.registry.require(descriptor.runtime);
  }

  private findDescriptor(modelId: string): LocalModelDescriptor {
    const descriptor =
      this.catalog.find(
        (model) => model.id === modelId || model.runtimeModelId === modelId,
      ) ?? findLocalModelDescriptor(modelId);

    if (!descriptor) throw new Error(`Unknown local model: ${modelId}`);
    return descriptor;
  }
}

export const lucaLocalModelRuntime = new LucaLocalModelRuntime();

import type { LocalModelArtifact } from "./LocalModelTypes";

export interface NativeGgufModelRegistration {
  id: string;
  modelPath: string;
  displayName?: string;
  contextWindow?: number;
  artifact?: LocalModelArtifact;
}

export class NativeGgufModelRegistry {
  private readonly models = new Map<string, NativeGgufModelRegistration>();

  register(model: NativeGgufModelRegistration): void {
    const id = model.id.trim();
    const modelPath = model.modelPath.trim();
    if (!id) throw new Error("Native GGUF registration requires an id.");
    if (!modelPath.toLowerCase().endsWith(".gguf")) {
      throw new Error("Native GGUF registration requires a .gguf model path.");
    }
    this.models.set(id, { ...model, id, modelPath });
  }

  unregister(id: string): void {
    this.models.delete(id.trim());
  }

  require(id: string): NativeGgufModelRegistration {
    const model = this.models.get(id.trim());
    if (!model) throw new Error(`Native GGUF model is not registered: ${id}`);
    return model;
  }

  list(): NativeGgufModelRegistration[] {
    return Array.from(this.models.values());
  }
}

export const nativeGgufModelRegistry = new NativeGgufModelRegistry();

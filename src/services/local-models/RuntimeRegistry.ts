import type { LocalRuntimeAdapter } from "./LocalRuntimeAdapter";
import type { LocalRuntimeKind } from "./LocalModelTypes";
import { CortexRuntime } from "./runtimes/CortexRuntime";
import { OllamaRuntime } from "./runtimes/OllamaRuntime";
import { NativeGgufRuntime } from "./runtimes/NativeGgufRuntime";

export class RuntimeRegistry {
  private readonly adapters = new Map<LocalRuntimeKind, LocalRuntimeAdapter>();

  register(adapter: LocalRuntimeAdapter): void {
    if (this.adapters.has(adapter.kind)) {
      throw new Error(`Local runtime already registered: ${adapter.kind}`);
    }
    this.adapters.set(adapter.kind, adapter);
  }

  replace(adapter: LocalRuntimeAdapter): void {
    this.adapters.set(adapter.kind, adapter);
  }

  get(kind: LocalRuntimeKind): LocalRuntimeAdapter | undefined {
    return this.adapters.get(kind);
  }

  require(kind: LocalRuntimeKind): LocalRuntimeAdapter {
    const adapter = this.get(kind);
    if (!adapter) throw new Error(`Local runtime not registered: ${kind}`);
    return adapter;
  }

  list(): LocalRuntimeAdapter[] {
    return Array.from(this.adapters.values());
  }
}

export function createDefaultLocalRuntimeRegistry(): RuntimeRegistry {
  const registry = new RuntimeRegistry();
  registry.register(new OllamaRuntime());
  registry.register(new CortexRuntime());
  registry.register(new NativeGgufRuntime());
  return registry;
}

export const localRuntimeRegistry = createDefaultLocalRuntimeRegistry();

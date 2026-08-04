import { ModelProvider, ModelCapability, ProviderHealth } from "./ModelProvider";

export class ProviderRegistry {
  private providers: Map<string, ModelProvider> = new Map();

  public register(provider: ModelProvider): void {
    this.providers.set(provider.id, provider);
  }

  public unregister(providerId: string): void {
    this.providers.delete(providerId);
  }

  public get(providerId: string): ModelProvider | undefined {
    return this.providers.get(providerId);
  }

  public list(): readonly ModelProvider[] {
    return Array.from(this.providers.values());
  }

  public resolveByCapability(required: ModelCapability[]): ModelProvider[] {
    return this.list().filter((p) => {
      if (p.getHealth() === "unavailable") return false;
      return required.every((cap) => p.capabilities.includes(cap));
    });
  }
}

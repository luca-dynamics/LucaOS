import { ModelProvider, ModelCapability } from "./ModelProvider";
import { ProviderRegistry } from "./ProviderRegistry";
import { ProviderHealthMonitor } from "./ProviderHealthMonitor";

export interface ProviderSelectionPolicy {
  requiredCapabilities?: ModelCapability[];
  maxLatencyMs?: number;
  preferLocal?: boolean;
}

export class ModelRouter {
  public registry: ProviderRegistry;
  public healthMonitor: ProviderHealthMonitor;

  constructor(registry: ProviderRegistry) {
    this.registry = registry;
    this.healthMonitor = new ProviderHealthMonitor();
  }

  public selectProvider(policy: ProviderSelectionPolicy = {}): ModelProvider {
    const candidates = policy.requiredCapabilities && policy.requiredCapabilities.length > 0
      ? this.registry.resolveByCapability(policy.requiredCapabilities)
      : this.registry.list();

    const healthyCandidates = candidates.filter((p: ModelProvider) => {
      const isBaseHealthy = p.getHealth() === "healthy";
      const isCircuitHealthy = this.healthMonitor.isHealthy(p.id);
      return isBaseHealthy && isCircuitHealthy;
    });

    if (healthyCandidates.length === 0) {
      throw new Error("No healthy model provider available matching required capabilities.");
    }

    const sorted = [...healthyCandidates].sort((a: ModelProvider, b: ModelProvider) => {
      const healthA = this.healthMonitor.getHealth(a.id);
      const healthB = this.healthMonitor.getHealth(b.id);
      return healthA.rollingAverageMs - healthB.rollingAverageMs;
    });

    return sorted[0];
  }
}

export type ProviderHealthState = "healthy" | "degraded" | "open" | "half_open";

export interface DetailedProviderHealth {
  state: ProviderHealthState;
  latencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  rollingAverageMs: number;
  successRate: number;
  consecutiveFailures: number;
  lastFailureTime?: number;
  nextRetryAt?: number;
}

export class ProviderHealthMonitor {
  private healthState: Map<string, {
    state: ProviderHealthState;
    latencies: number[];
    failures: number;
    successes: number;
    consecutiveFailures: number;
    lastFailureTime?: number;
    nextRetryAt?: number;
  }> = new Map();

  private maxConsecutiveFailures = 3;
  private maxLatencyHistory = 50;

  public recordSuccess(providerId: string, latencyMs: number): void {
    const data = this.getOrCreateData(providerId);
    data.successes += 1;
    data.consecutiveFailures = 0;
    data.latencies.push(latencyMs);
    if (data.latencies.length > this.maxLatencyHistory) data.latencies.shift();

    if (data.state === "half_open" || data.state === "degraded") {
      data.state = "healthy";
    }
  }

  public recordFailure(providerId: string): void {
    const data = this.getOrCreateData(providerId);
    data.failures += 1;
    data.consecutiveFailures += 1;
    data.lastFailureTime = Date.now();

    if (data.consecutiveFailures >= this.maxConsecutiveFailures) {
      data.state = "open";
      data.nextRetryAt = Date.now() + 15000; // 15 second circuit cooldown
    } else if (data.consecutiveFailures === 1) {
      data.state = "degraded";
    }
  }

  public isHealthy(providerId: string): boolean {
    const health = this.getHealth(providerId);
    return health.state === "healthy" || health.state === "degraded" || health.state === "half_open";
  }

  public getHealth(providerId: string): DetailedProviderHealth {
    const data = this.getOrCreateData(providerId);
    
    // Check half-open transition
    if (data.state === "open" && data.nextRetryAt && Date.now() >= data.nextRetryAt) {
      data.state = "half_open";
    }

    const sortedLatencies = [...data.latencies].sort((a, b) => a - b);
    const count = sortedLatencies.length;
    const avg = count > 0 ? sortedLatencies.reduce((a, b) => a + b, 0) / count : 100;
    const p50 = count > 0 ? sortedLatencies[Math.floor(count * 0.5)] : 100;
    const p95 = count > 0 ? sortedLatencies[Math.floor(count * 0.95)] : 150;
    const p99 = count > 0 ? sortedLatencies[Math.floor(count * 0.99)] : 200;

    const total = data.successes + data.failures;
    const successRate = total > 0 ? data.successes / total : 1.0;

    return {
      state: data.state,
      latencyMs: avg,
      p50LatencyMs: p50,
      p95LatencyMs: p95,
      p99LatencyMs: p99,
      rollingAverageMs: avg,
      successRate,
      consecutiveFailures: data.consecutiveFailures,
      lastFailureTime: data.lastFailureTime,
      nextRetryAt: data.nextRetryAt,
    };
  }

  private getOrCreateData(providerId: string) {
    if (!this.healthState.has(providerId)) {
      this.healthState.set(providerId, {
        state: "healthy",
        latencies: [100],
        failures: 0,
        successes: 1,
        consecutiveFailures: 0,
      });
    }
    return this.healthState.get(providerId)!;
  }
}

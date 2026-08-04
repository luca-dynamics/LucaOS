export interface FaultInjectionConfig {
  simulateTimeout?: boolean;
  simulateDisconnect?: boolean;
  simulateWorkerFailure?: boolean;
}

export class FaultInjector {
  constructor(public config: FaultInjectionConfig = {}) {}

  public executeWithResilience<T>(
    operation: () => Promise<T>,
    fallback: () => T
  ): Promise<T> {
    if (this.config.simulateTimeout) {
      console.warn("💥 [FaultInjector] Injecting Simulated Network Timeout Fault!");
      return Promise.resolve(fallback());
    }
    if (this.config.simulateDisconnect) {
      console.warn("💥 [FaultInjector] Injecting Simulated Provider Disconnect Fault!");
      return Promise.resolve(fallback());
    }
    return operation().catch((err) => {
      console.error(`🛡️ [FaultInjector] Operation failed with error: ${err.message}. Triggering graceful fallback...`);
      return fallback();
    });
  }
}

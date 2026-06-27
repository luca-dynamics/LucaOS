export interface LocalModelLeaseSnapshot {
  activeByModel: Record<string, number>;
  releaseUnderflows: number;
}

interface LeaseWaiter {
  resolve: () => void;
  timeoutId?: ReturnType<typeof setTimeout>;
}

export class LocalModelLease {
  private readonly counts = new Map<string, number>();
  private readonly waiters = new Map<string, LeaseWaiter[]>();
  private underflows = 0;

  acquire(modelId: string): void {
    const key = this.normalizeModelId(modelId);
    this.counts.set(key, (this.counts.get(key) ?? 0) + 1);
  }

  release(modelId: string): void {
    const key = this.normalizeModelId(modelId);
    const current = this.counts.get(key) ?? 0;
    if (current <= 0) {
      this.underflows += 1;
      return;
    }

    const next = current - 1;
    if (next === 0) {
      this.counts.delete(key);
      this.wakeWaiters(key);
    } else {
      this.counts.set(key, next);
    }
  }

  count(modelId: string): number {
    return this.counts.get(this.normalizeModelId(modelId)) ?? 0;
  }

  isActive(modelId: string): boolean {
    return this.count(modelId) > 0;
  }

  async waitForZero(modelId: string, timeoutMs?: number): Promise<boolean> {
    const key = this.normalizeModelId(modelId);
    if ((this.counts.get(key) ?? 0) === 0) return true;

    return new Promise<boolean>((resolve) => {
      const waiter: LeaseWaiter = {
        resolve: () => resolve(true),
      };

      if (timeoutMs !== undefined) {
        waiter.timeoutId = setTimeout(() => {
          this.removeWaiter(key, waiter);
          resolve(false);
        }, Math.max(0, timeoutMs));
      }

      const pending = this.waiters.get(key) ?? [];
      pending.push(waiter);
      this.waiters.set(key, pending);
    });
  }

  snapshot(): LocalModelLeaseSnapshot {
    return {
      activeByModel: Object.fromEntries(this.counts.entries()),
      releaseUnderflows: this.underflows,
    };
  }

  private wakeWaiters(modelId: string): void {
    const pending = this.waiters.get(modelId) ?? [];
    this.waiters.delete(modelId);
    for (const waiter of pending) {
      if (waiter.timeoutId) clearTimeout(waiter.timeoutId);
      waiter.resolve();
    }
  }

  private removeWaiter(modelId: string, waiter: LeaseWaiter): void {
    const pending = this.waiters.get(modelId) ?? [];
    const next = pending.filter((candidate) => candidate !== waiter);
    if (next.length === 0) {
      this.waiters.delete(modelId);
    } else {
      this.waiters.set(modelId, next);
    }
  }

  private normalizeModelId(modelId: string): string {
    const normalized = modelId.trim();
    if (!normalized) throw new Error("Local model lease requires a model id.");
    return normalized;
  }
}

export const localModelLease = new LocalModelLease();

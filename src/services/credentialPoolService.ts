export type CredentialStatus = "ok" | "exhausted" | "dead";

export interface CredentialEntry {
  key: string;
  status: CredentialStatus;
  cooldownUntil?: number;
  usageCount: number;
}

export interface ProviderPoolStatus {
  totalKeys: number;
  activeKey: string | null;
  healthyKeysCount: number;
  exhaustedKeysCount: number;
  deadKeysCount: number;
}

export class CredentialPoolService {
  private pools = new Map<string, CredentialEntry[]>();
  private defaultCooldownMs = 60 * 1000; // 60 seconds TTL cooldown for 429 rate limits

  /**
   * Registers or updates a key pool for a specific provider
   */
  public registerPool(provider: string, keys: string[]): void {
    const normalizedProvider = provider.toLowerCase();
    const cleanKeys = Array.from(new Set(keys.map((k) => k.trim()).filter(Boolean)));

    if (cleanKeys.length === 0) {
      this.pools.delete(normalizedProvider);
      return;
    }

    const existingEntries = this.pools.get(normalizedProvider) || [];
    const existingMap = new Map(existingEntries.map((e) => [e.key, e]));

    const updatedEntries: CredentialEntry[] = cleanKeys.map((key) => {
      const existing = existingMap.get(key);
      if (existing) return existing;
      return {
        key,
        status: "ok",
        usageCount: 0,
      };
    });

    this.pools.set(normalizedProvider, updatedEntries);
  }

  /**
   * Retrieves the current healthy active key for a provider
   */
  public getActiveKey(provider: string, fallbackSingleKey?: string): string | null {
    const normalizedProvider = provider.toLowerCase();
    const entries = this.pools.get(normalizedProvider);

    // If pool is empty or not registered, fall back to single key
    if (!entries || entries.length === 0) {
      return fallbackSingleKey || null;
    }

    const now = Date.now();

    // 1. Refresh exhausted keys whose cooldown TTL has expired
    for (const entry of entries) {
      if (entry.status === "exhausted" && entry.cooldownUntil && now >= entry.cooldownUntil) {
        entry.status = "ok";
        entry.cooldownUntil = undefined;
        console.log(`[CREDENTIAL_POOL] Cooldown expired for ${normalizedProvider} key (${entry.key.substring(0, 8)}...). Resetting to OK.`);
      }
    }

    // 2. Find first healthy key
    const healthyEntry = entries.find((e) => e.status === "ok");
    if (healthyEntry) {
      healthyEntry.usageCount++;
      return healthyEntry.key;
    }

    // Fallback if all keys exhausted/dead
    return fallbackSingleKey || entries[0]?.key || null;
  }

  /**
   * Marks a key as rate-limited/exhausted and returns the next rotated healthy key in <10ms
   */
  public markExhausted(
    provider: string,
    key: string,
    cooldownMs: number = this.defaultCooldownMs,
    fallbackSingleKey?: string
  ): string | null {
    const normalizedProvider = provider.toLowerCase();
    const entries = this.pools.get(normalizedProvider);

    if (!entries || entries.length === 0) {
      return fallbackSingleKey || key;
    }

    const target = entries.find((e) => e.key === key);
    if (target) {
      target.status = "exhausted";
      target.cooldownUntil = Date.now() + cooldownMs;
      console.warn(
        `[CREDENTIAL_POOL] 429 Rate limit detected for ${normalizedProvider} key (${key.substring(0, 8)}...). Cooldown set for ${cooldownMs}ms.`
      );
    }

    // Instantly return next rotated healthy key
    const nextKey = this.getActiveKey(normalizedProvider, fallbackSingleKey);
    console.log(`[CREDENTIAL_POOL] Auto-rotated ${normalizedProvider} to key (${nextKey ? nextKey.substring(0, 8) : "none"}).`);
    return nextKey;
  }

  /**
   * Marks a key as permanently dead (e.g. invalid API key)
   */
  public markDead(provider: string, key: string, fallbackSingleKey?: string): string | null {
    const normalizedProvider = provider.toLowerCase();
    const entries = this.pools.get(normalizedProvider);

    if (entries) {
      const target = entries.find((e) => e.key === key);
      if (target) {
        target.status = "dead";
        console.error(`[CREDENTIAL_POOL] Key marked DEAD for ${normalizedProvider} (${key.substring(0, 8)}...).`);
      }
    }

    return this.getActiveKey(normalizedProvider, fallbackSingleKey);
  }

  /**
   * Gets pool status metrics for a provider or all providers
   */
  public getPoolStatus(provider?: string): Record<string, ProviderPoolStatus> {
    const result: Record<string, ProviderPoolStatus> = {};

    const evaluate = (p: string, entries: CredentialEntry[]) => {
      const healthy = entries.filter((e) => e.status === "ok");
      const exhausted = entries.filter((e) => e.status === "exhausted");
      const dead = entries.filter((e) => e.status === "dead");
      result[p] = {
        totalKeys: entries.length,
        activeKey: healthy[0]?.key || null,
        healthyKeysCount: healthy.length,
        exhaustedKeysCount: exhausted.length,
        deadKeysCount: dead.length,
      };
    };

    if (provider) {
      const p = provider.toLowerCase();
      const entries = this.pools.get(p) || [];
      evaluate(p, entries);
    } else {
      for (const [p, entries] of this.pools.entries()) {
        evaluate(p, entries);
      }
    }

    return result;
  }
}

export const credentialPoolService = new CredentialPoolService();

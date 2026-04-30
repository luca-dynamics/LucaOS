/**
 * Luca Resource Locking System
 * Stolen from Eigent AI's task locking pattern
 *
 * Prevents conflicts when multiple Luca personas work in parallel
 *
 * Example:
 * - Developer Luca modifying auth.ts
 * - Security Luca trying to scan auth.ts
 * → Lock ensures Security waits until Developer finishes
 */

export interface ResourceLockOptions {
  timeout?: number; // ms to wait before timeout (default: 30000)
  maxAge?: number; // ms before lock considered stale (default: 300000)
}

export interface LockMetadata {
  resourceId: string;
  owner: string; // Which Luca persona owns this lock
  acquiredAt: number;
  lastAccessed: number;
  reason?: string;
}

/**
 * Single resource lock with timeout and stale detection
 */
class ResourceLock {
  private resourceId: string;
  private owner: string;
  private acquiredAt: number;
  private lastAccessed: number;
  private reason?: string;
  private resolver?: () => void;
  private lockPromise: Promise<void>;

  constructor(resourceId: string, owner: string, reason?: string) {
    this.resourceId = resourceId;
    this.owner = owner;
    this.acquiredAt = Date.now();
    this.lastAccessed = Date.now();
    this.reason = reason;

    this.lockPromise = new Promise<void>((resolve) => {
      this.resolver = resolve;
    });
  }

  /**
   * Update last accessed time (keep lock fresh)
   */
  touch(): void {
    this.lastAccessed = Date.now();
  }

  /**
   * Get lock age in ms
   */
  getAge(): number {
    return Date.now() - this.acquiredAt;
  }

  /**
   * Check if lock is stale
   */
  isStale(maxAge: number): boolean {
    return Date.now() - this.lastAccessed > maxAge;
  }

  /**
   * Release the lock
   */
  release(): void {
    if (this.resolver) {
      this.resolver();
      this.resolver = undefined;
    }
  }

  /**
   * Wait for lock to be released
   */
  async wait(): Promise<void> {
    await this.lockPromise;
  }

  /**
   * Get metadata
   */
  getMetadata(): LockMetadata {
    return {
      resourceId: this.resourceId,
      owner: this.owner,
      acquiredAt: this.acquiredAt,
      lastAccessed: this.lastAccessed,
      reason: this.reason,
    };
  }
}

/**
 * Resource Lock Manager
 * Manages all locks across Luca's parallel personas
 */
export class ResourceLockManager {
  private locks: Map<string, ResourceLock> = new Map();
  private cleanupInterval?: NodeJS.Timeout;
  private defaultOptions: Required<ResourceLockOptions> = {
    timeout: 30000, // 30 seconds default timeout
    maxAge: 300000, // 5 minutes before considered stale
  };

  constructor(options?: ResourceLockOptions) {
    if (options) {
      this.defaultOptions = { ...this.defaultOptions, ...options };
    }

    // Start periodic cleanup of stale locks
    this.startCleanup();

    console.log("[ResourceLock] Manager initialized", {
      timeout: this.defaultOptions.timeout,
      maxAge: this.defaultOptions.maxAge,
    });
  }

  /**
   * Acquire a lock on a resource
   *
   * @param resourceId - Unique identifier for resource (e.g., file path, API endpoint)
   * @param owner - Who is requesting the lock (e.g., "developer-luca", "security-luca")
   * @param reason - Why lock is needed (for debugging)
   * @param options - Lock options
   * @returns Release function to call when done
   */
  async acquireLock(
    resourceId: string,
    owner: string,
    reason?: string,
    options?: ResourceLockOptions
  ): Promise<() => void> {
    const opts = { ...this.defaultOptions, ...options };
    const lockKey = this.normalizeLockKey(resourceId);

    console.log(`[ResourceLock] ${owner} requesting lock on: ${lockKey}`, {
      reason,
    });

    // Wait for existing lock to be released
    const existingLock = this.locks.get(lockKey);
    if (existingLock) {
      console.log(
        `[ResourceLock] ${owner} waiting for lock on: ${lockKey} (held by ${
          existingLock.getMetadata().owner
        })`
      );

      // Wait with timeout
      const timeoutPromise = new Promise<void>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Lock timeout for ${lockKey}`)),
          opts.timeout
        )
      );

      try {
        await Promise.race([existingLock.wait(), timeoutPromise]);
      } catch (error) {
        console.error(
          `[ResourceLock] Timeout waiting for lock: ${lockKey}`,
          error
        );
        // Force release stale lock
        this.forceRelease(lockKey);
      }
    }

    // Create new lock
    const lock = new ResourceLock(lockKey, owner, reason);
    this.locks.set(lockKey, lock);

    console.log(`[ResourceLock] ${owner} acquired lock on: ${lockKey}`);

    // Return release function
    return () => {
      console.log(`[ResourceLock] ${owner} releasing lock on: ${lockKey}`);
      lock.release();
      this.locks.delete(lockKey);
    };
  }

  /**
   * Try to acquire lock (non-blocking)
   * Returns null if lock is held by someone else
   */
  tryAcquireLock(
    resourceId: string,
    owner: string,
    reason?: string
  ): (() => void) | null {
    const lockKey = this.normalizeLockKey(resourceId);

    if (this.locks.has(lockKey)) {
      console.log(
        `[ResourceLock] ${owner} failed to acquire lock on: ${lockKey} (already held)`
      );
      return null;
    }

    const lock = new ResourceLock(lockKey, owner, reason);
    this.locks.set(lockKey, lock);

    console.log(`[ResourceLock] ${owner} acquired lock on: ${lockKey} (try)`);

    return () => {
      lock.release();
      this.locks.delete(lockKey);
    };
  }

  /**
   * Check if resource is locked
   */
  isLocked(resourceId: string): boolean {
    return this.locks.has(this.normalizeLockKey(resourceId));
  }

  /**
   * Get lock metadata
   */
  getLockInfo(resourceId: string): LockMetadata | null {
    const lock = this.locks.get(this.normalizeLockKey(resourceId));
    return lock ? lock.getMetadata() : null;
  }

  /**
   * Get all active locks
   */
  getAllLocks(): LockMetadata[] {
    return Array.from(this.locks.values()).map((lock) => lock.getMetadata());
  }

  /**
   * Force release a lock (use with caution!)
   */
  forceRelease(resourceId: string): boolean {
    const lockKey = this.normalizeLockKey(resourceId);
    const lock = this.locks.get(lockKey);

    if (lock) {
      console.warn(
        `[ResourceLock] Force releasing lock: ${lockKey}`,
        lock.getMetadata()
      );
      lock.release();
      this.locks.delete(lockKey);
      return true;
    }

    return false;
  }

  /**
   * Cleanup all stale locks
   */
  private cleanupStaleLocks(): void {
    let cleaned = 0;

    for (const [key, lock] of this.locks.entries()) {
      if (lock.isStale(this.defaultOptions.maxAge)) {
        console.warn(`[ResourceLock] Cleaning up stale lock: ${key}`, {
          age: lock.getAge(),
          metadata: lock.getMetadata(),
        });
        lock.release();
        this.locks.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[ResourceLock] Cleaned up ${cleaned} stale locks`);
    }
  }

  /**
   * Start periodic cleanup
   */
  private startCleanup(): void {
    // Run cleanup every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleLocks();
    }, 60000);
  }

  /**
   * Stop cleanup and release all locks (for shutdown)
   */
  async shutdown(): Promise<void> {
    console.log("[ResourceLock] Shutting down lock manager...");

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Release all locks
    for (const [key, lock] of this.locks.entries()) {
      console.log(`[ResourceLock] Releasing lock on shutdown: ${key}`);
      lock.release();
    }

    this.locks.clear();
    console.log("[ResourceLock] Shutdown complete");
  }

  /**
   * Normalize lock key (case-insensitive, trim)
   */
  private normalizeLockKey(resourceId: string): string {
    return resourceId.toLowerCase().trim();
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalLocks: number;
    oldestLock: number | null;
    locks: LockMetadata[];
  } {
    const locks = this.getAllLocks();
    const ages = locks.map((l) => Date.now() - l.acquiredAt);

    return {
      totalLocks: locks.length,
      oldestLock: ages.length > 0 ? Math.max(...ages) : null,
      locks,
    };
  }
}

// Singleton instance
export const resourceLockManager = new ResourceLockManager();

/**
 * Decorator for methods that need resource locking
 */
export function withResourceLock(
  resourceIdGetter: (...args: any[]) => string,
  owner: string
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const resourceId = resourceIdGetter(...args);
      const release = await resourceLockManager.acquireLock(
        resourceId,
        owner,
        `${propertyKey} method call`
      );

      try {
        return await originalMethod.apply(this, args);
      } finally {
        release();
      }
    };

    return descriptor;
  };
}

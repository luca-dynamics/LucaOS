/**
 * Feature Flags Service
 *
 * SAFETY: Kill switch for all new features
 * Can disable any feature instantly
 */

export class FeatureFlags {
  private flags: Record<string, boolean> = {
    agentMode: false, // OFF by default
    agentModeBeta: false, // Beta testing
    agentModeQualityGates: false, // Quality gates
    agentModeVisualVerify: false, // Visual verification
    agentModeSecurityScan: false, // Security scanning
  };

  private storageKey = "luca_feature_flags";

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Check if a feature is enabled
   */
  isEnabled(feature: string): boolean {
    return this.flags[feature] || false;
  }

  /**
   * Enable a feature
   */
  enable(feature: string): void {
    this.flags[feature] = true;
    this.saveToStorage();
    console.log(`[FeatureFlags] Enabled: ${feature}`);
  }

  /**
   * Disable a feature
   */
  disable(feature: string): void {
    this.flags[feature] = false;
    this.saveToStorage();
    console.log(`[FeatureFlags] Disabled: ${feature}`);
  }

  /**
   * EMERGENCY: Disable all features
   */
  disableAll(): void {
    Object.keys(this.flags).forEach((key) => {
      this.flags[key] = false;
    });
    this.saveToStorage();
    console.warn("[FeatureFlags] EMERGENCY: All features disabled");
  }

  /**
   * Get all flag states
   */
  getAll(): Record<string, boolean> {
    return { ...this.flags };
  }

  /**
   * Load flags from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.flags = { ...this.flags, ...parsed };
      }
    } catch (error) {
      console.error("[FeatureFlags] Failed to load from storage:", error);
    }
  }

  /**
   * Save flags to localStorage
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.flags));
    } catch (error) {
      console.error("[FeatureFlags] Failed to save to storage:", error);
    }
  }
}

// Singleton instance
export const featureFlags = new FeatureFlags();

// EMERGENCY KILL SWITCH (accessible from browser console)
if (typeof window !== "undefined") {
  (window as any).LUCA_EMERGENCY_DISABLE = () => {
    console.warn("🚨 EMERGENCY: Disabling all features");
    featureFlags.disableAll();
    window.location.reload();
  };
}

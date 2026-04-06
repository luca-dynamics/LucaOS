import { EventEmitter } from "events";

export interface SystemContext {
  ramTotalGB: number;
  ramFreeGB: number;
  isBatteryPowered: boolean;
  batteryLevel: number;
  isIntelMac: boolean;
  isWindows: boolean;
  diskFreeGB: number;
  cpuLoad: number;
}

export interface MaintenanceRule {
  id: string;
  name: string;
  description: string;
  priority: number;
  enabled: boolean;
}

export type PolicyStatus = "RECOMMENDED" | "RESTRICTED" | "WARNING" | "OPTIMAL";

export interface ModelRecommendation {
  status: PolicyStatus;
  reason: string;
}

class SelfMaintenancePolicy extends EventEmitter {
  private rules: MaintenanceRule[] = [
    {
      id: "mem-safety-floor",
      name: "Memory Safety Floor",
      description: "Prevents booting large models (>4GB) on systems with low RAM (<10GB total).",
      priority: 100,
      enabled: true,
    },
    {
      id: "power-optimized-reasoning",
      name: "Power Optimized Reasoning",
      description: "Prioritizes small parameter models when on battery power (<40%).",
      priority: 80,
      enabled: true,
    },
    {
      id: "sovereign-fallback",
      name: "Sovereign Fallback",
      description: "Automatically switches to Cloud if local model loading latency exceeds 10s.",
      priority: 90,
      enabled: true,
    }
  ];

  public getRules(): MaintenanceRule[] {
    return this.rules;
  }

  public updateRule(id: string, enabled: boolean) {
    const rule = this.rules.find(r => r.id === id);
    if (rule) {
      rule.enabled = enabled;
      this.emit("policy-updated", this.rules);
    }
  }

  /**
   * Evaluates a model against the current hardware context and policies.
   */
  public evaluateModel(modelId: string, context: SystemContext): ModelRecommendation {
    // 1. RAM SAFETY CHECK (The "8GB Hard Floor")
    const isLargeModel = modelId.includes("7b") || modelId.includes("8b") || modelId.includes("27b");
    const isUltraLarge = modelId.includes("70b") || modelId.includes("405b");

    if (context.ramTotalGB < 10 && (isLargeModel || isUltraLarge)) {
      if (this.isRuleEnabled("mem-safety-floor")) {
        return {
          status: "RESTRICTED",
          reason: `System RAM (${context.ramTotalGB}GB) is below the 10GB safety floor for 7B+ models. Use 1.5B or 3B for stability.`
        };
      }
    }

    if (context.ramTotalGB < 32 && isUltraLarge) {
        return {
          status: "RESTRICTED",
          reason: `System RAM (${context.ramTotalGB}GB) is insufficient for 70B+ models.`
        };
    }

    // 2. POWER CHECK
    if (context.isBatteryPowered && context.batteryLevel < 40) {
      if (this.isRuleEnabled("power-optimized-reasoning")) {
        if (modelId.includes("1.5b") || modelId.includes("3b")) {
            return {
              status: "OPTIMAL",
              reason: "Small parameter model recommended for extended battery life."
            };
        }
        return {
          status: "WARNING",
          reason: "High power consumption model on low battery. Consider switching to Qwen 1.5B."
        };
      }
    }

    // 3. HARDWARE-SPECIFIC OPTIMIZATION
    if (context.isIntelMac && modelId.includes("ollama")) {
        return {
            status: "WARNING",
            reason: "Intel Mac detected. GPU acceleration may be limited. Cloud reasoning recommended for complex tasks."
        };
    }

    return {
      status: "RECOMMENDED",
      reason: "Model is compliant with current system policies."
    };
  }

  private isRuleEnabled(id: string): boolean {
    return this.rules.find(r => r.id === id)?.enabled ?? false;
  }
}

export const maintenancePolicy = new SelfMaintenancePolicy();
export default maintenancePolicy;

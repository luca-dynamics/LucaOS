import { EventEmitter } from "events";
import { taskService } from "./taskService";
import { awarenessService } from "./awarenessService";

export interface SystemMetrics {
  memory: {
    total: number;
    free: number;
    used: number;
    percentage: number;
  };
  cpu: {
    load: number;
    percentage: number;
    cores: number;
  };
  timestamp: number;
}

export type GuardType = "FOCUS" | "SYSTEM" | "DEVELOPER";
export type GuardPriority =
  | "AUTONOMOUS"
  | "CRITICAL"
  | "HIGH"
  | "MEDIUM"
  | "LOW";

export interface GuardEvent {
  type: GuardType;
  priority: GuardPriority;
  message: string;
  actionSuggested?: string;
  intent?: string; // New field for autonomous execution
  domain?: string; // New field for autonomous execution
  metadata?: any;
}

class GuardService extends EventEmitter {
  private lastMetrics: SystemMetrics | null = null;
  private thresholds = {
    ram: 90, // percent
    ramCritical: 96, // autonomous threshold
    cpu: 90, // percent
    cpuCritical: 95, // autonomous threshold
    idleMin: 5, // minutes
  };

  constructor() {
    super();
    this.initListeners();
  }

  private initListeners() {
    if ((window as any).electron?.ipcRenderer) {
      (window as any).electron.ipcRenderer.on(
        "system-resource-pulse",
        (_event: any, metrics: SystemMetrics) => {
          if (!metrics || !metrics.memory || !metrics.cpu) return;
          this.lastMetrics = metrics;
          this.checkSystemHealth(metrics);
        },
      );
    }
  }

  private checkSystemHealth(metrics: SystemMetrics) {
    if (metrics.memory.percentage > this.thresholds.ramCritical) {
      this.emit("autonomous-intent", {
        type: "SYSTEM",
        priority: "AUTONOMOUS",
        message: "System memory is critically exhausted. Remediation required.",
        intent:
          "Identify and suspend high-RAM background processes to restore stability.",
        domain: "SYSTEM",
        metadata: { ram: metrics.memory.percentage },
      } as GuardEvent);
    } else if (metrics.memory.percentage > this.thresholds.ram) {
      this.emit("guard-trigger", {
        type: "SYSTEM",
        priority: "HIGH",
        message: "System memory is critically high. Performance may suffer.",
        actionSuggested:
          "Would you like me to identify heavy background processes?",
        metadata: { ram: metrics.memory.percentage },
      } as GuardEvent);
    }

    // New: CPU Check
    if (metrics.cpu.percentage > this.thresholds.cpuCritical) {
      this.emit("autonomous-intent", {
        type: "SYSTEM",
        priority: "AUTONOMOUS",
        message: "CPU is pegged at critical levels.",
        intent:
          "Balance system load by identifying and optimizing runaway processes.",
        domain: "SYSTEM",
        metadata: { cpu: metrics.cpu.percentage },
      } as GuardEvent);
    }
  }

  public async monitorTaskAutonomy() {
    // To be integrated with VisionAmbientLoop
    // If user is stuck on a task sub-step, emit 'autonomous-intent' with TASK domain
  }

  public async monitorEnvironmentAutonomy() {
    // Detect visual clutter or excessive background apps
    // Emit 'autonomous-intent' with ENVIRONMENT domain
  }

  public async analyzeFocus(): Promise<GuardEvent | null> {
    // This is currently handled via AwarenessService -> VisionAnalyzer
    return null;
  }

  public getMetricsContext(): string {
    if (!this.lastMetrics) return "System status unknown.";
    return `System: RAM ${Math.round(this.lastMetrics.memory.percentage)}%, CPU ${Math.round(this.lastMetrics.cpu.percentage)}%`;
  }
}

export const guardService = new GuardService();

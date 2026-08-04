import { RuntimeManager } from "../../voice-engine/src";

export interface PlatformHealthReport {
  overall: "healthy" | "degraded" | "unavailable";
  runtimes: Record<string, string>;
  timestamp: number;
}

export class HealthMonitor {
  constructor(private runtimeManager: RuntimeManager) {}

  public getHealth(): PlatformHealthReport {
    const runtimeReport = this.runtimeManager.health();
    const isDegraded = Object.values(runtimeReport).some((h) => h === "degraded");
    const isUnavailable = Object.values(runtimeReport).some((h) => h === "unavailable");

    let overall: "healthy" | "degraded" | "unavailable" = "healthy";
    if (isUnavailable) overall = "unavailable";
    else if (isDegraded) overall = "degraded";

    return {
      overall,
      runtimes: runtimeReport,
      timestamp: Date.now(),
    };
  }
}

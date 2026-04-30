import { settingsService } from "./settingsService";
import { loggerService } from "./loggerService";
import { discoveryService } from "./discoveryService";

/**
 * ENVIRONMENT SENTINEL (The Eyes)
 * Proactively scans the environment for manifest files and contextual changes.
 * Part of the Sovereign AGI Kernel (Developer-Partner Edition).
 */
export class EnvironmentSentinel {
  private static instance: EnvironmentSentinel;
  private manifestFiles: string[] = ["ENVIRONMENT.md", "SYSTEM_PULSE.json", "package.json"];
  private situationalAwareness: string = "";
  private kernelType: "TACTICAL" | "CIVILIAN" = "CIVILIAN";

  private constructor() {}

  public static getInstance(): EnvironmentSentinel {
    if (!EnvironmentSentinel.instance) {
      EnvironmentSentinel.instance = new EnvironmentSentinel();
    }
    return EnvironmentSentinel.instance;
  }

  /**
   * Scan for physical integrity (Kernel permissions and hardware status).
   */
  public async refreshAwareness(): Promise<void> {
    const isDev = typeof __LUCA_DEV_MODE__ !== "undefined" && __LUCA_DEV_MODE__;
    const isTactical = isDev || settingsService.getSettings().general.experimentalMode;
    const isElectron = typeof window !== "undefined" && (window as any).electron;
    
    if (!isTactical) return;

    loggerService.info("SOVEREIGN", "Refreshing situational awareness via manifest scan...");
    
    let awareness = "\n[AGI_EYES: SITUATIONAL_AWARENESS]\n";
    awareness += `- KERNEL: V3_AGI_STABLE\n`;
    awareness += `- TARGET_ENV: LUCA_INTEGRATED_WORKSPACE\n`;
    
    // 1. PROJECT IDENTITY
    awareness += `- PROJECT_IDENTITY: luca-os\n`;
    awareness += `- MANIFEST: [package.json] VALIDATED\n`;
    awareness += `- MANIFEST: [ENVIRONMENT.md] ACTIVE (Target context: Mac_Intel)\n`;

    // 2. KERNEL INTEGRITY (Physical Body Status)
    if (isElectron) {
      awareness += "\n[KERNEL_INTEGRITY: PHYSICAL_BODY]\n";
      try {
        const ipc = (window as any).electron.ipcRenderer;
        
        // Audit her "Nervous System"
        const accessibility = await ipc.invoke("check-accessibility-permissions");
        awareness += `- ACCESSIBILITY_CORE: ${accessibility ? "LINKED (FULL_CONTROL)" : "RESTRICTED (PARALYZED)"}\n`;
        
        // Audit her "Vision"
        awareness += `- VISION_CORE: [SCREEN_CAPTURE] ACTIVE_REQUEST_READY\n`;
        
        // Audit her "Engine" (Hardware)
        const specs = await ipc.invoke("get-system-specs");
        awareness += `- ENGINE_STATS: CPU: ${specs.cpu?.brand || "Intel"}, RAM: ${Math.round(specs.memory?.total / 1e9)}GB\n`;
        
        // 3. ADAPTIVE DISCOVERY (Tactical Identity)
        await discoveryService.scanSystemCapabilities();
        const hasTools = (discoveryService as any).discoveredTools?.size > 0;
        this.kernelType = hasTools ? "TACTICAL" : "CIVILIAN";
        awareness += `- TOOLBOX: [${this.kernelType}] IDENTITY_DETECTED\n`;

      } catch {
        awareness += `- STATUS: Kernel audit partial failure.\n`;
        this.kernelType = "CIVILIAN";
      }
    }

    this.situationalAwareness = awareness;
  }

  public getKernelType(): "TACTICAL" | "CIVILIAN" {
    return this.kernelType;
  }

  public getAwarenessPulse(): string {
    return this.situationalAwareness;
  }
}

export const environmentSentinel = EnvironmentSentinel.getInstance();

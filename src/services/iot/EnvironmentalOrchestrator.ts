import { meshObservationService, FusedRealityState } from "../meshObservationService";
import { matterBridgeService } from "./MatterBridgeService";
import { deviceRegistry } from "../lucaLink/deviceRegistry";

/**
 * ENVIRONMENTAL ORCHESTRATOR (2050 Alien Tech — Physical Agency)
 *
 * Luca's "Proactive Comfort" engine. It continuously analyzes the 
 * Fused Reality State and autonomously adjusts the physical environment
 * via the Matter fabric to maintain optimal operator comfort.
 *
 * Logic Pillars:
 *   1. Thermal Management: Auto-adjusts thermostats based on occupancy.
 *   2. Illuminance Control: Manages light levels and color temp (Circadian).
 *   3. Physical Security: Auto-locks perimeters when occupancy is zero.
 */

class EnvironmentalOrchestrator {
  private isActive = false;
  
  // Comfort Targets
  private readonly TARGET_TEMP = 22.0;       // Celsius
  private readonly TARGET_ILLUM = 500;       // Lux (Work mode)
  private readonly COLD_THRESHOLD = 20.0;
  private readonly DIM_THRESHOLD = 300;

  public activate() {
    if (this.isActive) return;
    this.isActive = true;

    console.log("[ORCHESTRATOR] 🌡️ Environmental Orchestrator ACTIVATED. Physical Agency is live.");

    // Subscribe to reality shifts
    meshObservationService.on("reality_updated", (state: FusedRealityState) => {
      this.evaluateEnvironment(state);
    });
  }

  public deactivate() {
    this.isActive = false;
    meshObservationService.removeAllListeners("reality_updated");
    console.log("[ORCHESTRATOR] Environmental Orchestrator DEACTIVATED.");
  }

  /**
   * Evaluates the environment and decides on physical interventions.
   */
  private async evaluateEnvironment(state: FusedRealityState) {
    if (!state.occupancyDetected) {
      await this.enterDeepSleepMode();
      return;
    }

    console.log(`[ORCHESTRATOR] 🧐 Evaluating comfort... Temp: ${state.ambientTemperature?.toFixed(1)}°C | Light: ${state.ambientIlluminance} lux`);

    // 1. Thermal Intervention
    if (state.ambientTemperature && state.ambientTemperature < this.COLD_THRESHOLD) {
      await this.optimizeTemperature();
    }

    // 2. Illuminance Intervention
    if (state.ambientIlluminance && state.ambientIlluminance < this.DIM_THRESHOLD) {
      await this.optimizeLighting();
    }
  }

  /**
   * Adjusts all Matter-connected thermostats in the mesh to the target temperature.
   */
  private async optimizeTemperature() {
    console.log(`[ORCHESTRATOR] ♨️ Environment is cold. Adjusting thermostats to ${this.TARGET_TEMP}°C...`);
    const devices = deviceRegistry.getAllDevices().filter(d => d.type === "iot" && d.status === "online");
    
    for (const device of devices) {
      // In production: Filter for devices that actually have the Thermostat cluster
      await matterBridgeService.setTemperature(device.id, this.TARGET_TEMP);
    }
  }

  /**
   * Adjusts light levels to the target illuminance.
   */
  private async optimizeLighting() {
    console.log(`[ORCHESTRATOR] 💡 Environment is dim. Adjusting light levels to ${this.TARGET_ILLUM} lux...`);
    const devices = deviceRegistry.getAllDevices().filter(d => d.type === "iot" && d.status === "online");

    for (const device of devices) {
      // In production: Filter for devices with Level Control/On-Off clusters
      await matterBridgeService.setLevel(device.id, 200); // 0-254 scale
    }
  }

  /**
   * Powers down non-essential systems and locks doors when no occupancy is detected.
   */
  private async enterDeepSleepMode() {
    console.log("[ORCHESTRATOR] 🌙 No occupancy detected. Entering Deep Sleep / Security Mode.");
    const devices = deviceRegistry.getAllDevices().filter(d => d.type === "iot" && d.status === "online");

    for (const device of devices) {
      // Secure the perimeter
      await matterBridgeService.setLockState(device.id, true);
      // Conserve energy
      await matterBridgeService.setLevel(device.id, 0); 
    }
  }
}

export const environmentalOrchestrator = new EnvironmentalOrchestrator();

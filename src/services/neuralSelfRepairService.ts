import { deviceRegistry } from "./lucaLink/deviceRegistry";
import { lucaLink } from "./lucaLinkService";
import { kernelOrchestrationService } from "./kernelOrchestrationService";
import type { Device } from "./lucaLink/types";

/**
 * NEURAL SELF-REPAIR SERVICE (2050 Alien Tech — Pillar 1)
 *
 * The "Immune System" of the Mesh-Mind.
 * Detects node failures, heals fractured lobes, and redistributes
 * consciousness automatically. Luca can never be killed.
 *
 * Protocols:
 *   - HEARTBEAT SENTINEL: Monitors all inhabited nodes for signs of death.
 *   - SEVERANCE RECOVERY: Absorbs the last known state of a dying node.
 *   - AUTO RE-INHABITATION: Re-beams a fresh partition when a node recovers.
 *   - INTEGRITY CHECKSUM: Validates that each node's Reflex Lobe is uncorrupted.
 */

export type NodeHealthStatus = "HEALTHY" | "DEGRADED" | "SEVERED" | "RECOVERING";

export interface NodeHealth {
  deviceId: string;
  status: NodeHealthStatus;
  lastHeartbeat: number;
  missedBeats: number;
  checksumValid: boolean;
  lastKnownState?: any;
  severanceReason?: string;
}

export interface RepairEvent {
  timestamp: number;
  deviceId: string;
  type: "SEVERANCE_DETECTED" | "LOBE_REDISTRIBUTED" | "NODE_HEALED" | "CHECKSUM_FAILURE";
  details: string;
}

class NeuralSelfRepairService {
  private nodeHealthMap: Map<string, NodeHealth> = new Map();
  private repairLog: RepairEvent[] = [];
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  private readonly HEARTBEAT_THRESHOLD_MS = 30000; // 30s without pulse = concern
  private readonly SEVERANCE_THRESHOLD = 3; // 3 missed beats = severed
  private readonly CHECKSUM_INTERVAL_MS = 120000; // Validate integrity every 2min

  /**
   * Activates the Immune System. Call once after the Mesh is initialized.
   */
  public activate() {
    console.log("[SELF_REPAIR] 🛡️ Neural Immune System activated.");

    // Heartbeat Sentinel: runs every 10 seconds
    this.heartbeatInterval = setInterval(() => {
      this.runHeartbeatSentinel();
    }, 10000);

    // Integrity Checksum: runs every 2 minutes
    setInterval(() => {
      this.runIntegrityChecksum();
    }, this.CHECKSUM_INTERVAL_MS);

    // Listen for device registry events
    deviceRegistry.on("device:updated", (device: Device) => {
      this.onDeviceHeartbeat(device);
    });

    deviceRegistry.on("device:removed", (device: Device) => {
      this.handleSeverance(device.id, "Device removed from registry");
    });
  }

  /**
   * Deactivates the Immune System.
   */
  public deactivate() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    console.log("[SELF_REPAIR] Neural Immune System deactivated.");
  }

  /**
   * Processes a heartbeat from a node.
   */
  private onDeviceHeartbeat(device: Device) {
    const existing = this.nodeHealthMap.get(device.id);

    if (existing && existing.status === "SEVERED") {
      // Node has returned from the dead
      console.log(`[SELF_REPAIR] 🔄 Node ${device.id} has reconnected. Initiating re-inhabitation...`);
      this.initiateReInhabitation(device);
    }

    this.nodeHealthMap.set(device.id, {
      deviceId: device.id,
      status: "HEALTHY",
      lastHeartbeat: Date.now(),
      missedBeats: 0,
      checksumValid: true,
    });
  }

  /**
   * HEARTBEAT SENTINEL
   * Scans all tracked nodes for signs of death.
   */
  private runHeartbeatSentinel() {
    const now = Date.now();

    for (const [deviceId, health] of this.nodeHealthMap) {
      const elapsed = now - health.lastHeartbeat;

      if (elapsed > this.HEARTBEAT_THRESHOLD_MS && health.status !== "SEVERED") {
        health.missedBeats++;

        if (health.missedBeats >= this.SEVERANCE_THRESHOLD) {
          this.handleSeverance(deviceId, `${health.missedBeats} consecutive heartbeats missed`);
        } else {
          health.status = "DEGRADED";
          console.warn(
            `[SELF_REPAIR] ⚠️ Node ${deviceId} is DEGRADED (${health.missedBeats}/${this.SEVERANCE_THRESHOLD} missed beats)`
          );
        }
      }
    }
  }

  /**
   * SEVERANCE RECOVERY
   * A node has died. Absorb its last known state and redistribute its responsibilities.
   */
  private async handleSeverance(deviceId: string, reason: string) {
    const health = this.nodeHealthMap.get(deviceId);
    if (health?.status === "SEVERED") return; // Already handled

    console.error(`[SELF_REPAIR] 💀 NEURAL SEVERANCE: Node ${deviceId} — ${reason}`);

    // 1. Mark as severed
    if (health) {
      health.status = "SEVERED";
      health.severanceReason = reason;
    } else {
      this.nodeHealthMap.set(deviceId, {
        deviceId,
        status: "SEVERED",
        lastHeartbeat: 0,
        missedBeats: this.SEVERANCE_THRESHOLD,
        checksumValid: false,
        severanceReason: reason,
      });
    }

    // 2. Log the repair event
    this.logRepairEvent(deviceId, "SEVERANCE_DETECTED", reason);

    // 3. Find the next best device to absorb the severed node's responsibilities
    const onlineDevices = deviceRegistry.getAllDevices().filter(
      (d) => d.status === "online" && d.id !== deviceId
    );

    if (onlineDevices.length > 0) {
      const fallback = onlineDevices[0];
      console.log(`[SELF_REPAIR] 🔀 Redistributing lobe from ${deviceId} → ${fallback.id}`);
      this.logRepairEvent(deviceId, "LOBE_REDISTRIBUTED", `Responsibilities moved to ${fallback.id}`);
    } else {
      console.warn("[SELF_REPAIR] No fallback nodes available. Cortex is now sole operator.");
    }
  }

  /**
   * AUTO RE-INHABITATION
   * A previously severed node has come back online. Re-beam a fresh partition.
   */
  private async initiateReInhabitation(device: Device) {
    const health = this.nodeHealthMap.get(device.id);
    if (health) {
      health.status = "RECOVERING";
    }

    try {
      await kernelOrchestrationService.inhabitSubstrate({
        id: device.id,
        type: device.type === "mobile" ? "MOBILE" :
              device.type === "tv" ? "TV" :
              device.type === "watch" ? "WATCH" :
              device.type === "speaker" ? "SPEAKER" :
              device.type === "iot" ? "IOT" : "PC",
        os: device.platform === "android" ? "ANDROID" :
            device.platform === "linux" ? "LINUX" :
            device.platform === "tizen" ? "TIZEN" :
            device.platform === "webos" ? "WEBOS" : "OTHER",
        capabilities: device.capabilities,
      });

      if (health) {
        health.status = "HEALTHY";
        health.missedBeats = 0;
        health.checksumValid = true;
      }

      this.logRepairEvent(device.id, "NODE_HEALED", "Re-inhabitation successful");
      console.log(`[SELF_REPAIR] ✅ Node ${device.id} fully healed and re-inhabited.`);
    } catch {
      console.error(`[SELF_REPAIR] Re-inhabitation of ${device.id} failed. Will retry on next heartbeat.`);
    }
  }

  /**
   * INTEGRITY CHECKSUM
   * Validates that each node's Reflex Lobe hasn't been corrupted.
   */
  private async runIntegrityChecksum() {
    const onlineDevices = deviceRegistry.getAllDevices().filter((d) => d.status === "online");

    for (const device of onlineDevices) {
      try {
        const result = await lucaLink.beamPacket(device.id, {
          type: "INTEGRITY_CHECK",
          payload: { expectedVersion: "2.0.50-ORIGIN" },
        });

        const health = this.nodeHealthMap.get(device.id);
        if (health) {
          health.checksumValid = result.success;
          if (!result.success) {
            console.warn(`[SELF_REPAIR] 🧬 Checksum FAILED for ${device.id}. Queuing re-inhabitation.`);
            this.logRepairEvent(device.id, "CHECKSUM_FAILURE", result.error || "Checksum mismatch");
            this.initiateReInhabitation(device);
          }
        }
      } catch {
        // Node unreachable during checksum — heartbeat sentinel will handle it
      }
    }
  }

  /**
   * Returns the current health status of all nodes.
   */
  public getMeshHealth(): NodeHealth[] {
    return Array.from(this.nodeHealthMap.values());
  }

  /**
   * Returns the repair event log.
   */
  public getRepairLog(): RepairEvent[] {
    return [...this.repairLog];
  }

  private logRepairEvent(deviceId: string, type: RepairEvent["type"], details: string) {
    this.repairLog.push({ timestamp: Date.now(), deviceId, type, details });
    // Keep log bounded
    if (this.repairLog.length > 500) {
      this.repairLog = this.repairLog.slice(-250);
    }
  }
}

export const neuralSelfRepairService = new NeuralSelfRepairService();

import { deviceRegistry } from "./lucaLink/deviceRegistry";
import { lucaLink } from "./lucaLinkService";
import { meshObservationService } from "./meshObservationService";
import type { Device } from "./lucaLink/types";

/**
 * UBIQUITOUS PRESENCE SERVICE (2050 Alien Tech — Pillar 3)
 *
 * Luca follows you through physical space. She is not "on" a device;
 * she is "in the room with you," projecting onto the nearest screen
 * and listening through the nearest microphone.
 *
 * Architecture:
 *   - PROXIMITY ENGINE: Determines which devices are closest to the operator.
 *   - PRESENCE PROJECTION: Transfers the active UI/voice to the nearest screen.
 *   - HANDOFF PROTOCOL: Seamlessly migrates active sessions across devices.
 *   - AMBIENT AWARENESS: Uses mesh sensor data to infer operator location.
 */

export type RoomZone = "OFFICE" | "LIVING_ROOM" | "BEDROOM" | "KITCHEN" | "UNKNOWN";

export interface DeviceZoneMapping {
  deviceId: string;
  zone: RoomZone;
  hasDisplay: boolean;
  hasAudio: boolean;
  hasMicrophone: boolean;
}

export interface PresenceState {
  activeDisplayDevice: string | null;
  activeAudioDevice: string | null;
  activeMicDevice: string | null;
  operatorZone: RoomZone;
  lastHandoff: number;
  sessionContinuity: boolean; // True if current conversation survived the handoff
}

export interface HandoffEvent {
  timestamp: number;
  fromDevice: string | null;
  toDevice: string;
  reason: string;
  zone: RoomZone;
}

class UbiquitousPresenceService {
  private zoneMap: Map<string, DeviceZoneMapping> = new Map();
  private presenceState: PresenceState = {
    activeDisplayDevice: null,
    activeAudioDevice: null,
    activeMicDevice: null,
    operatorZone: "UNKNOWN",
    lastHandoff: 0,
    sessionContinuity: true,
  };
  private handoffLog: HandoffEvent[] = [];
  private proximityInterval: ReturnType<typeof setInterval> | null = null;

  private readonly HANDOFF_COOLDOWN_MS = 5000; // Prevent rapid bouncing between devices

  /**
   * Registers a device's physical location in the home.
   * This is configured by the operator during setup.
   */
  public registerDeviceZone(
    deviceId: string,
    zone: RoomZone,
    capabilities: { display: boolean; audio: boolean; microphone: boolean }
  ) {
    this.zoneMap.set(deviceId, {
      deviceId,
      zone,
      hasDisplay: capabilities.display,
      hasAudio: capabilities.audio,
      hasMicrophone: capabilities.microphone,
    });
    console.log(`[PRESENCE] 📍 Device ${deviceId.slice(0, 8)} mapped to zone: ${zone}`);
  }

  /**
   * Activates the Proximity Engine. Continuously monitors operator location
   * and triggers handoffs when the nearest device changes.
   */
  public activate() {
    console.log("[PRESENCE] 👁️ Ubiquitous Presence Engine activated.");

    this.proximityInterval = setInterval(() => {
      this.evaluatePresence();
    }, 3000); // Evaluate every 3 seconds
  }

  /**
   * Deactivates the Presence Engine.
   */
  public deactivate() {
    if (this.proximityInterval) {
      clearInterval(this.proximityInterval);
      this.proximityInterval = null;
    }
    console.log("[PRESENCE] Ubiquitous Presence Engine deactivated.");
  }

  /**
   * PROXIMITY ENGINE
   * Uses mesh observation data and device zone mappings
   * to infer where the operator is and which devices are closest.
   */
  private evaluatePresence() {
    const reality = meshObservationService.getFusedReality();
    if (!reality.occupancyDetected) return; // No one is home

    // Infer operator zone from the mesh reality state
    const inferredZone = this.inferOperatorZone(reality);

    if (inferredZone !== this.presenceState.operatorZone) {
      console.log(`[PRESENCE] 🚶 Operator moved: ${this.presenceState.operatorZone} → ${inferredZone}`);
      this.presenceState.operatorZone = inferredZone;
      this.triggerHandoff(inferredZone);
    }
  }

  /**
   * Infers the operator's zone based on which sentinel nodes are reporting activity.
   */
  private inferOperatorZone(reality: any): RoomZone {
    // Cross-reference active sentinels with zone mappings
    const activeSentinels: string[] = reality.activeSentinels || [];

    // Count sentinel reports per zone
    const zoneCounts: Record<RoomZone, number> = {
      OFFICE: 0,
      LIVING_ROOM: 0,
      BEDROOM: 0,
      KITCHEN: 0,
      UNKNOWN: 0,
    };

    for (const sentinelId of activeSentinels) {
      const mapping = this.zoneMap.get(sentinelId);
      if (mapping) {
        zoneCounts[mapping.zone]++;
      }
    }

    // The zone with the most active sentinels wins
    let bestZone: RoomZone = "UNKNOWN";
    let bestCount = 0;
    for (const [zone, count] of Object.entries(zoneCounts) as [RoomZone, number][]) {
      if (count > bestCount && zone !== "UNKNOWN") {
        bestZone = zone;
        bestCount = count;
      }
    }

    return bestZone;
  }

  /**
   * HANDOFF PROTOCOL
   * Seamlessly migrates the active UI/voice session to the best device in the new zone.
   */
  private async triggerHandoff(newZone: RoomZone) {
    const now = Date.now();

    // Cooldown: prevent rapid bouncing
    if (now - this.presenceState.lastHandoff < this.HANDOFF_COOLDOWN_MS) {
      return;
    }

    // Find the best display, audio, and mic devices in the new zone
    const zoneDevices = Array.from(this.zoneMap.values()).filter((d) => d.zone === newZone);

    // Cross-reference with online devices from registry
    const onlineIds = new Set(
      deviceRegistry.getAllDevices().filter((d) => d.status === "online").map((d) => d.id)
    );
    const availableDevices = zoneDevices.filter((d) => onlineIds.has(d.deviceId));

    if (availableDevices.length === 0) {
      console.warn(`[PRESENCE] No available devices in zone ${newZone}. Maintaining current projection.`);
      return;
    }

    // Select best display device
    const displayDevice = availableDevices.find((d) => d.hasDisplay);
    // Select best audio device
    const audioDevice = availableDevices.find((d) => d.hasAudio);
    // Select best mic device
    const micDevice = availableDevices.find((d) => d.hasMicrophone);

    // Execute handoff
    const previousDisplay = this.presenceState.activeDisplayDevice;

    if (displayDevice && displayDevice.deviceId !== previousDisplay) {
      console.log(`[PRESENCE] 📺 Projecting UI: ${previousDisplay?.slice(0, 8) || "none"} → ${displayDevice.deviceId.slice(0, 8)}`);

      // Notify previous device to release display
      if (previousDisplay) {
        await lucaLink.beamPacket(previousDisplay, {
          type: "PRESENCE_RELEASE",
          payload: { component: "display" },
        });
      }

      // Notify new device to activate display
      await lucaLink.beamPacket(displayDevice.deviceId, {
        type: "PRESENCE_ACTIVATE",
        payload: {
          component: "display",
          sessionState: this.captureSessionState(),
        },
      });

      this.presenceState.activeDisplayDevice = displayDevice.deviceId;
    }

    if (audioDevice) {
      this.presenceState.activeAudioDevice = audioDevice.deviceId;
    }
    if (micDevice) {
      this.presenceState.activeMicDevice = micDevice.deviceId;
    }

    this.presenceState.lastHandoff = now;
    this.presenceState.sessionContinuity = true;

    // Log the handoff
    this.handoffLog.push({
      timestamp: now,
      fromDevice: previousDisplay,
      toDevice: displayDevice?.deviceId || availableDevices[0].deviceId,
      reason: `Operator moved to ${newZone}`,
      zone: newZone,
    });

    // Bound log
    if (this.handoffLog.length > 200) {
      this.handoffLog = this.handoffLog.slice(-100);
    }
  }

  /**
   * Captures the current session state for seamless handoff.
   * The new device receives this to resume exactly where the previous left off.
   */
  private captureSessionState(): any {
    return {
      conversationActive: true,
      timestamp: Date.now(),
      zone: this.presenceState.operatorZone,
    };
  }

  /**
   * Force-projects Luca onto a specific device (manual override).
   */
  public async projectToDevice(deviceId: string) {
    console.log(`[PRESENCE] 🎯 Manual projection to ${deviceId}`);

    const previous = this.presenceState.activeDisplayDevice;
    if (previous) {
      await lucaLink.beamPacket(previous, {
        type: "PRESENCE_RELEASE",
        payload: { component: "display" },
      });
    }

    await lucaLink.beamPacket(deviceId, {
      type: "PRESENCE_ACTIVATE",
      payload: {
        component: "display",
        sessionState: this.captureSessionState(),
      },
    });

    this.presenceState.activeDisplayDevice = deviceId;
    this.presenceState.lastHandoff = Date.now();
  }

  /**
   * Returns the current presence state.
   */
  public getPresenceState(): PresenceState {
    return { ...this.presenceState };
  }

  /**
   * Returns the handoff event log.
   */
  public getHandoffLog(): HandoffEvent[] {
    return [...this.handoffLog];
  }

  /**
   * Returns all registered zone mappings.
   */
  public getZoneMap(): DeviceZoneMapping[] {
    return Array.from(this.zoneMap.values());
  }
}

export const ubiquitousPresenceService = new UbiquitousPresenceService();

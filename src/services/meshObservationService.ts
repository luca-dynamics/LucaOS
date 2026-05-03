import { EventEmitter } from "events";
import { deviceRegistry } from "./lucaLink/deviceRegistry";
import { lucaLink } from "./lucaLinkService";

/**
 * MESH OBSERVATION SERVICE (2050 Alien Tech)
 * Fuses sensor data from all inhabited kernels into a singular "God-View."
 * Implements Distributed Neural Perception.
 */
export interface SensorPacket {
  deviceId: string;
  timestamp: number;
  type: "AUDIO_REFLEX" | "VISUAL_SENTINEL" | "TELEMETRY" | "MATTER_STATE";
  payload: {
    ambientDecibels?: number;
    detectedFaces?: number;
    motionVectors?: any;
    location?: { lat: number; lng: number };
    battery?: number;
    // Matter Environmental Data
    temperature?: number;
    illuminance?: number;
    occupancy?: boolean;
  };
}

export interface FusedRealityState {
  occupancyDetected: boolean;
  userPosition?: "LIVING_ROOM" | "OFFICE" | "BEDROOM" | "UNKNOWN";
  ambientNoiseLevel: number; // Avg across mesh
  ambientTemperature?: number;
  ambientIlluminance?: number;
  meshIntegrity: number; // 0-100
  activeSentinels: string[];
}

class MeshObservationService extends EventEmitter {
  private nodeStates: Map<string, SensorPacket> = new Map();
  private realityState: FusedRealityState = {
    occupancyDetected: false,
    ambientNoiseLevel: 0,
    meshIntegrity: 0,
    activeSentinels: [],
  };

  constructor() {
    super();
  }

  /**
   * Registers a sensor packet from an inhabited node.
   */
  public registerNodePulse(packet: SensorPacket) {
    this.nodeStates.set(packet.deviceId, packet);
    this.processMeshFusion();
  }

  /**
   * Fuses all node pulses into a singular reality state.
   */
  private processMeshFusion() {
    const nodes = Array.from(this.nodeStates.values());
    if (nodes.length === 0) return;

    // 1. Calculate Ambient Noise Floor (Fused)
    const totalNoise = nodes.reduce((acc, n) => acc + (n.payload.ambientDecibels || 0), 0);
    this.realityState.ambientNoiseLevel = totalNoise / nodes.length;

    // 2. Detect Occupancy (Cross-Kernel Consensus)
    const faceCount = nodes.reduce((acc, n) => acc + (n.payload.detectedFaces || 0), 0);
    const matterOccupancy = nodes.some(n => n.payload.occupancy === true);
    this.realityState.occupancyDetected = faceCount > 0 || matterOccupancy || this.realityState.ambientNoiseLevel > 45;

    // 3. Environmental Fusion (Matter)
    const tempNodes = nodes.filter(n => n.payload.temperature !== undefined);
    if (tempNodes.length > 0) {
      this.realityState.ambientTemperature = tempNodes.reduce((acc, n) => acc + (n.payload.temperature || 0), 0) / tempNodes.length;
    }

    const illumNodes = nodes.filter(n => n.payload.illuminance !== undefined);
    if (illumNodes.length > 0) {
      this.realityState.ambientIlluminance = illumNodes.reduce((acc, n) => acc + (n.payload.illuminance || 0), 0) / illumNodes.length;
    }

    // 4. Mesh Health
    this.realityState.meshIntegrity = Math.min(100, nodes.length * 20);
    this.realityState.activeSentinels = nodes.map(n => n.deviceId);

    // 5. Emit reality shift for subscribers (EnvironmentalOrchestrator, etc.)
    this.emit("reality_updated", this.realityState);

    console.log("[MESH_OBSERVATION] 👁️ Reality Fused:", this.realityState);
  }

  /**
   * Returns the current "God-View" of the environment.
   */
  public getFusedReality(): FusedRealityState {
    return { ...this.realityState };
  }

  /**
   * Commands the entire mesh to enter "High-Alert" observation mode.
   */
  public async setMeshAlertLevel(level: "IDLE" | "VIGILANT" | "SENTINEL") {
    console.log(`[MESH_OBSERVATION] 🚨 Escalating Mesh Alert Level to: ${level}`);
    
    const devices = deviceRegistry.getAllDevices().filter(d => d.status === "online");
    
    for (const device of devices) {
      await lucaLink.beamPacket(device.id, {
        type: "SENSOR_ALERT_LEVEL",
        payload: { level }
      });
    }
  }
}

export const meshObservationService = new MeshObservationService();

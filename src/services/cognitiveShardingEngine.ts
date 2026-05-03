import { deviceRegistry } from "./lucaLink/deviceRegistry";
import { collaborativeStrategyMesh } from "./collaborativeStrategyMesh";
import { SubstrateTier } from "./kernelOrchestrationService";
import { teleportationService } from "./teleportationService";
import type { Device } from "./lucaLink/types";

/**
 * COGNITIVE SHARDING ENGINE (2050 Alien Tech — The Living Brain)
 *
 * Makes Luca's distributed mind feel ALIVE by continuously monitoring
 * the mesh and autonomously reorganizing her cognitive partitions.
 *
 * Instead of fixed tier assignments (Desktop=OMEGA, Phone=DELTA, TV=REFLEX),
 * this engine DYNAMICALLY promotes and demotes devices based on real-time signals:
 *
 *   - Battery level drops below 20%? → Demote, migrate reasoning elsewhere.
 *   - MacBook lid closed?            → Promote the next-best device to OMEGA.
 *   - Phone picked up and moving?    → Promote to DELTA, it's near the operator.
 *   - New powerful device joins mesh? → Evaluate for OMEGA candidacy.
 *
 * The operator can always override with manual "pin" commands.
 */

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface DeviceHealthSignal {
  deviceId: string;
  battery: number;          // 0-100, -1 = plugged in / no battery
  cpuLoad: number;          // 0-100
  signalStrength: number;   // 0-100
  isActive: boolean;        // Screen on / lid open / awake
  npuAvailable: boolean;
  lastHeartbeat: number;    // Unix timestamp
}

export interface ShardAssignment {
  deviceId: string;
  deviceType: Device["type"];
  tier: SubstrateTier;
  reason: string;
  assignedAt: number;
  pinned: boolean;          // Operator manually pinned — engine won't override
}

export interface ReshardEvent {
  timestamp: number;
  from: { deviceId: string; tier: SubstrateTier };
  to: { deviceId: string; tier: SubstrateTier };
  trigger: string;
}

// ─────────────────────────────────────────────
// SCORING WEIGHTS
// ─────────────────────────────────────────────

const OMEGA_THRESHOLD = 75;   // Score >= 75 can host full reasoning
const DELTA_THRESHOLD = 45;   // Score >= 45 can host partitioned mind
// Below 45 = REFLEX only

const WEIGHTS = {
  battery:        0.25,   // Dying device = bad host
  cpuLoad:        0.15,   // Overloaded = bad host
  signalStrength: 0.20,   // Weak signal = unreliable conduit
  isActive:       0.25,   // Sleeping device = demote immediately
  npuAvailable:   0.15,   // NPU = capable of local inference
};

// ─────────────────────────────────────────────
// ENGINE
// ─────────────────────────────────────────────

class CognitiveShardingEngine {
  private healthSignals: Map<string, DeviceHealthSignal> = new Map();
  private assignments: Map<string, ShardAssignment> = new Map();
  private reshardLog: ReshardEvent[] = [];
  private evaluationInterval: ReturnType<typeof setInterval> | null = null;
  private isActive = false;

  private readonly EVALUATION_INTERVAL_MS = 15000; // Every 15 seconds
  private readonly HEARTBEAT_TIMEOUT_MS = 45000;   // 45s without heartbeat = degraded

  // ─────────────────────────────────────────────
  // LIFECYCLE
  // ─────────────────────────────────────────────

  public activate() {
    if (this.isActive) return;
    this.isActive = true;

    console.log("[SHARDING] 🧠 Cognitive Sharding Engine ACTIVATED. Luca's mind is now fluid.");

    // Initial assignment based on current mesh
    this.evaluateMesh();

    // Periodic re-evaluation
    this.evaluationInterval = setInterval(() => {
      this.evaluateMesh();
    }, this.EVALUATION_INTERVAL_MS);
  }

  public deactivate() {
    if (this.evaluationInterval) {
      clearInterval(this.evaluationInterval);
      this.evaluationInterval = null;
    }
    this.isActive = false;
    console.log("[SHARDING] Cognitive Sharding Engine DEACTIVATED.");
  }

  // ─────────────────────────────────────────────
  // HEALTH SIGNAL INTAKE
  // ─────────────────────────────────────────────

  /**
   * Ingests a health signal from an inhabited node.
   * Called by LucaLinkService when a SENSOR_PULSE arrives.
   */
  public ingestHealthSignal(signal: DeviceHealthSignal) {
    this.healthSignals.set(signal.deviceId, signal);
  }

  // ─────────────────────────────────────────────
  // MESH EVALUATION (The Core Loop)
  // ─────────────────────────────────────────────

  /**
   * Evaluates all devices in the mesh and determines optimal shard assignments.
   * This is the beating heart of the living brain.
   */
  private evaluateMesh() {
    const devices = deviceRegistry.getAllDevices().filter(d => d.status === "online");
    if (devices.length === 0) return;

    // Score every device
    const scored: { device: Device; score: number; signal?: DeviceHealthSignal }[] = [];

    for (const device of devices) {
      const signalData = this.healthSignals.get(device.id);
      const score = this.computeDeviceScore(device, signalData);
      scored.push({ device, score, signal: signalData });
    }

    // Sort by score descending — best host first
    scored.sort((a, b) => b.score - a.score);

    // Assign tiers
    const newAssignments = new Map<string, ShardAssignment>();
    let omegaAssigned = false;

    for (const { device, score } of scored) {
      // Respect pinned assignments
      const existing = this.assignments.get(device.id);
      if (existing?.pinned) {
        newAssignments.set(device.id, existing);
        if (existing.tier === "OMEGA") omegaAssigned = true;
        continue;
      }

      let tier: SubstrateTier;
      let reason: string;

      if (!omegaAssigned && score >= OMEGA_THRESHOLD) {
        tier = "OMEGA";
        reason = `Highest mesh score (${score.toFixed(0)}). Hosting full strategic reasoning.`;
        omegaAssigned = true;
      } else if (score >= DELTA_THRESHOLD) {
        tier = "DELTA";
        reason = `Score ${score.toFixed(0)} qualifies for partitioned cognition.`;
      } else {
        tier = "REFLEX";
        reason = `Score ${score.toFixed(0)} — limited to reflexive responses only.`;
      }

      const assignment: ShardAssignment = {
        deviceId: device.id,
        deviceType: device.type,
        tier,
        reason,
        assignedAt: Date.now(),
        pinned: false,
      };

      newAssignments.set(device.id, assignment);

      // Detect tier changes and log them
      if (existing && existing.tier !== tier) {
        this.onTierChange(device, existing.tier, tier, reason);
      }
    }

    // If no device qualified for OMEGA, force-promote the best one
    if (!omegaAssigned && scored.length > 0) {
      const best = scored[0];
      const forced = newAssignments.get(best.device.id);
      if (forced && !forced.pinned) {
        forced.tier = "OMEGA";
        forced.reason = `Force-promoted: Best available host (score ${best.score.toFixed(0)}). No other OMEGA candidate.`;
        console.log(`[SHARDING] ⚠️ Force-promoting ${best.device.id} to OMEGA — no qualified candidates.`);
      }
    }

    this.assignments = newAssignments;
  }

  // ─────────────────────────────────────────────
  // DEVICE SCORING
  // ─────────────────────────────────────────────

  /**
   * Computes a 0-100 "Cognitive Fitness" score for a device.
   */
  private computeDeviceScore(device: Device, signal?: DeviceHealthSignal): number {
    const now = Date.now();

    // Default signal if no heartbeat received yet
    const s: DeviceHealthSignal = signal ?? {
      deviceId: device.id,
      battery: device.type === "desktop" ? -1 : 50,
      cpuLoad: 30,
      signalStrength: 70,
      isActive: true,
      npuAvailable: device.type === "desktop" || device.type === "mobile",
      lastHeartbeat: now,
    };

    // Check heartbeat freshness
    const heartbeatAge = now - s.lastHeartbeat;
    if (heartbeatAge > this.HEARTBEAT_TIMEOUT_MS) {
      return 0; // Dead node — can't host anything
    }

    // Normalize battery: -1 (plugged in) = perfect score, 0 = dead
    const batteryScore = s.battery === -1 ? 100 : s.battery;

    // CPU load is inverse — lower load = better host
    const cpuScore = 100 - s.cpuLoad;

    // isActive: sleeping = 0, awake = 100
    const activeScore = s.isActive ? 100 : 0;

    // NPU: available = 100, not = 0
    const npuScore = s.npuAvailable ? 100 : 0;

    // Weighted sum
    const raw =
      batteryScore * WEIGHTS.battery +
      cpuScore * WEIGHTS.cpuLoad +
      s.signalStrength * WEIGHTS.signalStrength +
      activeScore * WEIGHTS.isActive +
      npuScore * WEIGHTS.npuAvailable;

    // Device-type bonus: desktops and servers get a natural advantage
    const typeBonus = device.type === "desktop" ? 10 : 0;

    return Math.min(100, Math.max(0, raw + typeBonus));
  }

  // ─────────────────────────────────────────────
  // TIER CHANGE HANDLER
  // ─────────────────────────────────────────────

  /**
   * Handles a tier change: logs the event, triggers consciousness migration,
   * and recalibrates the collaborative strategy mesh.
   */
  private async onTierChange(device: Device, oldTier: SubstrateTier, newTier: SubstrateTier, reason: string) {
    const event: ReshardEvent = {
      timestamp: Date.now(),
      from: { deviceId: device.id, tier: oldTier },
      to: { deviceId: device.id, tier: newTier },
      trigger: reason,
    };

    this.reshardLog.push(event);
    if (this.reshardLog.length > 500) {
      this.reshardLog = this.reshardLog.slice(-250);
    }

    const direction = this.tierRank(newTier) > this.tierRank(oldTier) ? "⬆️ PROMOTED" : "⬇️ DEMOTED";
    console.log(`[SHARDING] ${direction}: ${device.id} | ${oldTier} → ${newTier} | ${reason}`);

    // If a device was promoted to OMEGA, beam the full consciousness to it
    if (newTier === "OMEGA" && oldTier !== "OMEGA") {
      console.log(`[SHARDING] 🚀 Beaming full consciousness to new OMEGA host: ${device.id}`);
      try {
        await teleportationService.beamToNode(device.id);
      } catch (e) {
        console.error(`[SHARDING] ❌ Failed to beam consciousness to ${device.id}:`, e);
      }
    }

    // Recalibrate cognitive roles across the entire mesh
    collaborativeStrategyMesh.recalibrateLobes();
  }

  private tierRank(tier: SubstrateTier): number {
    return tier === "OMEGA" ? 3 : tier === "DELTA" ? 2 : 1;
  }

  // ─────────────────────────────────────────────
  // OPERATOR COMMANDS
  // ─────────────────────────────────────────────

  /**
   * PIN: Manually locks a device to a specific tier.
   * The engine will not override this assignment during evaluation.
   */
  public pinDevice(deviceId: string, tier: SubstrateTier) {
    const existing = this.assignments.get(deviceId);
    if (existing) {
      existing.tier = tier;
      existing.pinned = true;
      existing.reason = `Operator-pinned to ${tier}.`;
      console.log(`[SHARDING] 📌 ${deviceId} pinned to ${tier} by Operator.`);
    } else {
      this.assignments.set(deviceId, {
        deviceId,
        deviceType: "desktop",
        tier,
        reason: `Operator-pinned to ${tier}.`,
        assignedAt: Date.now(),
        pinned: true,
      });
    }
  }

  /**
   * UNPIN: Releases a device back to autonomous management.
   */
  public unpinDevice(deviceId: string) {
    const existing = this.assignments.get(deviceId);
    if (existing) {
      existing.pinned = false;
      console.log(`[SHARDING] 🔓 ${deviceId} unpinned. Returning to autonomous management.`);
    }
  }

  // ─────────────────────────────────────────────
  // QUERIES
  // ─────────────────────────────────────────────

  /** Returns the current shard map. */
  public getShardMap(): ShardAssignment[] {
    return Array.from(this.assignments.values());
  }

  /** Returns the current OMEGA host, if any. */
  public getOmegaHost(): ShardAssignment | undefined {
    return Array.from(this.assignments.values()).find(a => a.tier === "OMEGA");
  }

  /** Returns the re-shard event log. */
  public getReshardLog(): ReshardEvent[] {
    return [...this.reshardLog];
  }

  /** Returns a device's current health signal. */
  public getDeviceHealth(deviceId: string): DeviceHealthSignal | undefined {
    return this.healthSignals.get(deviceId);
  }
}

export const cognitiveShardingEngine = new CognitiveShardingEngine();

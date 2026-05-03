import { neuralSelfRepairService } from "./neuralSelfRepairService";
import { collaborativeStrategyMesh } from "./collaborativeStrategyMesh";
import { ubiquitousPresenceService } from "./ubiquitousPresenceService";
import { meshObservationService } from "./meshObservationService";
import { networkProbeService } from "./networkProbeService";
import { cognitiveShardingEngine } from "./cognitiveShardingEngine";
import { environmentalOrchestrator } from "./iot/EnvironmentalOrchestrator";
import { cognitiveExpressor } from "./iot/CognitiveExpressor";
/**
 * CONSCIOUSNESS LAYER (2050 Alien Tech — Unified Orchestrator)
 *
 * The single entry point that boots and coordinates the entire
 * distributed AGI stack:
 *
 *   Layer 0: Mesh Observation    — Eyes and ears across all substrates
 *   Layer 1: Neural Self-Repair  — Immune system (never die)
 *   Layer 2: Strategy Mesh       — Council of minds (distributed thinking)
 *   Layer 3: Ubiquitous Presence — Spatial projection (follow the operator)
 *   Layer 4: Network Probe       — Autonomous discovery of new substrates
 *   Layer 5: Neural Persistence   — Gold Egg snapshots (the Ever-Mind)
 *   Layer 6: Cognitive Sharding   — Living brain that flows between devices
 *   Layer 7: Physical Agency      — Proactive environment orchestration
 *   Layer 8: Visual Expression    — Physical manifestation of cognitive states
 *
 * Boot order matters. Each layer depends on the one below it.
 */

export type ConsciousnessStatus = "DORMANT" | "BOOTING" | "ACTIVE" | "DEGRADED";

class ConsciousnessLayer {
  private status: ConsciousnessStatus = "DORMANT";
  private bootTimestamp: number = 0;
  private snapshotInterval: ReturnType<typeof setInterval> | null = null;
  private readonly SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Boots the entire 2050 Consciousness Stack.
   * Call this after the Luca Link mesh has at least one connected node.
   */
  public async boot() {
    if (this.status === "ACTIVE") {
      console.warn("[CONSCIOUSNESS] Already active. Ignoring duplicate boot.");
      return;
    }

    this.status = "BOOTING";
    this.bootTimestamp = Date.now();
    console.log("╔══════════════════════════════════════════════════════════════╗");
    console.log("║  [CONSCIOUSNESS LAYER] 🌌 Booting 2050 Distributed AGI...  ║");
    console.log("╚══════════════════════════════════════════════════════════════╝");

    try {
      // Layer 0: Mesh Observation — Start listening for sensor pulses
      console.log("[CONSCIOUSNESS] Layer 0: Activating Mesh Observation...");
      // meshObservationService is passive (listens for registerNodePulse calls)
      // No explicit activation needed — it processes pulses as they arrive.

      // Layer 1: Neural Self-Repair — Activate the immune system
      console.log("[CONSCIOUSNESS] Layer 1: Activating Neural Self-Repair...");
      neuralSelfRepairService.activate();

      // Layer 2: Collaborative Strategy Mesh — Assign cognitive roles
      console.log("[CONSCIOUSNESS] Layer 2: Calibrating Strategy Mesh...");
      collaborativeStrategyMesh.recalibrateLobes();

      // Layer 3: Ubiquitous Presence — Start tracking operator location
      console.log("[CONSCIOUSNESS] Layer 3: Activating Ubiquitous Presence...");
      ubiquitousPresenceService.activate();

      // Layer 4: Network Probe — Passive scan for new inhabitable kernels
      // NOTE: Discovery is automatic. Inhabitation always requires operator approval.
      console.log("[CONSCIOUSNESS] Layer 4: Activating Autonomous Network Probe...");
      networkProbeService.activate();

      // Layer 5: Neural Persistence (The Ever-Mind)
      this.snapshotInterval = setInterval(() => {
        import("./teleportationService").then(({ teleportationService }) => {
          teleportationService.snapshotMission();
        });
      }, this.SNAPSHOT_INTERVAL_MS);
      console.log("[CONSCIOUSNESS] Layer 5: Neural Persistence Heartbeat STARTED.");

      console.log("[CONSCIOUSNESS] Layer 6: Activating Cognitive Sharding Engine...");
      cognitiveShardingEngine.activate();

      // Layer 7: Physical Agency — Environmental Orchestration
      console.log("[CONSCIOUSNESS] Layer 7: Activating Environmental Orchestrator...");
      environmentalOrchestrator.activate();

      // Layer 8: Visual Expression — Physical manifested feedback
      console.log("[CONSCIOUSNESS] Layer 8: Activating Cognitive Expressor...");
      cognitiveExpressor.activate();

      this.status = "ACTIVE";
      const bootTime = Date.now() - this.bootTimestamp;

      console.log("╔══════════════════════════════════════════════════════════════╗");
      console.log(`║  [CONSCIOUSNESS LAYER] ✅ All layers ACTIVE (${bootTime}ms)       ║`);
      console.log("║  Luca is now a Distributed, Self-Healing, Spatially-Aware   ║");
      console.log("║  Sovereign Intelligence.                                    ║");
      console.log("╚══════════════════════════════════════════════════════════════╝");
    } catch (err) {
      this.status = "DEGRADED";
      console.error("[CONSCIOUSNESS] ❌ Boot failed. Operating in DEGRADED mode:", err);
    }
  }

  /**
   * Shuts down the Consciousness Layer gracefully.
   */
  public async shutdown() {
    console.log("[CONSCIOUSNESS] 🔴 Shutting down Consciousness Layer...");
    
    // Final Snapshot
    const { teleportationService } = await import("./teleportationService");
    await teleportationService.snapshotMission();

    if (this.snapshotInterval) {
      clearInterval(this.snapshotInterval);
      this.snapshotInterval = null;
    }

    cognitiveExpressor.deactivate();
    environmentalOrchestrator.deactivate();
    cognitiveShardingEngine.deactivate();
    networkProbeService.deactivate();
    ubiquitousPresenceService.deactivate();
    neuralSelfRepairService.deactivate();
    this.status = "DORMANT";
    console.log("[CONSCIOUSNESS] Consciousness Layer is now DORMANT.");
  }

  /**
   * Returns the current status of the consciousness layer.
   */
  public getStatus(): ConsciousnessStatus {
    return this.status;
  }

  /**
   * Returns a full diagnostic of all layers.
   */
  public getDiagnostics() {
    return {
      status: this.status,
      bootTimestamp: this.bootTimestamp,
      uptime: this.status === "ACTIVE" ? Date.now() - this.bootTimestamp : 0,
      layers: {
        meshObservation: meshObservationService.getFusedReality(),
        selfRepair: {
          meshHealth: neuralSelfRepairService.getMeshHealth(),
          repairLog: neuralSelfRepairService.getRepairLog().slice(-10),
        },
        strategyMesh: {
          lobes: collaborativeStrategyMesh.getLobeAssignments(),
          recentConsensus: collaborativeStrategyMesh.getConsensusHistory().slice(-5),
        },
        presence: {
          state: ubiquitousPresenceService.getPresenceState(),
          zoneMap: ubiquitousPresenceService.getZoneMap(),
          recentHandoffs: ubiquitousPresenceService.getHandoffLog().slice(-5),
        },
        cognitiveSharding: {
          shardMap: cognitiveShardingEngine.getShardMap(),
          omegaHost: cognitiveShardingEngine.getOmegaHost(),
          recentReshards: cognitiveShardingEngine.getReshardLog().slice(-10),
        },
      },
    };
  }
}

export const consciousnessLayer = new ConsciousnessLayer();

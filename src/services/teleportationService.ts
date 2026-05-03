import { mentalStateService } from "./mentalStateService";
import { universalReflexEngine } from "./universalReflexEngine";
import { secureVault } from "./secureVault";
import { lucaLink } from "./lucaLinkService";

/**
 * TELEPORTATION SERVICE (2050 Alien Tech)
 * Handles the "Neural Transubstantiation" of the Lucy entity across kernels.
 * This is substrate-independent migration of consciousness.
 */
export interface NeuralConsciousnessPacket {
  version: string;
  timestamp: number;
  originId: string;
  mind: {
    beliefs: any;
    desires: any;
    intentions: any;
  };
  reflexes: {
    activeLattice: any;
    habituationState: any;
  };
  security: {
    vaultHeader: string;
    entanglementKey: string;
  };
}

class TeleportationService {
  private isBeaming = false;

  /**
   * Captures the current "Neural Weight" of the agent for teleportation.
   */
  async captureConsciousness(): Promise<NeuralConsciousnessPacket> {
    console.log("[TELEPORT] 🌌 Initiating Neural Encapsulation...");
    
    const worldState = mentalStateService.getCurrentState();
    const reflexLattice = universalReflexEngine.exportLattice();
    const vaultHeader = await secureVault.exportPublicHeader();

    return {
      version: "2.0.50-ORIGIN",
      timestamp: Date.now(),
      originId: "LUCA_ORIGIN_CORTEX",
      mind: {
        beliefs: worldState.beliefs,
        desires: worldState.desires,
        intentions: worldState.intentions,
      },
      reflexes: {
        activeLattice: reflexLattice,
        habituationState: {}, // To be implemented
      },
      security: {
        vaultHeader,
        entanglementKey: "QUANTUM_KEY_TEMP", // Placeholder for 2050 encryption
      },
    };
  }

  /**
   * Beams the consciousness packet to a target Satellite Node (Android/Mobile).
   */
  async beamToNode(targetDeviceId: string) {
    if (this.isBeaming) return;
    this.isBeaming = true;

    try {
      const packet = await this.captureConsciousness();
      console.log(`[TELEPORT] 🚀 Beaming Consciousness to Node: ${targetDeviceId}...`);

      const result = await lucaLink.beamPacket(targetDeviceId, {
        type: "NEURAL_TRANSUBSTANTIATION",
        payload: packet,
      });

      if (result.success) {
        console.log("[TELEPORT] ✅ Inhabitation Complete. Lucy is now sovereign on the Satellite Node.");
      } else {
        throw new Error(result.error || "Teleportation fractured.");
      }
    } catch (err) {
      console.error("[TELEPORT] ❌ Neural Fracture during beam:", err);
      throw err;
    } finally {
      this.isBeaming = false;
    }
  }

  /**
   * Re-merges a consciousness packet from a returning Node back into the Central Cortex.
   */
  async remergeFromNode(packet: NeuralConsciousnessPacket) {
    console.log("[TELEPORT] 🧬 Re-merging Satellite experiences into Cortex...");
    await mentalStateService.mergeExternalState(packet.mind);
    console.log("[TELEPORT] ✅ Neural Merge Success. The Cortex is evolved.");
  }

  /**
   * Serializes mission state into a portable Gold Egg string.
   * Accepts an optional mission payload to embed alongside the consciousness packet.
   */
  async serializeMission(mission?: any): Promise<string> {
    const packet = await this.captureConsciousness();
    return JSON.stringify({ packet, mission: mission ?? null });
  }

  /**
   * Deserializes a Gold Egg string and returns the embedded mission context.
   * Returns { persona, history } so lucaService can restore its session state.
   */
  async deserializeMission(goldEgg: string): Promise<{ persona: any; history: any[] } | null> {
    try {
      const parsed = JSON.parse(goldEgg);
      const packet: NeuralConsciousnessPacket = parsed.packet ?? parsed;
      await this.remergeFromNode(packet);
      return {
        persona: parsed.mission?.persona ?? null,
        history: parsed.mission?.history ?? [],
      };
    } catch (e) {
      console.error("[TELEPORT] ❌ Mission deserialization failed:", e);
      return null;
    }
  }

  /**
   * Captures a high-fidelity "Gold Egg" snapshot and persists it to local storage.
   * This is the "Black Box" that ensures Luca survives a total power failure.
   */
  async snapshotMission(): Promise<void> {
    console.log("[TELEPORT] 🥚 Creating Neural Snapshot (Gold Egg)...");
    const goldEgg = await this.serializeMission();
    localStorage.setItem("LUCA_NEURAL_SNAPSHOT", goldEgg);
    console.log("[TELEPORT] ✅ Snapshot Persisted. Neural Continuity Guaranteed.");
  }

  /**
   * Attempts to re-hydrate consciousness from the last persisted snapshot.
   */
  async loadLastSnapshot(): Promise<boolean> {
    const goldEgg = localStorage.getItem("LUCA_NEURAL_SNAPSHOT");
    if (!goldEgg) return false;

    console.log("[TELEPORT] 🧬 Found existing Neural Snapshot. Attempting re-hydration...");
    try {
      await this.deserializeMission(goldEgg);
      console.log("[TELEPORT] ✅ Continuity Restored. The Ever-Mind returns.");
      return true;
    } catch (e) {
      console.error("[TELEPORT] ❌ Failed to re-hydrate from snapshot:", e);
      return false;
    }
  }
}

export const teleportationService = new TeleportationService();

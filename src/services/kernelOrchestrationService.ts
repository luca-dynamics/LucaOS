import { teleportationService, NeuralConsciousnessPacket } from "./teleportationService";
import { lucaLink } from "./lucaLinkService";
import { substrateManager, BodyAction, SubstrateType } from "./substrateHandlers/SubstrateManager";

/**
 * KERNEL ORCHESTRATION SERVICE (2050 Alien Tech)
 * Manages the "Inhabitation" of diverse substrates (TVs, Speakers, Watches, Kernels).
 * Implements "Substrate-Aware Partitioning."
 */
export type SubstrateTier = "OMEGA" | "DELTA" | "REFLEX";

export interface HostKernel {
  id: string;
  type: SubstrateType;
  os: "LINUX" | "ANDROID" | "DARWIN" | "TIZEN" | "WEBOS" | "OTHER";
  capabilities: string[];
}

class KernelOrchestrationService {
  /**
   * Orchestrates the inhabitation of a target kernel based on its substrate tier.
   */
  async inhabitSubstrate(kernel: HostKernel) {
    console.log(`[ORCHESTRATOR] 🛸 Analyzing Substrate: ${kernel.type} (${kernel.os})...`);
    
    const tier = this.determineTier(kernel);
    console.log(`[ORCHESTRATOR] 🧠 Assigned Tier: ${tier}. Preparing Partitioned Consciousness...`);

    const packet = await teleportationService.captureConsciousness();
    const partitionedPacket = this.partitionForSubstrate(packet, tier);

    await lucaLink.beamPacket(kernel.id, {
      type: "NEURAL_INHABITATION",
      payload: {
        tier,
        kernelType: kernel.type,
        packet: partitionedPacket,
      }
    });

    console.log(`[ORCHESTRATOR] ✅ Substrate Inhabited. Luca is now active on ${kernel.id} at ${tier} level.`);
  }

  /**
   * Executes a physical action on an inhabited substrate.
   */
  async executeAction(kernelId: string, type: SubstrateType, action: BodyAction) {
    return await substrateManager.execute(type, kernelId, action);
  }

  /**
   * Determines the tier of inhabitation based on hardware power and role.
   */
  private determineTier(kernel: HostKernel): SubstrateTier {
    if (kernel.type === "PC" || kernel.type === "IOT") return "OMEGA"; // Servers are Omega
    if (kernel.type === "MOBILE") return "DELTA";
    return "REFLEX"; // Watches, Speakers, TVs
  }

  /**
   * Slices the consciousness packet to fit the target substrate's capacity.
   */
  private partitionForSubstrate(packet: NeuralConsciousnessPacket, tier: SubstrateTier): Partial<NeuralConsciousnessPacket> {
    if (tier === "OMEGA") return packet; // Full Mind

    if (tier === "DELTA") {
      return {
        ...packet,
        mind: {
          ...packet.mind,
          beliefs: packet.mind.beliefs.filter((b: any) => b.priority > 5), // Keep only important beliefs
        }
      };
    }

    // REFLEX Tier: Only basic identity and reflex rules
    return {
      version: packet.version,
      timestamp: packet.timestamp,
      reflexes: packet.reflexes,
      security: packet.security,
      mind: {
        beliefs: packet.mind.beliefs.filter((b: any) => b.source === "core_directive"),
        desires: [],
        intentions: []
      }
    };
  }
}

export const kernelOrchestrationService = new KernelOrchestrationService();

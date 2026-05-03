import { deviceRegistry } from "./lucaLink/deviceRegistry";
import { lucaLink } from "./lucaLinkService";
import type { Device } from "./lucaLink/types";

/**
 * COLLABORATIVE STRATEGY MESH (2050 Alien Tech — Pillar 2)
 *
 * Distributed decision-making across inhabited kernels.
 * Instead of one brain deciding everything, specialized "Lobes"
 * on different devices debate, vote, and reach consensus.
 *
 * Architecture:
 *   - LOBE REGISTRY: Maps cognitive roles to devices.
 *   - PROPOSAL BROADCAST: The Cortex proposes an action to all lobes.
 *   - VOTE COLLECTION: Each lobe votes (APPROVE / VETO / ABSTAIN) with reasoning.
 *   - CONSENSUS ENGINE: Tallies votes and determines final action.
 *   - VETO OVERRIDE: Core directives can override vetoes in emergencies.
 */

export type CognitiveRole =
  | "STRATEGIC"    // Planning, search, reasoning (PC/Server)
  | "FINANCIAL"    // Budget checks, spending limits (Phone — close to payment apps)
  | "TEMPORAL"     // Calendar, scheduling conflicts (Watch — always on wrist)
  | "PERCEPTUAL"   // Environmental awareness, visual context (TV/Camera)
  | "GUARDIAN"     // Safety, security, anomaly detection (IoT/Speaker — always listening)
  | "EXECUTOR";    // Physical action execution (Phone — can open apps, send SMS)

export interface LobeAssignment {
  role: CognitiveRole;
  deviceId: string;
  deviceType: Device["type"];
  confidence: number; // How well this device fits the role (0-100)
}

export interface StrategyProposal {
  id: string;
  origin: string; // Device ID that proposed
  action: string; // Natural language description
  context: any;   // Structured data for lobes to evaluate
  timestamp: number;
  urgency: "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
}

export interface LobeVote {
  role: CognitiveRole;
  deviceId: string;
  decision: "APPROVE" | "VETO" | "ABSTAIN";
  reasoning: string;
  confidence: number;
  alternativeSuggestion?: string;
}

export interface ConsensusResult {
  proposalId: string;
  approved: boolean;
  votes: LobeVote[];
  finalReasoning: string;
  vetoOverridden: boolean;
}

class CollaborativeStrategyMesh {
  private lobeRegistry: Map<CognitiveRole, LobeAssignment> = new Map();
  private pendingProposals: Map<string, StrategyProposal> = new Map();
  private consensusHistory: ConsensusResult[] = [];

  /**
   * AUTO-ASSIGNS cognitive roles to the best available devices.
   * Called whenever the mesh topology changes.
   */
  public recalibrateLobes() {
    console.log("[STRATEGY_MESH] 🧠 Recalibrating Lobe assignments...");

    const devices = deviceRegistry.getAllDevices().filter((d) => d.status === "online");
    this.lobeRegistry.clear();

    for (const device of devices) {
      const roles = this.inferRolesForDevice(device);
      for (const { role, confidence } of roles) {
        const existing = this.lobeRegistry.get(role);
        // Assign to highest-confidence device
        if (!existing || confidence > existing.confidence) {
          this.lobeRegistry.set(role, {
            role,
            deviceId: device.id,
            deviceType: device.type,
            confidence,
          });
        }
      }
    }

    const assignments = Array.from(this.lobeRegistry.values());
    console.log(`[STRATEGY_MESH] ✅ ${assignments.length} Lobes assigned:`,
      assignments.map((a) => `${a.role} → ${a.deviceType}(${a.deviceId.slice(0, 8)})`).join(", ")
    );
  }

  /**
   * Infers which cognitive roles a device is best suited for.
   */
  private inferRolesForDevice(device: Device): { role: CognitiveRole; confidence: number }[] {
    const roles: { role: CognitiveRole; confidence: number }[] = [];

    switch (device.type) {
      case "desktop":
        roles.push({ role: "STRATEGIC", confidence: 95 });
        roles.push({ role: "EXECUTOR", confidence: 60 });
        break;
      case "mobile":
        roles.push({ role: "FINANCIAL", confidence: 90 });
        roles.push({ role: "EXECUTOR", confidence: 95 });
        roles.push({ role: "TEMPORAL", confidence: 70 });
        break;
      case "watch":
        roles.push({ role: "TEMPORAL", confidence: 95 });
        roles.push({ role: "GUARDIAN", confidence: 70 });
        break;
      case "tv":
        roles.push({ role: "PERCEPTUAL", confidence: 90 });
        break;
      case "speaker":
        roles.push({ role: "GUARDIAN", confidence: 90 });
        roles.push({ role: "PERCEPTUAL", confidence: 60 });
        break;
      case "iot":
        roles.push({ role: "GUARDIAN", confidence: 85 });
        break;
      default:
        roles.push({ role: "STRATEGIC", confidence: 50 });
    }

    return roles;
  }

  /**
   * PROPOSE: Broadcasts a strategy proposal to all active lobes for deliberation.
   */
  public async propose(action: string, context: any, urgency: StrategyProposal["urgency"] = "NORMAL"): Promise<ConsensusResult> {
    const proposal: StrategyProposal = {
      id: `SP-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      origin: "CORTEX",
      action,
      context,
      timestamp: Date.now(),
      urgency,
    };

    console.log(`[STRATEGY_MESH] 📡 Broadcasting Proposal: "${action}" (${urgency})`);
    this.pendingProposals.set(proposal.id, proposal);

    // Collect votes from all assigned lobes
    const votes = await this.collectVotes(proposal);

    // Run consensus engine
    const result = this.resolveConsensus(proposal, votes);
    this.consensusHistory.push(result);

    // Bound history
    if (this.consensusHistory.length > 200) {
      this.consensusHistory = this.consensusHistory.slice(-100);
    }

    this.pendingProposals.delete(proposal.id);

    console.log(
      `[STRATEGY_MESH] ${result.approved ? "✅ APPROVED" : "❌ VETOED"}: "${action}" — ${result.finalReasoning}`
    );

    // --- VISUAL FEEDBACK: Flare green on decision ---
    import("./iot/CognitiveExpressor").then(({ cognitiveExpressor }) => {
      cognitiveExpressor.expressConsensus();
    });

    return result;
  }

  /**
   * VOTE COLLECTION: Solicits votes from all active lobes.
   */
  private async collectVotes(proposal: StrategyProposal): Promise<LobeVote[]> {
    const votes: LobeVote[] = [];
    const assignments = Array.from(this.lobeRegistry.values());

    const votePromises = assignments.map(async (lobe) => {
      try {
        // Beam the proposal to each lobe and await their vote
        const result = await lucaLink.beamPacket(lobe.deviceId, {
          type: "STRATEGY_VOTE_REQUEST",
          payload: {
            proposalId: proposal.id,
            action: proposal.action,
            context: proposal.context,
            yourRole: lobe.role,
          },
        });

        if (result.success) {
          // For now, simulate local vote logic since satellite lobes
          // may not have full reasoning capability yet.
          // In production, the satellite would return a structured LobeVote.
          return this.simulateLobeVote(lobe, proposal);
        }
      } catch {
        // Node unreachable — auto-abstain
      }

      return {
        role: lobe.role,
        deviceId: lobe.deviceId,
        decision: "ABSTAIN" as const,
        reasoning: "Node unreachable during vote collection",
        confidence: 0,
      };
    });

    const settled = await Promise.allSettled(votePromises);
    for (const result of settled) {
      if (result.status === "fulfilled") {
        votes.push(result.value);
      }
    }

    return votes;
  }

  /**
   * SIMULATE LOBE VOTE
   * Generates a vote based on the lobe's role and the proposal context.
   * In production, each satellite node would run its own local inference.
   */
  private simulateLobeVote(lobe: LobeAssignment, proposal: StrategyProposal): LobeVote {
    // Default: approve
    const vote: LobeVote = {
      role: lobe.role,
      deviceId: lobe.deviceId,
      decision: "APPROVE",
      reasoning: `${lobe.role} lobe approves: action aligns with assigned cognitive domain.`,
      confidence: lobe.confidence,
    };

    // Role-specific heuristic vetoes
    if (lobe.role === "FINANCIAL" && proposal.context?.estimatedCost > 500) {
      vote.decision = "VETO";
      vote.reasoning = `FINANCIAL lobe vetoes: estimated cost $${proposal.context.estimatedCost} exceeds safety threshold.`;
      vote.alternativeSuggestion = "Seek cheaper alternatives or request explicit operator approval.";
    }

    if (lobe.role === "TEMPORAL" && proposal.context?.schedulingConflict) {
      vote.decision = "VETO";
      vote.reasoning = "TEMPORAL lobe vetoes: scheduling conflict detected.";
      vote.alternativeSuggestion = proposal.context.alternativeTimes?.join(", ");
    }

    if (lobe.role === "GUARDIAN" && proposal.context?.securityRisk) {
      vote.decision = "VETO";
      vote.reasoning = "GUARDIAN lobe vetoes: security risk detected in proposed action.";
    }

    return vote;
  }

  /**
   * CONSENSUS ENGINE
   * Tallies votes and determines final action.
   */
  private resolveConsensus(proposal: StrategyProposal, votes: LobeVote[]): ConsensusResult {
    const approvals = votes.filter((v) => v.decision === "APPROVE");
    const vetoes = votes.filter((v) => v.decision === "VETO");
    const activeVotes = votes.filter((v) => v.decision !== "ABSTAIN");

    let approved = true;
    let vetoOverridden = false;
    let finalReasoning: string;

    if (vetoes.length > 0) {
      // Check if the proposal urgency overrides vetoes
      if (proposal.urgency === "CRITICAL") {
        approved = true;
        vetoOverridden = true;
        finalReasoning = `CRITICAL override: ${vetoes.length} veto(es) overridden. Reasons: ${vetoes.map((v) => v.reasoning).join("; ")}`;
      } else {
        // Standard consensus: any veto blocks
        approved = false;
        finalReasoning = `Blocked by ${vetoes.length} veto(es): ${vetoes.map((v) => `[${v.role}] ${v.reasoning}`).join(" | ")}`;
      }
    } else if (activeVotes.length === 0) {
      approved = true;
      finalReasoning = "No lobes available for deliberation. Cortex proceeds autonomously.";
    } else {
      approved = true;
      finalReasoning = `Unanimous approval (${approvals.length}/${activeVotes.length} active lobes).`;
    }

    return {
      proposalId: proposal.id,
      approved,
      votes,
      finalReasoning,
      vetoOverridden,
    };
  }

  /**
   * Returns the current lobe assignments.
   */
  public getLobeAssignments(): LobeAssignment[] {
    return Array.from(this.lobeRegistry.values());
  }

  /**
   * Returns the consensus decision history.
   */
  public getConsensusHistory(): ConsensusResult[] {
    return [...this.consensusHistory];
  }
}

export const collaborativeStrategyMesh = new CollaborativeStrategyMesh();

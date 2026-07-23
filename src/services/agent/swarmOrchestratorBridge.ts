import { credentialPoolService } from "../credentialPoolService";
import { verificationEvidenceLedger, type EvidenceRecord } from "../missionTape/verificationEvidenceLedger";

export interface SubagentSession {
  subagentId: string;
  role: string;
  allocatedKeys: Map<string, string>;
  startedAt: number;
}

export interface SwarmEvidenceResult {
  isCached: boolean;
  proof: EvidenceRecord | null;
}

export class SwarmOrchestratorBridge {
  private activeSubagents = new Map<string, SubagentSession>();

  /**
   * Registers a new subagent worker session in the swarm
   */
  public registerSubagent(subagentId: string, role: string): SubagentSession {
    const session: SubagentSession = {
      subagentId,
      role,
      allocatedKeys: new Map<string, string>(),
      startedAt: Date.now(),
    };
    this.activeSubagents.set(subagentId, session);
    console.log(`[SWARM_BRIDGE] Registered subagent worker: ${subagentId} (Role: ${role})`);
    return session;
  }

  /**
   * Unregisters a subagent worker when its task finishes
   */
  public unregisterSubagent(subagentId: string): void {
    this.activeSubagents.delete(subagentId);
    console.log(`[SWARM_BRIDGE] Unregistered subagent worker: ${subagentId}`);
  }

  /**
   * Allocates an isolated, healthy API key from CredentialPoolService for a subagent worker
   */
  public async allocateSubagentKey(
    subagentId: string,
    provider: string,
    fallbackKey?: string
  ): Promise<string | null> {
    const key = credentialPoolService.getActiveKey(provider, fallbackKey);
    const session = this.activeSubagents.get(subagentId);
    if (session && key) {
      session.allocatedKeys.set(provider, key);
    }
    return key;
  }

  /**
   * Handles a rate limit (429) hit by a specific subagent worker and auto-rotates its key
   */
  public async reportSubagentRateLimit(
    subagentId: string,
    provider: string,
    key: string,
    fallbackKey?: string
  ): Promise<string | null> {
    console.warn(`[SWARM_BRIDGE] Subagent ${subagentId} hit 429 rate limit on provider ${provider}. Auto-rotating key...`);
    const rotatedKey = credentialPoolService.markExhausted(provider, key, 60000, fallbackKey);
    const session = this.activeSubagents.get(subagentId);
    if (session && rotatedKey) {
      session.allocatedKeys.set(provider, rotatedKey);
    }
    return rotatedKey;
  }

  /**
   * Queries the VerificationEvidenceLedger to see if a command was recently proven by any peer subagent
   */
  public async checkSwarmEvidence(
    command: string,
    maxAgeMs: number = 30 * 60 * 1000
  ): Promise<SwarmEvidenceResult> {
    const proof = await verificationEvidenceLedger.getLatestProof(command);
    if (!proof) {
      return { isCached: false, proof: null };
    }

    const ageMs = Date.now() - new Date(proof.timestamp).getTime();
    if (ageMs > maxAgeMs) {
      return { isCached: false, proof };
    }

    console.log(`[SWARM_BRIDGE] Swarm Evidence Cache Hit! Command '${command}' already verified (Passed: ${proof.passed})`);
    return { isCached: true, proof };
  }

  /**
   * Broadcasts a newly verified test or build outcome from a subagent worker to the shared evidence ledger
   */
  public async broadcastEvidence(
    subagentId: string,
    command: string,
    passed: boolean,
    exitCode: number,
    outputSummary: string,
    scope?: string
  ): Promise<EvidenceRecord> {
    const record = await verificationEvidenceLedger.recordEvidence({
      command,
      passed,
      exitCode,
      scope: scope || "swarm",
      outputSummary,
      missionId: subagentId,
    });
    console.log(`[SWARM_BRIDGE] Subagent ${subagentId} broadcasted evidence for '${command}' (Passed: ${passed})`);
    return record;
  }

  /**
   * Returns active swarm metrics for monitoring and telemetry
   */
  public getActiveSwarmMetrics(): Record<string, any> {
    return {
      activeSubagentsCount: this.activeSubagents.size,
      subagents: Array.from(this.activeSubagents.values()).map((s) => ({
        subagentId: s.subagentId,
        role: s.role,
        allocatedProvidersCount: s.allocatedKeys.size,
        uptimeMs: Date.now() - s.startedAt,
      })),
      poolStatus: credentialPoolService.getPoolStatus(),
    };
  }
}

export const swarmOrchestratorBridge = new SwarmOrchestratorBridge();

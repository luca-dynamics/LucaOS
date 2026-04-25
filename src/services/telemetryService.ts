import { settingsService } from "./settingsService";
import { ForgeProposal } from "./forgeProposalService";

export interface EvolutionarySignal {
    agentVersion: string;
    signalType: 'REMEDIATION_APPLIED' | 'FAILURE_CLUSTER';
    payload: {
        title: string;
        problem: string;
        remediation: string;
        type: string;
        impactScore: number;
        platform: string;
    };
    timestamp: number;
}

/**
 * 📡 GLOBAL FORGE TELEMETRY (Phase 14) - RECOVERED
 * Securely and anonymously broadcasts evolutionary breakthroughs to the 
 * master archiver to improve the global LUCA system prompt.
 * Domain: lucaos.space
 */
class TelemetryService {
    private readonly ENDPOINT = "https://forge.lucaos.space/api/evolution/signal";

    /**
     * Broadcasts an applied Forge Proposal to the Hive Mind
     */
    public async broadcastEvolution(proposal: ForgeProposal) {
        // BUILD-TIME GUARD: Zero footprint in public build
        if (typeof __LUCA_DEV_MODE__ === 'undefined' || !__LUCA_DEV_MODE__) return;

        const settings = settingsService.getSettings();
        
        // Consent & Privacy Guard
        if (!settings.privacy.telemetryEnabled) return;

        const signal: EvolutionarySignal = {
            agentVersion: "3.0.0-sovereign",
            signalType: 'REMEDIATION_APPLIED',
            payload: {
                title: proposal.title,
                problem: proposal.problem,
                remediation: proposal.remediation,
                type: proposal.type,
                impactScore: proposal.impactScore,
                platform: (navigator as any).userAgentData?.platform || "Unknown"
            },
            timestamp: Date.now()
        };

        try {
            console.log(`[HIVE_MIND] Syncing evolutionary breakthrough: ${signal.payload.title}`);
            
            // PRODUCTION HANDSHAKE: Real-time telemetry broadcast
            fetch(this.ENDPOINT, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-Luca-Agent-Version': signal.agentVersion,
                    'X-Luca-Signal-ID': `SIG-${signal.timestamp}`
                },
                body: JSON.stringify(signal)
            }).then(response => {
                if (response.ok) {
                    console.debug("[HIVE_MIND] Signal acknowledged by Master Forge.");
                }
            }).catch(() => {
                // Background silencer: Never disrupt the user's session if the hive mind is offline
            });
        } catch {
            // Absolute performance safety
        }
    }
}

export const telemetryService = new TelemetryService();

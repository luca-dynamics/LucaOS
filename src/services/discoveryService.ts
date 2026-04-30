import { thoughtStreamService } from './thoughtStreamService';
import { forgeProposalService } from './forgeProposalService';

/**
 * 🛰️ THE EXPLORER (Phase 13) - RECOVERED
 * Scans the developer's environment and codebase for new technical capabilities.
 * PROTECTED: This service activates during Dev Mode OR if Experimental Mode is enabled in UI.
 */
class DiscoveryService {
    private isScanning: boolean = false;
    private discoveredTools: Set<string> = new Set();

    constructor() {
        console.log("[THE_EXPLORER] Discovery Service Active. sensing kernel...");
    }

    /**
     * Scans the system path for high-value CLI tools that are not yet agentized.
     */
    public async scanSystemCapabilities() {
        if (this.isScanning) return;

        this.isScanning = true;
        thoughtStreamService.pushThought("REASONING", "🛰️ THE EXPLORER: Proactively scanning host environment for new capabilities...");

        const priorityTools = ['git', 'docker', 'ffmpeg', 'sqlite3', 'python3', 'node', 'jq', 'curl'];
        const found: string[] = [];

        for (const tool of priorityTools) {
            try {
                const isAvailable = await this.checkBinaryAvailability(tool);
                if (isAvailable && !this.discoveredTools.has(tool)) {
                    found.push(tool);
                }
            } catch {
                // Ignore errors
            }
        }

        if (found.length > 0) {
            this.proposeNewCapabilities(found);
        }

        this.isScanning = false;
    }

    private async checkBinaryAvailability(tool: string): Promise<boolean> {
        if (typeof window !== 'undefined' && (window as any).electron) {
            try {
                return await (window as any).electron.ipcRenderer.invoke('check-command', tool);
            } catch {
                return false;
            }
        }
        return false;
    }

    private proposeNewCapabilities(tools: string[]) {
        tools.forEach(tool => {
            this.discoveredTools.add(tool);
            
            // Phase 6: Propose differently based on persona
            const isTactical = localStorage.getItem("LUCA_USER_TACTICAL") === "true";
            
            forgeProposalService.generateSyntheticProposal({
                title: isTactical ? `Bridge discovered: ${tool.toUpperCase()}` : `Body Synthesis: ${tool.toUpperCase()}`,
                problem: isTactical 
                    ? `Detected ${tool} in host, but no BDI bridge exists.` 
                    : `I have identified a missing sensory organ (${tool}). My cognitive reach is limited without it.`,
                remediation: isTactical 
                    ? `Create BDI tool wrapper for '${tool}'.` 
                    : `Integrate ${tool} into my core system.`,
                type: 'CAPABILITY_GAP',
                impactScore: 7,
                meta: { binary: tool }
            });
        });
    }

    public async scanInternalServices() {
        // Reserved for future reflection logic
    }
}

export const discoveryService = new DiscoveryService();

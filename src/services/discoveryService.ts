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

    private isEnabled(): boolean {
        return typeof __LUCA_DEV_MODE__ !== 'undefined' && __LUCA_DEV_MODE__;
    }

    constructor() {
        if (!this.isEnabled()) return;
        console.log("[THE_EXPLORER] Discovery Service Active (Dev Mode Only)");
    }

    /**
     * Scans the system path for high-value CLI tools that are not yet agentized.
     */
    public async scanSystemCapabilities() {
        if (!this.isEnabled()) return;
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
        if (!this.isEnabled()) return false;
        // Logic will be populated by the bridge during terminal sessions
        return ['git', 'curl', 'python3'].includes(tool);
    }

    private proposeNewCapabilities(tools: string[]) {
        if (!this.isEnabled()) return;

        tools.forEach(tool => {
            this.discoveredTools.add(tool);
            forgeProposalService.generateSyntheticProposal({
                title: `Bridge discovered: ${tool.toUpperCase()}`,
                problem: `I have detected ${tool} in the host environment, but I do not have a BDI bridge to utilize it.`,
                remediation: `Create a standardized BDI tool wrapper for '${tool}' execution.`,
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

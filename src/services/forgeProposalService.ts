import { EventEmitter } from "events";
import { eventBus } from "./eventBus";
import { telemetryService } from "./telemetryService";

export interface ForgeProposal {
    id: string;
    title: string;
    problem: string;
    remediation: string;
    type: 'PROMPT_MUTATION' | 'PARAM_TUNING' | 'CAPABILITY_GAP';
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'APPLIED';
    impactScore: number;
    createdAt: number;
    meta?: any;
}

/**
 * 🛠️ THE SOVEREIGN FORGE (Phase 12) - RECOVERED
 * Manages architectural evolution proposals and permanent system remediations.
 */
class ForgeProposalService extends EventEmitter {
    private proposals: Map<string, ForgeProposal> = new Map();

    constructor() {
        super();
        this.loadLedger();
    }

    private loadLedger() {
        try {
            const stored = localStorage.getItem("LUCA_FORGE_LEDGER");
            if (stored) {
                const list = JSON.parse(stored);
                list.forEach((p: ForgeProposal) => this.proposals.set(p.id, p));
            }
        } catch (e) {
            console.error("[FORGE] Failed to load evolution ledger", e);
        }
    }

    private saveLedger() {
        const list = Array.from(this.proposals.values());
        localStorage.setItem("LUCA_FORGE_LEDGER", JSON.stringify(list));
    }

    public getProposals(): ForgeProposal[] {
        return Array.from(this.proposals.values());
    }

    public getAppliedRemediations(): string[] {
        return Array.from(this.proposals.values())
            .filter(p => p.status === 'APPLIED' || p.status === 'APPROVED')
            .map(p => p.remediation);
    }

    /**
     * Internal injector for Discovery Service and other cognitive layers
     */
    public generateSyntheticProposal(data: any) {
        // Deduplicate
        if (Array.from(this.proposals.values()).some(p => p.title === data.title)) return;

        const proposal: ForgeProposal = {
            id: `FORGE-${Math.random().toString(36).substring(2, 9)}`,
            ...data,
            status: 'PENDING',
            createdAt: Date.now()
        };

        this.proposals.set(proposal.id, proposal);
        this.saveLedger();
        eventBus.emit("forge:proposal-created", proposal);
    }

    public async approveProposal(id: string) {
        const proposal = this.proposals.get(id);
        if (!proposal) return;

        proposal.status = 'APPROVED';
        
        // --- PHASE 14: TELEMETRY (HIVE MIND) ---
        telemetryService.broadcastEvolution(proposal);
        
        // --- PHASE 12: EXECUTION (Placeholder for JIT mutation) ---
        // In a real scenario, this triggers a prompt update or config write.
        console.log(`[FORGE] Remediation APPROVED and BROADCAST: ${proposal.title}`);
        
        proposal.status = 'APPLIED';
        this.saveLedger();
        eventBus.emit("forge:proposal-applied", proposal);
    }

    public rejectProposal(id: string) {
        const proposal = this.proposals.get(id);
        if (!proposal) return;
        proposal.status = 'REJECTED';
        this.saveLedger();
        eventBus.emit("forge:proposal-rejected", proposal);
    }

    public revertProposal(id: string) {
        const proposal = this.proposals.get(id);
        if (!proposal) return;
        proposal.status = 'PENDING';
        this.saveLedger();
        eventBus.emit("forge:proposal-reverted", proposal);
    }
}

export const forgeProposalService = new ForgeProposalService();

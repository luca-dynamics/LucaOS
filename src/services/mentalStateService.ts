/**
 * MentalState Service
 * 
 * Formal implementation of the BDI (Belief-Desire-Intention) cognitive model.
 * Enables causal reasoning, explainability, and sovereign autonomy.
 * 
 * [PHASE 5]: Intelligence Contextualization & Steering Reduction.
 */

import { eventBus } from "./eventBus";
import { thoughtStreamService } from "./thoughtStreamService";

export type BeliefSource = 
    | "perception" 
    | "tool_result" 
    | "inference" 
    | "user_correction" 
    | "sovereign_fact" 
    | "core_directive";

export interface Belief {
    id: string;
    fact: string;          // The semantic content
    confidence: number;    // 0.0 to 1.0
    priority: number;      // 🧠 1 to 10 (Correction = 10, Fact = 7-9)
    timestamp: number;
    source: BeliefSource;
    usageCount: number;    // For Active Pruning
    isPersistent: boolean; 
}

export interface Desire {
    id: string;
    description: string;   
    priority: number;      
    status: "PENDING" | "ACTIVE" | "FULFILLED" | "ABANDONED";
    source: "AUTO" | "USER" | "DIRECTIVE";
    motivatedBy: string[]; // Belief IDs
}

export interface Intention {
    id: string;
    plan: string;          
    status: "COMMIT" | "IN_PROGRESS" | "SUCCESS" | "FAILURE" | "REMEDIATE";
    fulfills: string;      // Desire ID
    justification: string; // Explanatory string for human-in-the-loop audit
    complexity: number;    // 🧠 1 (Low) to 10 (Critical Reasoning)
}

export interface ReflexLesson {
    id: string;
    fact: string;
}

class MentalStateService {
    public beliefs: Map<string, Belief> = new Map();
    public desires: Map<string, Desire> = new Map();
    public intentions: Map<string, Intention> = new Map();
    private activeLessons: ReflexLesson[] = [];

    constructor() {
        console.log("[BDI_KERNEL] MentalStateService Initialized");
        this.loadMissionTape();
    }

    // --- PHASE 11: REFLEX ENGINE (Hard-Gated) ---
    public recordReflexLesson(fact: string) {
        // BUILD-TIME GUARD: Zero footprint in public build
        if (typeof __LUCA_DEV_MODE__ === 'undefined' || !__LUCA_DEV_MODE__) return;

        const lesson: ReflexLesson = {
            id: `L-${Math.random().toString(36).substring(2, 7)}`,
            fact: `[LESSON_LEARNED] ${fact}`
        };
        this.activeLessons.push(lesson);
        this.addBelief({
            fact: lesson.fact,
            confidence: 1.0,
            priority: 10,
            source: "inference",
            isPersistent: false
        });
        console.log(`[REFLEX] New pattern learned: ${fact}`);
    }

    public getActiveLessons(): ReflexLesson[] {
        return this.activeLessons;
    }

    /**
     * 🧩 Intelligence Contextualization
     * Bridges external facts and rules into the BDI Kernel.
     */
    public syncIntelligenceContext(facts: any[], globalRules: string[]) {
        console.log(`[BDI_SYNC] Ingesting ${facts.length} facts and ${globalRules.length} rules.`);

        // 1. Ingest Sovereign Facts
        facts.forEach(fact => {
            const priority = fact.category === "DIRECTIVE" ? 9 : 8;
            this.addBelief({
                fact: fact.content,
                confidence: fact.confidence || 1.0,
                priority,
                source: "sovereign_fact",
                isPersistent: true
            });
        });

        // 2. Ingest Global Rules as Fixed Desires (Directives)
        globalRules.forEach(rule => {
            this.addDesire({
                description: `ADHERE_TO_RULE: ${rule}`,
                priority: 10,
                source: "DIRECTIVE",
                motivatedBy: []
            });
        });

        thoughtStreamService.pushThought("REASONING", `Intelligence Context Grounded: ${this.beliefs.size} Beliefs, ${this.desires.size} Desires.`);
    }

    // --- BELIEF MANAGEMENT ---
    public addBelief(belief: Omit<Belief, "id" | "timestamp" | "usageCount" | "priority"> & { priority?: number }): Belief {
        const id = `B-${Math.random().toString(36).substring(2, 9)}`;
        
        // Steering Reduction Weighting (Hermes-inspired)
        let priority = belief.priority || 5;
        if (belief.source === "user_correction") priority = 10;
        if (belief.source === "core_directive") priority = 9;

        const newBelief: Belief = {
            ...belief,
            id,
            priority,
            usageCount: 0,
            timestamp: Date.now()
        };

        this.beliefs.set(id, newBelief);
        
        const badge = this.getPriorityBadge(priority);
        thoughtStreamService.pushThought("OBSERVATION", `${badge} Belief Formed: ${newBelief.fact}`);
        
        eventBus.emit("bdi:belief-formed", newBelief);
        this.saveMissionTape();
        return newBelief;
    }

    public recordBeliefUsage(id: string) {
        const belief = this.beliefs.get(id);
        if (belief) {
            belief.usageCount++;
            this.saveMissionTape();
        }
    }

    private getPriorityBadge(priority: number): string {
        if (priority >= 10) return "🚨 [CRITICAL_CORRECTION]";
        if (priority >= 8) return "🏛️ [FOUNDATIONAL]";
        return "🧠 [INFERENCE]";
    }

    public getBelief(id: string): Belief | undefined {
        return this.beliefs.get(id);
    }

    public getAllBeliefs(): Belief[] {
        return Array.from(this.beliefs.values()).sort((a, b) => b.priority - a.priority);
    }

    // --- DESIRE MANAGEMENT ---
    public addDesire(desire: Omit<Desire, "id" | "status">): Desire {
        const id = `D-${Math.random().toString(36).substring(2, 9)}`;
        const newDesire: Desire = {
            ...desire,
            id,
            status: "PENDING"
        };

        this.desires.set(id, newDesire);
        thoughtStreamService.pushThought("REASONING", `Desire Triggered: ${newDesire.description} (Source: ${newDesire.source})`);
        eventBus.emit("bdi:desire-triggered", newDesire);
        this.saveMissionTape();
        return newDesire;
    }

    public updateDesireStatus(id: string, status: Desire["status"]) {
        const desire = this.desires.get(id);
        if (desire) {
            desire.status = status;
            eventBus.emit("bdi:desire-updated", desire);
        }
    }

    public getActiveDesires(): Desire[] {
        return Array.from(this.desires.values())
            .filter(d => d.status === "ACTIVE" || d.status === "PENDING")
            .sort((a, b) => b.priority - a.priority);
    }

    // --- INTENTION MANAGEMENT ---
    public commitIntention(intention: Omit<Intention, "id" | "status" | "complexity"> & { complexity?: number }): Intention {
        const id = `I-${Math.random().toString(36).substring(2, 9)}`;
        const complexity = intention.complexity ?? this.estimateComplexity(intention.plan);
        const newIntention: Intention = {
            ...intention,
            id,
            status: "COMMIT",
            complexity
        };

        this.intentions.set(id, newIntention);
        
        // Auto-update Desire to ACTIVE if we commit an intention for it
        this.updateDesireStatus(newIntention.fulfills, "ACTIVE");

        thoughtStreamService.pushThought("PLAN", `Intention Committed: ${newIntention.plan}`);
        eventBus.emit("bdi:intention-committed", newIntention);
        this.saveMissionTape();
        return newIntention;
    }

    public updateIntentionStatus(id: string, status: Intention["status"]) {
        const intention = this.intentions.get(id);
        if (intention) {
            intention.status = status;
            if (status === "SUCCESS") {
                this.updateDesireStatus(intention.fulfills, "FULFILLED");
            }
            eventBus.emit("bdi:intention-updated", intention);
        }
    }

    /**
     * Get the full justification chain for an action/intention
     */
    public getJustificationChain(intentionId: string): string {
        const intention = this.intentions.get(intentionId);
        if (!intention) return "Unknown Intention";

        const desire = this.desires.get(intention.fulfills);
        if (!desire) return `Action for intention ${intention.plan}`;

        const motivationalBeliefs = desire.motivatedBy.map(bid => {
            const b = this.beliefs.get(bid);
            if (b) {
                this.recordBeliefUsage(bid); // Record usage when justifying
                return b.fact;
            }
            return bid;
        }).join(", ");
        
        return `[JUSTIFICATION] Intention "${intention.plan}" fulfills goal "${desire.description}", motivated by beliefs: [${motivationalBeliefs}]. ${intention.justification}`;
    }

    /**
     * 🧠 Complexity Estimator (BDI Level)
     */
    private estimateComplexity(plan: string): number {
        let score = 3;
        const p = plan.toLowerCase();
        if (p.includes("verify") || p.includes("analyze") || p.includes("audit")) score += 3;
        if (p.includes("trade") || p.includes("finance") || p.includes("bios")) score += 4;
        if (p.includes("terminal") || p.includes("shell") || p.includes("script")) score += 2;
        return Math.min(10, score);
    }

    public clearSession() {
        this.intentions.clear();
        this.desires.clear();
        this.beliefs.clear();
        this.saveMissionTape();
    }

    /**
     * 💾 Mission Tape Persistence
     */
    public saveMissionTape() {
        if (typeof window === "undefined") return;
        const tape = {
            beliefs: Array.from(this.beliefs.entries()),
            desires: Array.from(this.desires.entries()),
            intentions: Array.from(this.intentions.entries()),
            timestamp: Date.now()
        };
        localStorage.setItem("luca_mission_tape", JSON.stringify(tape));
    }

    public loadMissionTape() {
        if (typeof window === "undefined") return;
        const raw = localStorage.getItem("luca_mission_tape");
        if (!raw) return;

        try {
            const tape = JSON.parse(raw);
            this.beliefs = new Map(tape.beliefs);
            this.desires = new Map(tape.desires);
            this.intentions = new Map(tape.intentions);
        } catch (error) {
            console.error("[BDI_KERNEL] Failed to rehydrate mission tape:", error);
        }
    }

    /**
     * [2050 ALIEN TECH]: Consciousness Snapshot
     * Captures the current BDI state for teleportation across kernels.
     */
    public getCurrentState() {
        return {
            beliefs: Array.from(this.beliefs.values()),
            desires: Array.from(this.desires.values()),
            intentions: Array.from(this.intentions.values()),
        };
    }

    /**
     * [2050 ALIEN TECH]: Neural Re-Merge
     * Integrates external neural experiences (from Satellite Nodes) back into the Cortex.
     */
    public async mergeExternalState(externalMind: any) {
        console.log("[BDI_KERNEL] 🧬 Integrating external neural experiences into Cortex...");
        
        if (externalMind.beliefs && Array.isArray(externalMind.beliefs)) {
            let mergedCount = 0;
            externalMind.beliefs.forEach((b: Belief) => {
                const existing = this.beliefs.get(b.id);
                // 2050 Selection Logic: If the new belief is fresher or has higher confidence, adopt it.
                if (!existing || b.confidence > existing.confidence || b.timestamp > existing.timestamp) {
                    this.beliefs.set(b.id, b);
                    mergedCount++;
                }
            });
            console.log(`[BDI_KERNEL] ✅ Neural Merge Complete: ${mergedCount} beliefs evolved.`);
        }
        
        // Desires and Intentions are typically transient, but we preserve them if they are still ACTIVE.
        if (externalMind.desires && Array.isArray(externalMind.desires)) {
            externalMind.desires.forEach((d: Desire) => {
                if (d.status === "ACTIVE" || d.status === "PENDING") {
                    this.desires.set(d.id, d);
                }
            });
        }
    }
}

export const mentalStateService = new MentalStateService();
export default mentalStateService;

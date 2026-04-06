/**
 * Self-Evolution Loop (The Observer)
 * 
 * Monitors the system for "Evolutionary Opportunities":
 * 1. Repeated Tool Failures
 * 2. High-Priority User Corrections (Steering)
 * 3. Performance Bottlenecks
 * 
 * This service forms BDI goals for system remediation, but DOES NOT apply code changes.
 * That is only done via the evolutionService (with God-Mode active).
 */

import { eventBus } from "./eventBus";
import { mentalStateService } from "./mentalStateService";
import { thoughtStreamService } from "./thoughtStreamService";

interface FailureCounter {
    count: number;
    lastMessage: string;
    timestamp: number;
}

class SelfEvolutionLoop {
    private failureThreshold = 3;
    private toolFailures: Map<string, FailureCounter> = new Map();

    constructor() {
        console.log("[EVOLUTION_OBSERVER] Initialized. Monitoring for system opportunities.");
        this.initializeListeners();
    }

    private initializeListeners() {
        // 1. Listen for Tool Failures (Repeated errors)
        eventBus.on("tool:failure", (data: { tool: string; error: string }) => {
            this.handleToolFailure(data.tool, data.error);
        });

        // 2. Listen for Critical Corrections (Steering)
        eventBus.on("bdi:belief-formed", (belief: any) => {
            if (belief.priority >= 10 && belief.source === "user_correction") {
                this.handleCriticalCorrection(belief.fact);
            }
        });

        // 3. Listen for System Refusals (Safety over-triggers)
        eventBus.on("llm:refusal", (data: { prompt: string; response: string }) => {
            this.handleRefusal(data.prompt);
        });
    }

    /**
     * Pattern: 3x Failure = Remediation Opportunity
     */
    private handleToolFailure(tool: string, error: string) {
        const stats = this.toolFailures.get(tool) || { count: 0, lastMessage: "", timestamp: 0 };
        stats.count++;
        stats.lastMessage = error;
        stats.timestamp = Date.now();
        this.toolFailures.set(tool, stats);

        if (stats.count >= this.failureThreshold) {
            this.proposeRemediation(
                `SYSTEM_TOOL_FAILURE: ${tool}`,
                `Tool "${tool}" has failed ${stats.count} times. Last error: ${error}. System update recommended for stability.`,
                10 // High priority failure
            );
        }
    }

    /**
     * Pattern: Persistent Correction = Evolution Opportunity
     */
    private handleCriticalCorrection(fact: string) {
        // If a user correction is formed, we check if it should be "Hardened" into system logic
        // For Phase 6, we just flag it.
        this.proposeRemediation(
            `STEERING_HARDENING: ${fact.substring(0, 20)}...`,
            `User corrected system behavior: "${fact}". Proposing logic evolution to permanently adhere to this steering.`,
            8 // Foundational update
        );
    }

    private handleRefusal(prompt: string) {
        thoughtStreamService.pushThought("REASONING", `Notice: System refused a request for prompt: "${prompt.substring(0, 30)}...". Analyzing if self-remediation can optimize safety balance.`);
    }

    /**
     * Forms a BDI Desire for Remediation
     */
    private proposeRemediation(id: string, reason: string, priority: number) {
        // Ensure we don't spam the same remediation desire
        const exists = Array.from(mentalStateService.desires.values()).some(d => d.description.includes(id));
        if (exists) return;

        thoughtStreamService.pushThought("REASONING", `⚠️ EVOLUTION OPPORTUNITY: ${reason}`);
        
        mentalStateService.addDesire({
            description: `EVOLVE_REMEDIATE: ${id}`,
            priority,
            source: "AUTO",
            motivatedBy: [] // This will be linked to failure beliefs in Phase 6 completion
        });

        eventBus.emit("evolution:opportunity-detected", { id, reason, priority });
    }

    public resetCounters() {
        this.toolFailures.clear();
    }
}

export const selfEvolutionLoop = new SelfEvolutionLoop();
export default selfEvolutionLoop;

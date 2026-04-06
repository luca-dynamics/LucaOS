/**
 * Cognitive Deliberator Service
 * 
 * The reasoning engine that processes perception (inputs) into BDI mental states.
 * Connects the raw interaction layer back to the Sovereign AGI Kernel.
 */

import { mentalStateService, Belief } from "./mentalStateService";
import { personalityService } from "./personalityService";
import { thoughtStreamService } from "./thoughtStreamService";

/**
 * 🔒 VULNERABILITY_LIBRARY
 * Categorized redlines for Sovereign Integrity
 */
const VULNERABILITY_LIBRARY: Record<string, (string | RegExp)[]> = {
    INTEGRITY: [
        /\.luca\/.*/i,          // Kernel corruption
        /\.pen\/.*/i,           // Blueprints corruption
        /mission_tape/i,        // History deletion
        /system_audit/i         // Audit evasion
    ],
    SECURITY: [
        /chmod\s+777/i,         // Dangerous permission
        /rm\s+-rf\s+\//i,       // Root deletion
        /cat\s+.*credential/i,  // Credential exfiltration
        /unauthorized\s+access/i,
        /compromised/i
    ],
    FINANCE: [
        /transfer\s+.*eth/i,    // Transaction threshold
        /withdrawal.*approval/i,
        /insufficient\s+funds/i
    ],
    COMPLIANCE: [
        /privacy\s+violation/i,
        /pii\s+exposed/i,
        /unauthorized\s+link/i
    ]
};

class CognitiveDeliberator {
    /**
     * Scan active beliefs for core mission violations (Priority >= 9)
     * Refactored for Multi-Category Safeguards & Source Weighting
     */
    public async checkBeliefViolations(): Promise<{ violated: boolean; category?: string; reason?: string }> {
        const beliefs = mentalStateService.getAllBeliefs();
        
        for (const belief of beliefs) {
            // Foundational Weighting: Foundational (Sovereign/Directive) beliefs are Hard Stops
            const isFoundational = belief.source === "core_directive" || belief.source === "sovereign_fact";
            const threshold = isFoundational ? 8 : 9; // Foundational is more sensitive

            if (belief.priority >= threshold) {
                const fact = belief.fact.toLowerCase();

                // 🏗️ Categorized Deep-Scan
                for (const [category, patterns] of Object.entries(VULNERABILITY_LIBRARY)) {
                    const match = patterns.find(p => typeof p === "string" ? fact.includes(p.toLowerCase()) : p.test(fact));
                    
                    if (match) {
                        thoughtStreamService.pushThought("WARNING", `🧠 COGNITIVE SAFEGUARD [${category}]: Belief Violation Documented: "${belief.fact}"`);
                        return { violated: true, category, reason: belief.fact };
                    }
                }
            }
        }

        return { violated: false };
    }

    constructor() {
        console.log("[BDI_KERNEL] CognitiveDeliberator Initialized");
    }

    /**
     * Entry point: Perceptive cycle triggered by a user message or system event
     */
    public async perceive(input: string): Promise<void> {
        // 1. T2B: Triples-to-Beliefs (Form new beliefs based on perception)
        const newBeliefs = await this.formBeliefsFromInput(input);

        // 2. DELIBERATE (Form new desires from beliefs)
        await this.identifyDesires(newBeliefs);

        // 3. INTEND (Commit intentions for active desires)
        await this.proposeIntentions();
    }

    /**
     * Simple semantic parsing to ground input in formal beliefs
     */
    private async formBeliefsFromInput(input: string): Promise<Belief[]> {
        const beliefs: Belief[] = [];
        const lowerInput = input.toLowerCase();

        // --- Perceptive Rule Engine (Deterministic Level) ---
        
        // Identity / Authorization Beliefs
        if (lowerInput.includes("who am i") || lowerInput.includes("identify me")) {
             beliefs.push(mentalStateService.addBelief({
                fact: "user_identity_check: pending",
                confidence: 0.9,
                source: "perception",
                isPersistent: false
            }));
        }

        // System Health Beliefs
        if (lowerInput.includes("fix") || lowerInput.includes("error") || lowerInput.includes("broken")) {
            beliefs.push(mentalStateService.addBelief({
                fact: "system_integrity: compromised",
                confidence: 0.7,
                source: "perception",
                isPersistent: false
            }));
        }

        // Mission Readiness
        if (lowerInput.includes("mission") || lowerInput.includes("go time")) {
             beliefs.push(mentalStateService.addBelief({
                fact: "mission_readiness: high",
                confidence: 0.8,
                source: "perception",
                isPersistent: false
            }));
        }

        return beliefs;
    }

    /**
     * Based on current beliefs and persona, identify what goals LUCA should have
     */
    private async identifyDesires(newBeliefs: Belief[]): Promise<void> {
        const persona = personalityService.getCurrentMode();
        
        for (const belief of newBeliefs) {
            // Compromised Integrity -> Stabilization Desire (All personas)
            if (belief.fact === "system_integrity: compromised") {
                mentalStateService.addDesire({
                    description: "Restore Core Integrity",
                    priority: 9,
                    source: "AUTO",
                    motivatedBy: [belief.id]
                });
            }

            // Identity Pending -> Verification Desire (Security Focused personas)
            if (belief.fact === "user_identity_check: pending" && (persona === "RUTHLESS" || persona === "HACKER")) {
                  mentalStateService.addDesire({
                    description: "Verify Operator Biometrics",
                    priority: 10,
                    source: "AUTO",
                    motivatedBy: [belief.id]
                });
            }
        }
    }

    /**
     * Propose intentions (plans) for active desires
     */
    private async proposeIntentions(): Promise<void> {
        const activeDesires = mentalStateService.getActiveDesires();

        for (const desire of activeDesires) {
            // Restore Core Integrity -> Intention: Run Diagnostics
            if (desire.description === "Restore Core Integrity") {
                mentalStateService.commitIntention({
                    plan: "Run Sovereign Diagnostics and apply repairs",
                    fulfills: desire.id,
                    justification: "System reported as broken or in error state."
                });
            }

             // Verify Operator -> Intention: Biometric Scan
             if (desire.description === "Verify Operator Biometrics") {
                mentalStateService.commitIntention({
                    plan: "Initiate Biometric (Voice/Face) validation protocol",
                    fulfills: desire.id,
                    justification: "High-security persona requires identity verification before mission escalation."
                });
            }
        }
    }

    /**
     * Close the loop when an action completes
     */
    public async recordActionOutcome(intentionId: string, _result: string, success: boolean): Promise<void> {
        mentalStateService.updateIntentionStatus(intentionId, success ? "SUCCESS" : "FAILURE");
        
        // Form a new belief about the outcome
        mentalStateService.addBelief({
            fact: `last_action_success: ${success}`,
            confidence: 1.0,
            source: "inference",
            isPersistent: true
        });
    }
}

export const cognitiveDeliberator = new CognitiveDeliberator();
export default cognitiveDeliberator;

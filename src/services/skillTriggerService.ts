/**
 * Skill Trigger Service
 * 
 * Orchestrates Just-in-Time (JIT) skill ingestion based on BDI intentions.
 * Reduces prompt bloat by only loading tools relevant to the current mission.
 */

import { FunctionDeclaration } from "@google/genai";
import { ToolRegistry } from "./toolRegistry";
import { mentalStateService } from "./mentalStateService";
import { modelRouterService, ModelRecommendation } from "./ModelRouterService";

class SkillTriggerService {
    private activeSkillSets: Set<string> = new Set();
    private maxTransientSets = 3; // Limit to prevent prompt explosion
    private setHistory: string[] = []; // For LRU eviction
    private latestRecommendation: ModelRecommendation | null = null;

    constructor() {
        console.log("[CONTEXT_ENGINEERING] SkillTriggerService Initialized");
    }

    /**
     * Synchronize active skills with current BDI intentions
     */
    public async syncSkillsWithIntentions(): Promise<{ tools: FunctionDeclaration[], recommendation: ModelRecommendation | null }> {
        const activeIntentions = Array.from(mentalStateService.intentions.values())
            .filter(i => i.status === "COMMIT");

        if (activeIntentions.length === 0) {
            return { tools: [], recommendation: null };
        }

        const newDetectedSets = new Set<string>();

        // 1. Analyze every committed intention for skill triggers
        activeIntentions.forEach(intention => {
            const plan = intention.plan.toLowerCase();
            
            if (plan.includes("trade") || plan.includes("finance")) newDetectedSets.add("FINANCE");
            if (plan.includes("terminal") || plan.includes("command") || plan.includes("fix")) newDetectedSets.add("SYSTEM_ADMIN");
            if (plan.includes("message") || plan.includes("whatsapp") || plan.includes("notify")) newDetectedSets.add("COMMUNICATION");
            if (plan.includes("file") || plan.includes("repo") || plan.includes("directory")) newDetectedSets.add("CORE_FILES");
            if (plan.includes("skill") || plan.includes("mcp") || plan.includes("ingest")) newDetectedSets.add("AGENCY_EVOLUTION");
        });

        // 2. Update active sets with LRU logic
        newDetectedSets.forEach(setName => {
            this.activateSkillSet(setName);
        });

        // 3. Resolve Model Recommendation (based on the primary intention)
        const primaryIntention = activeIntentions[activeIntentions.length - 1];
        this.latestRecommendation = await modelRouterService.recommendModel(primaryIntention, Array.from(this.activeSkillSets));

        // 4. Collect all tools from active sets
        const transientTools: Map<string, FunctionDeclaration> = new Map();
        this.activeSkillSets.forEach(setName => {
            const tools = ToolRegistry.getToolsBySkillSet(setName);
            tools.forEach(t => transientTools.set(t.name || "unknown", t));
        });

        return {
            tools: Array.from(transientTools.values()),
            recommendation: this.latestRecommendation
        };
    }

    /**
     * Activate a skill set and manage LRU eviction if necessary
     */
    private activateSkillSet(setName: string): void {
        if (this.activeSkillSets.has(setName)) {
            // Refresh LRU position
            this.setHistory = this.setHistory.filter(s => s !== setName);
            this.setHistory.push(setName);
            return;
        }

        // Evict oldest set if at capacity
        if (this.activeSkillSets.size >= this.maxTransientSets) {
            const oldest = this.setHistory.shift();
            if (oldest) {
                this.activeSkillSets.delete(oldest);
                console.log(`[CONTEXT_ENGINEERING] Evicting SkillSet: ${oldest} (LRU)`);
            }
        }

        this.activeSkillSets.add(setName);
        this.setHistory.push(setName);
        console.log(`[CONTEXT_ENGINEERING] Ingesting SkillSet: ${setName}`);
    }

    /**
     * Get a summary of active skills for prompt grounding
     */
    public getActiveSkillsSummary(): string {
        const sets = Array.from(this.activeSkillSets);
        if (sets.length === 0) return "No transient skills active.";
        
        let summary = `Active Specialty Skillsets: ${sets.join(", ")}`;
        if (this.latestRecommendation) {
            summary += `\nRecommended Model: ${this.latestRecommendation.modelName} (Status: ${this.latestRecommendation.status})`;
        }
        return summary;
    }

    /**
     * Clear all transient skills (e.g. on session reset)
     */
    public clearSkills(): void {
        this.activeSkillSets.clear();
        this.setHistory = [];
    }
}

export const skillTriggerService = new SkillTriggerService();
export default skillTriggerService;

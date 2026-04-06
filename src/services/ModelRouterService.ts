import { modelManager, LocalModel } from "./ModelManagerService";
import { Intention } from "./mentalStateService";

export interface ModelRecommendation {
    modelId: string;
    modelName: string;
    status: "READY" | "MISSING" | "UNSUPPORTED";
    reason: string;
    complexity: number;
}

export type ModelProfileType = "LOGIC" | "CODING" | "SOCIAL" | "GENERAL";

class ModelRouterService {
    private readonly PROFILE_MAP: Record<ModelProfileType, string[]> = {
        "LOGIC": ["deepseek-r1-distill-7b", "qwopus-3.5-27b", "phi-3-mini"],
        "CODING": ["qwen-2.5-7b", "mistral-7b", "llama-3.2-1b"],
        "SOCIAL": ["hermes-3-8b", "hermes-3-3b", "gemma-2b"],
        "GENERAL": ["gemma-2b", "phi-3-mini", "llama-3.2-1b"]
    };

    /**
     * 🧠 Resolve the best model for a given Intention and its triggered SkillSets
     */
    public async recommendModel(intention: Intention, activeSkillSets: string[]): Promise<ModelRecommendation> {
        const profile = this.inferProfile(intention, activeSkillSets);
        const candidates = this.PROFILE_MAP[profile];
        
        let bestModel: LocalModel | undefined;
        
        // 1. Find the first 'ready' model in the profile's candidate list
        for (const id of candidates) {
            const m = modelManager.getModel(id);
            if (m && m.status === "ready") {
                bestModel = m;
                break;
            }
        }

        // 2. VRAM GUARD: Check if we have enough RAM for the best model
        const specs = await modelManager.getSystemSpecs();
        const totalRAM = specs?.memory?.total || 8_000_000_000;
        
        // 3. If no ready model, pick the top candidate to recommend for download
        if (!bestModel) {
            const preferredId = candidates[0];
            const preferredModel = modelManager.getModel(preferredId);
            const req = preferredModel?.memoryRequirement || 4_000_000_000;

            if (totalRAM < req) {
                return {
                    modelId: preferredId,
                    modelName: preferredModel?.name || preferredId,
                    status: "UNSUPPORTED",
                    reason: `Insufficient RAM (${Math.round(totalRAM/1e9)}GB). Requires ${Math.round(req/1e9)}GB for ${profile} tasks.`,
                    complexity: intention.complexity
                };
            }
            
            return {
                modelId: preferredId,
                modelName: preferredModel?.name || preferredId,
                status: "MISSING",
                reason: `Recommended for ${profile} tasks (Complexity: ${intention.complexity}).`,
                complexity: intention.complexity
            };
        }

        return {
            modelId: bestModel.id,
            modelName: bestModel.name,
            status: "READY",
            reason: `Optimal ${profile} model for complexity level ${intention.complexity}.`,
            complexity: intention.complexity
        };
    }

    private inferProfile(intention: Intention, skillSets: string[]): ModelProfileType {
        if (skillSets.includes("FINANCE") || intention.complexity >= 8) return "LOGIC";
        if (skillSets.includes("SYSTEM_ADMIN") || skillSets.includes("AGENCY_EVOLUTION")) return "CODING";
        if (skillSets.includes("COMMUNICATION")) return "SOCIAL";
        return "GENERAL";
    }
}

export const modelRouterService = new ModelRouterService();
export default modelRouterService;

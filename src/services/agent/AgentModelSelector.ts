/**
 * Agent Model Selector - Phase 6 Enhancement
 *
 * Intelligently selects best model/tool for each task
 * Optimizes for: Cost, Speed, Quality, Availability
 *
 * LUCA'S ADVANTAGE: Hybrid local + cloud intelligence
 */

import type { AgentStep } from "./types";
import { settingsService } from "../settingsService";

export interface ModelCapability {
  name: string;
  type: "local" | "cloud";
  category: "brain" | "vision" | "tts" | "embedding";
  cost: number; // 0 for local, $ for cloud
  speed: number; // 1-10 (10 = fastest)
  quality: number; // 1-10 (10 = best)
  complexity: number; // 1-10 max task complexity it can handle
  available: boolean;
  modelId: string;
}

export interface ToolCapability {
  name: string;
  category: string;
  cost: number;
  speed: number;
  available: boolean;
}

export class AgentModelSelector {
  private models: Map<string, ModelCapability> = new Map();
  private tools: Map<string, ToolCapability> = new Map();

  constructor() {
    this.loadAvailableModels();
    this.loadAvailableTools();
  }

  /**
   * Load available models from settings + ModelManager
   */
  private loadAvailableModels(): void {
    const settings = settingsService.getSettings();

    // LOCAL BRAIN MODELS (Free, Fast, Lower Quality)
    this.registerModel({
      name: "Phi-3 Mini",
      type: "local",
      category: "brain",
      cost: 0, // FREE!
      speed: 9, // Very fast
      quality: 6, // Good for simple tasks
      complexity: 5, // Max complexity: 5/10
      available: this.checkLocalModelAvailable("phi-3-mini"),
      modelId: "phi-3-mini-128k",
    });

    this.registerModel({
      name: "Llama 3.2 1B",
      type: "local",
      category: "brain",
      cost: 0,
      speed: 9,
      quality: 6,
      complexity: 5,
      available: this.checkLocalModelAvailable("llama-3.2-1b"),
      modelId: "llama-3.2-1b",
    });

    this.registerModel({
      name: "SmolLM2 1.7B",
      type: "local",
      category: "brain",
      cost: 0,
      speed: 8,
      quality: 7,
      complexity: 6,
      available: this.checkLocalModelAvailable("smollm2-1.7b"),
      modelId: "smollm2-1.7b",
    });

    // CLOUD BRAIN MODELS (Paid, Slower, Higher Quality)
    this.registerModel({
      name: "Gemini 3.1 Pro (High)",
      type: "cloud",
      category: "brain",
      cost: 0.0015,
      speed: 6,
      quality: 10,
      complexity: 10,
      available: !!settings.brain.geminiApiKey,
      modelId: "gemini-3.1-pro-high",
    });

    this.registerModel({
      name: "Gemini 3.1 Pro (Low)",
      type: "cloud",
      category: "brain",
      cost: 0.0005,
      speed: 7,
      quality: 9,
      complexity: 10,
      available: !!settings.brain.geminiApiKey,
      modelId: "gemini-3.1-pro-low",
    });

    this.registerModel({
      name: "Gemini 3 Pro (High)",
      type: "cloud",
      category: "brain",
      cost: 0.001,
      speed: 6,
      quality: 9,
      complexity: 10,
      available: !!settings.brain.geminiApiKey,
      modelId: "gemini-3-pro-high",
    });

    this.registerModel({
      name: "Gemini 3 Pro (Low)",
      type: "cloud",
      category: "brain",
      cost: 0.0005,
      speed: 7,
      quality: 8,
      complexity: 8,
      available: !!settings.brain.geminiApiKey,
      modelId: "gemini-3-pro-low",
    });

    this.registerModel({
      name: "Gemini 3 Flash",
      type: "cloud",
      category: "brain",
      cost: 0.00015, // Per 1k tokens
      speed: 8,
      quality: 9,
      complexity: 10, // Can handle anything
      available: !!settings.brain.geminiApiKey,
      modelId: "gemini-3-flash",
    });

    this.registerModel({
      name: "Claude Sonnet 4.5",
      type: "cloud",
      category: "brain",
      cost: 0.003,
      speed: 6,
      quality: 9,
      complexity: 10,
      available: !!settings.brain.anthropicApiKey,
      modelId: "claude-4.5-sonnet",
    });

    this.registerModel({
      name: "Claude Sonnet 4.5 (Thinking)",
      type: "cloud",
      category: "brain",
      cost: 0.003,
      speed: 5,
      quality: 10,
      complexity: 10,
      available: !!settings.brain.anthropicApiKey,
      modelId: "claude-4.5-sonnet-thinking",
    });

    this.registerModel({
      name: "Claude Sonnet 4.6 (Thinking)",
      type: "cloud",
      category: "brain",
      cost: 0.003,
      speed: 5,
      quality: 10,
      complexity: 10,
      available: !!settings.brain.anthropicApiKey,
      modelId: "claude-4.6-sonnet-thinking",
    });

    this.registerModel({
      name: "Claude Opus 4.6 (Thinking)",
      type: "cloud",
      category: "brain",
      cost: 0.015,
      speed: 4,
      quality: 10,
      complexity: 10,
      available: !!settings.brain.anthropicApiKey,
      modelId: "claude-4.6-opus-thinking",
    });

    // LOCAL TTS MODELS
    this.registerModel({
      name: "Piper Amy",
      type: "local",
      category: "tts",
      cost: 0,
      speed: 10,
      quality: 7,
      complexity: 10,
      available: this.checkLocalModelAvailable("piper-amy"),
      modelId: "en_US-amy-medium",
    });

    this.registerModel({
      name: "Kokoro-82M",
      type: "local",
      category: "tts",
      cost: 0,
      speed: 10,
      quality: 9, // #1 ranked TTS
      complexity: 10,
      available: this.checkLocalModelAvailable("kokoro-82m"),
      modelId: "kokoro-82m",
    });

    // CLOUD TTS
    this.registerModel({
      name: "Gemini TTS",
      type: "cloud",
      category: "tts",
      cost: 0.016, // Per 1M chars
      speed: 5,
      quality: 10,
      complexity: 10,
      available: !!settings.brain.geminiApiKey,
      modelId: "gemini-tts",
    });
  }

  /**
   * Load available tools/skills
   */
  private loadAvailableTools(): void {
    // MCP Skills
    this.registerTool({
      name: "file_read",
      category: "filesystem",
      cost: 0,
      speed: 10,
      available: true,
    });

    this.registerTool({
      name: "file_write",
      category: "filesystem",
      cost: 0,
      speed: 10,
      available: true,
    });

    this.registerTool({
      name: "terminal",
      category: "execution",
      cost: 0,
      speed: 8,
      available: true,
    });

    this.registerTool({
      name: "browser",
      category: "web",
      cost: 0,
      speed: 6,
      available: true,
    });

    this.registerTool({
      name: "astra_scan",
      category: "vision",
      cost: 0.001, // Cloud vision API
      speed: 4,
      available: true,
    });

    this.registerTool({
      name: "web_search",
      category: "research",
      cost: 0.002,
      speed: 5,
      available: true,
    });

    this.registerTool({
      name: "osint",
      category: "security",
      cost: 0,
      speed: 6,
      available: true,
    });
  }

  /**
   * SELECT BEST MODEL FOR TASK
   * Smart multi-criteria selection:
   * 1. AVAILABILITY (what's actually downloaded)
   * 2. USER PREFERENCE (respect current settings)
   * 3. CAPABILITY (can handle complexity)
   * 4. OPTIMIZATION (speed, cost, quality)
   */
  selectModelForTask(step: AgentStep, budget: number): ModelCapability | null {
    console.log(`[ModelSelector] Selecting model for: ${step.description}`);
    console.log(`  Complexity: ${step.estimatedComplexity}/10`);

    const settings = settingsService.getSettings();
    const userPreferredModel = settings.brain.model;

    // STEP 1: Filter by AVAILABILITY & CAPABILITY
    const available = Array.from(this.models.values())
      .filter((m) => m.category === "brain")
      .filter((m) => m.available) // Actually downloaded/accessible
      .filter((m) => m.complexity >= step.estimatedComplexity); // Can handle task

    if (available.length === 0) {
      console.warn(
        "[ModelSelector] ❌ No available models can handle this task!",
      );
      console.warn(`  Required complexity: ${step.estimatedComplexity}`);
      console.warn(`  Try: Download a local model or add API key`);
      return null;
    }

    console.log(`[ModelSelector] Found ${available.length} capable models`);

    // STEP 2: Check USER'S PREFERRED MODEL first
    const preferred = available.find((m) => m.modelId === userPreferredModel);

    if (preferred) {
      console.log(
        `[ModelSelector] ✅ User's preferred model: ${preferred.name}`,
      );

      // Only switch if there's a SIGNIFICANT advantage
      const betterOptions = available.filter(
        (m) =>
          m.modelId !== userPreferredModel &&
          this.isSignificantlyBetter(m, preferred, step),
      );

      if (betterOptions.length === 0) {
        console.log(`[ModelSelector] 🎯 Using preferred: ${preferred.name}`);
        console.log(
          `  Type: ${preferred.type} | Quality: ${preferred.quality}/10 | Speed: ${preferred.speed}/10`,
        );
        console.log(
          `  Cost: $${
            preferred.cost === 0 ? "0 (FREE!)" : preferred.cost.toFixed(4)
          }/1k`,
        );
        return preferred;
      }

      // Found better option - explain why we're switching
      const best = betterOptions[0];
      console.log(`[ModelSelector] 💡 Found better option:`);
      console.log(
        `  Preferred: ${preferred.name} (quality: ${preferred.quality}, cost: $${preferred.cost})`,
      );
      console.log(
        `  Better: ${best.name} (quality: ${best.quality}, cost: $${best.cost})`,
      );
      console.log(`  Reason: ${this.explainAdvantage(best, preferred)}`);
      return best;
    }

    // STEP 3: User's model not available - select best alternative
    const scored = available.map((model) => ({
      model,
      score: this.calculateModelScore(model, step, budget, userPreferredModel),
    }));

    scored.sort((a, b) => b.score - a.score);
    const selected = scored[0].model;

    console.log(`[ModelSelector] 🔍 Selected: ${selected.name}`);
    console.log(
      `  Type: ${selected.type} | Quality: ${selected.quality}/10 | Speed: ${selected.speed}/10`,
    );
    console.log(
      `  Cost: $${
        selected.cost === 0 ? "0 (FREE!)" : selected.cost.toFixed(4)
      }/1k`,
    );
    console.log(`  Score: ${scored[0].score.toFixed(2)}`);

    return selected;
  }

  /**
   * Calculate multi-criteria score for model selection
   */
  private calculateModelScore(
    model: ModelCapability,
    step: AgentStep,
    budget: number,
    userPreferredModel: string,
  ): number {
    let score = 0;

    // User preference (huge bonus)
    if (model.modelId === userPreferredModel) score += 50;

    // Local availability (always better)
    if (model.type === "local") score += 20;

    // Quality fit
    const qualityFit = Math.min(model.quality / step.estimatedComplexity, 1);
    score += qualityFit * 15;

    // Speed
    score += (model.speed / 10) * 10;

    // Cost (free is best)
    if (model.cost === 0) score += 15;
    else if (model.cost <= budget * 0.1) score += 10;
    else if (model.cost <= budget * 0.5) score += 5;

    // Capability margin
    const headroom = model.complexity - step.estimatedComplexity;
    score += Math.min(headroom * 2, 10);

    return score;
  }

  /**
   * Check if alternative is significantly better
   */
  private isSignificantlyBetter(
    alternative: ModelCapability,
    preferred: ModelCapability,
    step: AgentStep,
  ): boolean {
    // Local vs cloud = always switch if capable (cost savings)
    if (alternative.type === "local" && preferred.type === "cloud") {
      if (alternative.complexity >= step.estimatedComplexity) return true;
    }

    // Same type = need significant quality/speed improvement
    if (alternative.type === preferred.type) {
      const qualityGain = alternative.quality - preferred.quality;
      const speedGain = alternative.speed - preferred.speed;
      if (qualityGain >= 2 || speedGain >= 3) return true;
    }

    return false;
  }

  /**
   * Explain why alternative is better
   */
  private explainAdvantage(
    better: ModelCapability,
    current: ModelCapability,
  ): string {
    const reasons: string[] = [];
    if (better.type === "local" && current.type === "cloud")
      reasons.push("FREE vs paid");
    if (better.quality > current.quality)
      reasons.push(`+${better.quality - current.quality} quality`);
    if (better.speed > current.speed)
      reasons.push(`+${better.speed - current.speed} speed`);
    if (better.cost < current.cost)
      reasons.push(`$${(current.cost - better.cost).toFixed(4)} cheaper`);
    return reasons.join(", ");
  }

  /**
   * SELECT BEST TOOL FOR REQUIREMENT
   */
  selectTool(requirement: string): ToolCapability | null {
    // Simple matching for now
    for (const tool of this.tools.values()) {
      if (tool.name.includes(requirement) || requirement.includes(tool.name)) {
        if (tool.available) {
          return tool;
        }
      }
    }
    return null;
  }

  /**
   * ESTIMATE COST for entire task
   */
  estimateCost(
    steps: AgentStep[],
    budget: number,
  ): { totalCost: number; breakdown: any[] } {
    let totalCost = 0;
    const breakdown: any[] = [];

    for (const step of steps) {
      const model = this.selectModelForTask(step, budget - totalCost);

      if (!model) continue;

      // Estimate tokens for this step (rough)
      const estimatedTokens = step.estimatedComplexity * 1000; // 1k per complexity point
      const stepCost = model.cost * (estimatedTokens / 1000);

      totalCost += stepCost;
      breakdown.push({
        stepId: step.id,
        model: model.name,
        estimatedTokens,
        cost: stepCost,
      });
    }

    return { totalCost, breakdown };
  }

  /**
   * GET OPTIMAL STRATEGY
   * Returns plan with cost breakdown
   */
  getOptimalStrategy(steps: AgentStep[], maxCost: number): string {
    const estimate = this.estimateCost(steps, maxCost);

    const localSteps = estimate.breakdown.filter(
      (s) => s.model.includes("Local") || s.cost === 0,
    ).length;
    const cloudSteps = estimate.breakdown.length - localSteps;

    return `
Strategy:
- Total Steps: ${steps.length}
- Local Models: ${localSteps} steps (FREE)
- Cloud Models: ${cloudSteps} steps
- Estimated Cost: $${estimate.totalCost.toFixed(4)}
- Budget Available: $${maxCost.toFixed(2)}
- Savings: ${((1 - estimate.totalCost / maxCost) * 100).toFixed(1)}%
    `.trim();
  }

  /**
   * Check if local model is available
   */
  private checkLocalModelAvailable(modelId: string): boolean {
    // Phase 6: Check ModelManager
    // For now, assume available if in localStorage
    const downloaded = localStorage.getItem(`model_${modelId}_status`);
    return downloaded === "ready";
  }

  /**
   * Register a model
   */
  private registerModel(model: ModelCapability): void {
    this.models.set(model.modelId, model);
  }

  /**
   * Register a tool
   */
  private registerTool(tool: ToolCapability): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * Get all available models
   */
  getAvailableModels(): ModelCapability[] {
    return Array.from(this.models.values()).filter((m) => m.available);
  }

  /**
   * Get cost summary
   */
  getCostSummary(): { local: number; cloud: number; total: number } {
    const models = this.getAvailableModels();
    return {
      local: models.filter((m) => m.type === "local").length,
      cloud: models.filter((m) => m.type === "cloud").length,
      total: models.length,
    };
  }
}

// Singleton instance
export const modelSelector = new AgentModelSelector();

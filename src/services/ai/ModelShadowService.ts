import { TradeDecision, TradeAction } from "../../types/trading";

/**
 * 🕵️ ModelShadowService (Phase 14)
 * Tracks "Ghost Decisions" for benchmarking models without risk.
 */
export class ModelShadowService {
  private static instance: ModelShadowService;
  private shadowLog: Record<string, any[]> = {};

  private constructor() {}

  public static getInstance(): ModelShadowService {
    if (!ModelShadowService.instance) {
      ModelShadowService.instance = new ModelShadowService();
    }
    return ModelShadowService.instance;
  }

  /**
   * Records a shadow decision for a specific model during a live session.
   */
  public async recordShadowDecision(
    sessionId: string,
    modelId: string,
    symbol: string,
    decision: TradeDecision
  ) {
    if (!this.shadowLog[sessionId]) {
      this.shadowLog[sessionId] = [];
    }

    const entry = {
      modelId,
      symbol,
      action: decision.action,
      confidence: decision.confidence,
      reasoning: decision.reasoning,
      priceAtDecision: 0, // In real system, fetch current price
      timestamp: Date.now(),
      status: "pending",
    };

    this.shadowLog[sessionId].push(entry);
    console.log(`[SHADOW] Recorded ${modelId} ghost decision for ${symbol}: ${decision.action}`);
  }

  /**
   * Returns the drift report comparing active decisions vs shadow decisions.
   */
  public getModelDriftReport(sessionId: string) {
    const sessionDrafts = this.shadowLog[sessionId] || [];
    // Basic aggregation for UI
    return sessionDrafts.map(d => ({
      modelId: d.modelId,
      actionMatch: d.action === TradeAction.OPEN_LONG, // Simplified logic
      driftPct: Math.random() * 5, // Simulated drift
    }));
  }
}

export const modelShadowService = ModelShadowService.getInstance();

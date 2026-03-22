

/**
 * 🛡️ RiskOrchestrator (Phase 15)
 * The "Safety Valve" of LUCA. Fuses AI Confidence with Mathematical Risk.
 */
export class RiskOrchestrator {
  private static instance: RiskOrchestrator;
  
  // Default bounds
  private MAX_LEVERAGE = 20;
  private MIN_CONFIDENCE_FOR_LEVERAGE = 75;

  private constructor() {}

  public static getInstance(): RiskOrchestrator {
    if (!RiskOrchestrator.instance) {
      RiskOrchestrator.instance = new RiskOrchestrator();
    }
    return RiskOrchestrator.instance;
  }

  /**
   * Main calculation loop for adaptive risk.
   */
  public calculateAdaptiveParameters(
    confidence: number,
    volatility: number, // ATR or StdDev
    equity: number,
    maxLeverageCap: number = 10,
    sentiment: number = 0 // Range -1 to 1 (Phase 15 Elite)
  ) {
    console.log(`[RISK-OS] Calculating parameters for Confidence: ${confidence}% | Vol: ${volatility} | Sentiment: ${sentiment}`);

    // 1. Base Leverage Calculation
    let leverage = 1;
    if (confidence >= this.MIN_CONFIDENCE_FOR_LEVERAGE) {
      // Linear scaling from MIN_CONF to MAX_LEVERAGE
      const range = 100 - this.MIN_CONFIDENCE_FOR_LEVERAGE;
      const progress = (confidence - this.MIN_CONFIDENCE_FOR_LEVERAGE) / range;
      leverage = 1 + Math.floor(progress * (maxLeverageCap - 1));
    }

    // 2. Volatility Adjustment (De-leveraging in high vol)
    if (volatility > 0.02) { // Example threshold for high vol
      leverage = Math.max(1, Math.floor(leverage * 0.5));
      console.log(`[RISK-OS] High Volatility detected. Auto-throttling leverage to ${leverage}x`);
    }

    // 3. Sentiment-Aware Stop Adjustment (Phase 15 Elite)
    let sentimentMultiplier = 1.0;
    
    // Logic: Tighten stops on divergence, widen on convergence
    if (sentiment < -0.2) {
      sentimentMultiplier = 0.7; // Tighten by 30% (Defensive)
      console.log(`[RISK-OS] Bearish Sentiment Divergence. Tightening stops (0.7x)`);
    } else if (sentiment > 0.4) {
      sentimentMultiplier = 1.25; // Widen by 25% (Momentum)
      console.log(`[RISK-OS] Strong Bullish Sentiment. Widening stops for momentum (1.25x)`);
    }

    // 4. Position Sizing (Fixed 2% risk of equity)
    const riskAmount = equity * 0.02;
    // Base stop distance from volatility
    const baseStopDistance = Math.max(0.01, volatility * 2);
    // Apply sentiment multiplier
    const stopDistance = baseStopDistance * sentimentMultiplier;
    
    const size = riskAmount / stopDistance;

    return {
      leverage,
      size,
      stopLossPercent: stopDistance * 100,
      confidenceWeight: confidence / 100,
      sentimentAdjustment: sentimentMultiplier
    };
  }

  /**
   * Check if a trade should be completely blocked based on dangerous conditions.
   */
  public isTradeAllowed(confidence: number, drift: number): { allowed: boolean; reason?: string } {
    if (confidence < 60) {
      return { allowed: false, reason: "Insufficient AI Confidence (<60%)" };
    }
    if (drift > 15) {
      return { allowed: false, reason: "High Model Drift detected. Calibrating Brains..." };
    }
    return { allowed: true };
  }
}



export const riskOrchestrator = RiskOrchestrator.getInstance();

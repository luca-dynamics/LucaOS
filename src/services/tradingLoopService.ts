import { tradingService } from "./tradingService";
import { eventBus } from "./eventBus";
import { voiceService } from "./voiceService";
import { Sender, Message } from "../types";
import { TradeAction } from "../types/trading";

/**
 * 🔄 Trading Loop Service
 * 
 * This service runs the background "Auto-Research" loop.
 * It periodically scans markets, triggers agent debates, 
 * and notifies the user via Chat and Voice if a high-confidence 
 * trade is identified.
 */

class TradingLoopService {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private symbols: string[] = ["BTC/USDT", "ETH/USDT", "SOL/USDT"];
  private checkInterval: number = 60000 * 5; // Default: 5 minutes

  constructor() {
    // Load persisted settings
    const savedInterval = localStorage.getItem("LUCA_TRADING_RESEARCH_INTERVAL");
    if (savedInterval) this.checkInterval = parseInt(savedInterval);
    
    const savedEnabled = localStorage.getItem("LUCA_TRADING_RESEARCH_ENABLED");
    // Default to false for safety on first boot, but respect saved preference
    this.isRunning = savedEnabled === "true";
  }

  public boot() {
    if (this.isRunning) {
      this.isRunning = false; // Reset for start() to work
      this.start();
    }
  }

  public isActive() {
    return this.isRunning;
  }

  public getInterval() {
    return this.checkInterval;
  }

  public updateInterval(ms: number) {
    this.checkInterval = ms;
    localStorage.setItem("LUCA_TRADING_RESEARCH_INTERVAL", ms.toString());
    if (this.isRunning) {
      this.stop();
      this.start();
    }
  }

  /**
   * Starts the background loop.
   */
  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    localStorage.setItem("LUCA_TRADING_RESEARCH_ENABLED", "true");
    console.log("[TRADING-LOOP] Autonomous Research Loop Started.");
    
    // Initial run
    this.runResearchCycle();

    this.intervalId = setInterval(() => {
      this.runResearchCycle();
    }, this.checkInterval);
  }

  /**
   * Stops the background loop.
   */
  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    localStorage.setItem("LUCA_TRADING_RESEARCH_ENABLED", "false");
    console.log("[TRADING-LOOP] Autonomous Research Loop Stopped.");
  }

  /**
   * Main research logic: Pick a symbol, run debate, notify user if high confidence.
   */
  private async runResearchCycle() {
    const symbol = this.symbols[Math.floor(Math.random() * this.symbols.length)];
    console.log(`[TRADING-LOOP] Background Analysis started for ${symbol}...`);

    try {
      // 1. Run the Multi-Agent Debate in the background
      const debate = await tradingService.runMultiAgentDebate(symbol, "Auto-Research-Core");

      // 2. If confidence is high (> 80%), notify the user
      if (debate.confidence >= 80) {
        this.notifyUserOfOpportunity(symbol, debate);
      }
    } catch (error) {
      console.error("[TRADING-LOOP] Research cycle failed:", error);
    }
  }

  /**
   * Triggers Chat, Voice, and Dashboard synchronization.
   */
  private async notifyUserOfOpportunity(symbol: string, debate: any) {
    const actionLabel = debate.action === TradeAction.OPEN_LONG ? "BUY" : "SELL";

    // A. Sync to Dashboard (Tactical Data)
    eventBus.emit("TRADE_RESEARCH_HIT", {
      symbol,
      debate,
      timestamp: Date.now()
    });

    // B. Trigger Voice Intent
    voiceService.speak(`Operator, my background research has identified a high-confidence ${actionLabel} opportunity on ${symbol}. I've summarized the technicals in the chat.`);

    // C. Inject Rich Message into Chat with Actions
    const message: Message = {
      id: `research_${Date.now()}`,
      sender: Sender.LUCA,
      text: `### 🎯 Auto-Research Opportunity Found: **${symbol}**\n\nI've detected a strong market setup for **${symbol}**.\n\n**Analyst Consensus:**\n${debate.transcript}\n\n**Confidence Level:** ${debate.confidence}%\n**Sentiment Score:** ${(debate.sentimentScore * 100).toFixed(0)}%\n\nShould I execute this position for you?`,
      timestamp: Date.now(),
      actions: [
        {
          id: `exec_${Date.now()}`,
          label: `EXECUTE ${actionLabel}`,
          action: "CONFIRM_TRADE",
          payload: { 
            symbol, 
            action: debate.action, 
            confidence: debate.confidence,
            sentiment: debate.sentimentScore // Phase 15 Elite integration
          },
          variant: debate.action === TradeAction.OPEN_LONG ? "primary" : "danger"
        },
        {
          id: `dismiss_${Date.now()}`,
          label: "DISMISS",
          action: "DISMISS_RESEARCH",
          payload: { symbol },
          variant: "ghost"
        }
      ],
      tacticalData: {
        type: "FINANCE",
        status: "OPPORTUNITY IDENTIFIED",
        title: `RESEARCH: ${symbol}`,
        logs: debate.messages.map((m: any) => ({
          id: m.id,
          timestamp: new Date(m.timestamp).toISOString(),
          source: m.participantId,
          message: m.content,
          type: "INFO"
        }))
      }
    };

    // Emit to Chat via EventBus (ConversationService will pick it up)
    eventBus.emit("INJECT_SYSTEM_MESSAGE", message);
  }
}

export const tradingLoopService = new TradingLoopService();

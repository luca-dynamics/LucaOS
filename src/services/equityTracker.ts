import { memoryService } from "./memoryService";

export interface EquitySnapshot {
  timestamp: number;
  totalEquity: number;
  availableBalance: number;
  unrealizedPnL: number;
  positionCount: number;
  marginUsedPct: number;
}

const MEMORY_KEY = "EQUITY_HISTORY";
const MAX_POINTS = 5000;
const MIN_INTERVAL_MS = 60000; // Recalculate max once per minute to avoid flooding

class EquityTracker {
  private lastSnapshotTime: number = 0;

  /**
   * Records a new equity snapshot if enough time has passed.
   * Uses memoryService for persistence (LocalStorage + Backend Sync).
   */
  public async recordSnapshot(data: Omit<EquitySnapshot, "timestamp">) {
    const now = Date.now();
    
    // Throttling: only record once per minute
    if (now - this.lastSnapshotTime < MIN_INTERVAL_MS) {
      return;
    }

    try {
      const history = await this.getHistory();
      
      const newSnapshot: EquitySnapshot = {
        ...data,
        timestamp: now
      };

      // Append and prune
      const updatedHistory = [...history, newSnapshot].slice(-MAX_POINTS);
      
      // Save to memoryService (Category: AGENT_STATE for persistence)
      await memoryService.saveMemory(
        MEMORY_KEY, 
        JSON.stringify(updatedHistory),
        "AGENT_STATE"
      );

      this.lastSnapshotTime = now;
      console.log(`[EQUITY-TRACKER] Recorded snapshot: $${data.totalEquity.toFixed(2)}`);
    } catch (error) {
      console.error("[EQUITY-TRACKER] Failed to record snapshot:", error);
    }
  }

  /**
   * Retrieves the full history from memoryService.
   */
  public async getHistory(): Promise<EquitySnapshot[]> {
    try {
      const memories = memoryService.getAllMemories();
      const equityMem = memories.find(m => m.key === MEMORY_KEY);
      
      if (equityMem && equityMem.value) {
        return JSON.parse(equityMem.value);
      }
    } catch (error) {
      console.error("[EQUITY-TRACKER] Failed to retrieve history:", error);
    }
    return [];
  }

  /**
   * Calculates performance statistics based on historical data.
   */
  public async getPerformanceStats() {
    const history = await this.getHistory();
    if (history.length < 2) return { dayPnL: 0, dayPnLPct: 0, totalGrowth: 0 };

    const current = history[history.length - 1];
    
    // Find point approximately 24h ago
    const oneDayAgo = Date.now() - 86400000;
    const startIndex = history.findIndex(p => p.timestamp >= oneDayAgo);
    const dayStart = startIndex !== -1 ? history[startIndex] : history[0];

    const dayPnL = current.totalEquity - dayStart.totalEquity;
    const dayPnLPct = (dayPnL / dayStart.totalEquity) * 100;

    const initial = history[0];
    const totalPnL = current.totalEquity - initial.totalEquity;
    const totalGrowth = (totalPnL / initial.totalEquity) * 100;

    return {
      dayPnL,
      dayPnLPct,
      totalGrowth,
      initialBalance: initial.totalEquity,
      dataPoints: history.length
    };
  }

  /**
   * Wipes history (for debugging or reset)
   */
  public async clearHistory() {
    await memoryService.saveMemory(MEMORY_KEY, "[]", "AGENT_STATE");
    this.lastSnapshotTime = 0;
  }
}

export const equityTracker = new EquityTracker();

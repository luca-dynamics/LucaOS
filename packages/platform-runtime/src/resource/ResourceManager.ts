import { ExecutionBudget } from "../../../contracts/src";

export interface SystemResourceState {
  cpuUsagePct: number;
  memoryUsageMb: number;
  activeWorkersCount: number;
  totalTokensConsumed: number;
  totalCostAccrued: number;
}

export class ResourceManager {
  private activeWorkers = 0;
  private totalTokens = 0;
  private totalCost = 0;

  public requestAllocation(budget: ExecutionBudget): boolean {
    if (this.activeWorkers >= budget.maxWorkers) {
      console.warn(`⚠️ [ResourceManager] Allocation DENIED: Active workers (${this.activeWorkers}) exceed budget maxWorkers (${budget.maxWorkers})`);
      return false;
    }
    if (this.totalCost >= budget.maxCost * 10) {
      console.warn(`⚠️ [ResourceManager] Allocation DENIED: Cost accrued ($${this.totalCost.toFixed(4)}) exceeds budget threshold`);
      return false;
    }

    this.activeWorkers++;
    console.log(`✅ [ResourceManager] Allocation APPROVED (Active Workers: ${this.activeWorkers}/${budget.maxWorkers})`);
    return true;
  }

  public releaseAllocation(tokensUsed = 100, costIncurred = 0.002): void {
    if (this.activeWorkers > 0) {
      this.activeWorkers--;
    }
    this.totalTokens += tokensUsed;
    this.totalCost += costIncurred;
    console.log(`📉 [ResourceManager] Released allocation (Tokens: ${this.totalTokens}, Accrued Cost: $${this.totalCost.toFixed(4)})`);
  }

  public getResourceState(): SystemResourceState {
    return {
      cpuUsagePct: 12.5,
      memoryUsageMb: 142.8,
      activeWorkersCount: this.activeWorkers,
      totalTokensConsumed: this.totalTokens,
      totalCostAccrued: this.totalCost,
    };
  }
}

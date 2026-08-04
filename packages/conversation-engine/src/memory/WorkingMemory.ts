export interface WorkingMemoryTurn {
  turnId: string;
  userPrompt: string;
  assistantResponse?: string;
  timestamp: number;
}

export class WorkingMemory {
  private recentTurns: WorkingMemoryTurn[] = [];
  private activeGoals: string[] = [];

  public addTurn(turn: WorkingMemoryTurn): void {
    this.recentTurns.push(turn);
    if (this.recentTurns.length > 20) {
      this.recentTurns.shift();
    }
  }

  public setGoals(goals: string[]): void {
    this.activeGoals = goals;
  }

  public getRecentTurns(): readonly WorkingMemoryTurn[] {
    return this.recentTurns;
  }

  public getActiveGoals(): readonly string[] {
    return this.activeGoals;
  }

  public clear(): void {
    this.recentTurns = [];
    this.activeGoals = [];
  }
}

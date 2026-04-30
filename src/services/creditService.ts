import { eventBus } from "./eventBus";

export type ProvisioningMode = "PRIME" | "BYOK" | "LOCAL";

/**
 * CreditService
 * Manages the "Sovereign Wallet" - LUCA's awareness of compute resources.
 * Handles token consumption tracking and budget enforcement across different provisioning layers.
 */
class CreditService {
  private balance: number = 1000.0; // Starting baseline for PRIME
  private totalSpent: number = 0;
  private mode: ProvisioningMode = "PRIME"; // Default mode
  
  private readonly LOW_CREDIT_THRESHOLD = 50.0;
  private readonly CRITICAL_CREDIT_THRESHOLD = 10.0;

  constructor() {
    this.loadState();
  }

  private loadState() {
    const saved = localStorage.getItem("luca_credits");
    if (saved) {
      try {
        const data = JSON.parse(saved);
        this.balance = data.balance ?? 1000.0;
        this.totalSpent = data.totalSpent ?? 0;
        this.mode = data.mode ?? "PRIME";
      } catch (e) {
        console.error("[CREDITS] Failed to load state:", e);
      }
    }
  }

  private saveState() {
    localStorage.setItem(
      "luca_credits",
      JSON.stringify({ 
        balance: this.balance, 
        totalSpent: this.totalSpent,
        mode: this.mode 
      }),
    );
    eventBus.emit("credit-update", {
      balance: this.balance,
      spent: this.totalSpent,
      status: this.getStatus(),
      mode: this.mode
    });
  }

  public setMode(mode: ProvisioningMode) {
    this.mode = mode;
    console.log(`[CREDITS] Provisioning mode switched to: ${mode}`);
    this.saveState();
  }

  public getMode(): ProvisioningMode {
    return this.mode;
  }

  public getBalance(): number {
    return this.balance;
  }

  public getStatus(): "NORMAL" | "LOW" | "CRITICAL" | "UNLIMITED" {
    if (this.mode !== "PRIME") return "UNLIMITED";
    if (this.balance <= this.CRITICAL_CREDIT_THRESHOLD) return "CRITICAL";
    if (this.balance <= this.LOW_CREDIT_THRESHOLD) return "LOW";
    return "NORMAL";
  }

  /**
   * Deduct credits for a system action
   */
  public spend(amount: number, reason: string, force: boolean = false): boolean {
    // LOCAL mode is free, unless we force deduction for cloud fallback/background tasks
    if (this.mode === "LOCAL" && !force) {
      console.log(`[CREDITS] LOCAL Mode: Skipping deduction for: ${reason}`);
      return true;
    }

    // In BYOK, we track usage but don't enforce a balance limit
    if (this.mode === "BYOK") {
      this.totalSpent += amount;
      console.log(`[CREDITS] BYOK Usage Tracked: ${amount.toFixed(2)} for ${reason}. Total Spent: ${this.totalSpent.toFixed(2)}`);
      this.saveState();
      return true;
    }

    // PRIME mode enforces balance
    if (this.balance < amount) {
      console.warn(`[CREDITS] PRIME: Insufficient funds for: ${reason}`);
      return false;
    }

    this.balance -= amount;
    this.totalSpent += amount;
    
    console.log(`[CREDITS] PRIME Spent ${amount.toFixed(2)} for ${reason}. Remaining: ${this.balance.toFixed(2)}`);
    
    this.saveState();
    
    if (this.getStatus() === "CRITICAL" || this.getStatus() === "LOW") {
      eventBus.emit("system-warning", {
        type: "RESOURCE_LOW",
        message: `Prime compute credits are ${this.getStatus().toLowerCase()} (${this.balance.toFixed(2)}). Optimization recommended.`,
      });
    }

    return true;
  }

  public addCredits(amount: number) {
    this.balance += amount;
    this.saveState();
  }

  /**
   * Estimates cost based on action type
   * Adjusts costs based on provisioning mode
   */
  public estimateCost(type: "CHAT" | "TOOL" | "GENERATION" | "VISION" | "INDEXING"): number {
    if (this.mode === "LOCAL" && type !== "INDEXING") return 0; // Local compute is free, except cloud indexing

    const baseCosts = {
      CHAT: 0.5,
      TOOL: 1.5,
      INDEXING: 2.0, // Entity extraction is heavy
      GENERATION: 3.0,
      VISION: 5.0
    };

    return baseCosts[type] || 1.0;
  }
}

export const creditService = new CreditService();

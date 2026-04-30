/**
 * Phase 10 Stage 5 - Human-in-the-Loop Orchestrator
 * Multi-modal decision requests across Luca interfaces
 */

/**
 * Decision request sent to user
 */
export interface DecisionRequest {
  id: string;
  question: string;
  options: string[];
  context?: any;
  timestamp: number;
  timeoutMs?: number;
}

/**
 * Decision response from user
 */
export interface DecisionResponse {
  requestId: string;
  choice: string;
  timestamp: number;
  interface: "modal" | "voice" | "hologram" | "chat";
}

/**
 * Approval request for risky operations
 */
export interface ApprovalRequest {
  action: string;
  risk: "low" | "medium" | "high";
  details?: any;
  timeout?: number;
}

export class HumanInputOrchestrator {
  private pendingRequests: Map<string, DecisionRequest> = new Map();
  private isEnabled: boolean = false;

  constructor() {
    // Will be enabled when UI integration is complete
    this.isEnabled = false;
    console.log("[HumanInput] Offline mode (UI not integrated yet)");
  }

  /**
   * Request decision from user across all available interfaces
   */
  async requestDecision(
    question: string,
    options: string[],
    context?: any,
    timeoutMs: number = 60000
  ): Promise<string | null> {
    if (!this.isEnabled) {
      console.log("[HumanInput] Auto-approving (offline mode):", question);
      return options[0]; // Default to first option
    }

    const request: DecisionRequest = {
      id: this.generateId(),
      question,
      options,
      context,
      timestamp: Date.now(),
      timeoutMs,
    };

    this.pendingRequests.set(request.id, request);

    try {
      // Future: Show in all available interfaces
      // - Modal dialog (UI)
      // - Voice announcement (if active)
      // - Hologram display (if visible)

      // Wait for response with timeout
      const response = await this.waitForResponse(request.id, timeoutMs);

      return response ? response.choice : null;
    } catch (error) {
      console.error("[HumanInput] Decision failed:", error);
      return null;
    } finally {
      this.pendingRequests.delete(request.id);
    }
  }

  /**
   * Request approval for risky operation
   */
  async waitForApproval(request: ApprovalRequest): Promise<boolean> {
    if (!this.isEnabled) {
      // Auto-approve low risk, reject high risk in offline mode
      const autoApprove = request.risk === "low";
      console.log(
        `[HumanInput] ${autoApprove ? "Auto-approved" : "Auto-rejected"} (${
          request.risk
        } risk):`,
        request.action
      );
      return autoApprove;
    }

    const question = this.buildApprovalQuestion(request);
    const choice = await this.requestDecision(
      question,
      ["Approve", "Deny"],
      request.details,
      request.timeout
    );

    return choice === "Approve";
  }

  /**
   * Build approval question from request
   */
  private buildApprovalQuestion(request: ApprovalRequest): string {
    const riskEmoji = {
      low: "✓",
      medium: "⚠️",
      high: "⛔",
    };

    return `${riskEmoji[request.risk]} ${request.risk.toUpperCase()} RISK: ${
      request.action
    }\n\nApprove this action?`;
  }

  /**
   * Wait for user response
   */
  private async waitForResponse(
    requestId: string,
    timeoutMs: number
  ): Promise<DecisionResponse | null> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.warn("[HumanInput] Decision timeout:", requestId);
        resolve(null);
      }, timeoutMs);

      // Future: Listen for responses from:
      // - IPC from renderer (modal)
      // - Voice service events
      // - Hologram service events

      // For now, auto-resolve after short delay
      setTimeout(() => {
        clearTimeout(timeout);
        const request = this.pendingRequests.get(requestId);
        if (request) {
          resolve({
            requestId,
            choice: request.options[0],
            timestamp: Date.now(),
            interface: "modal",
          });
        } else {
          resolve(null);
        }
      }, 100);
    });
  }

  /**
   * Handle response from any interface
   */
  handleResponse(response: DecisionResponse): void {
    const request = this.pendingRequests.get(response.requestId);
    if (!request) {
      console.warn("[HumanInput] Unknown request:", response.requestId);
      return;
    }

    console.log(
      `[HumanInput] Received ${response.choice} via ${response.interface}`
    );

    // Future: Emit event or resolve promise
    // This would be called from IPC handlers
  }

  /**
   * Generate unique request ID
   */
  private generateId(): string {
    return `decision-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get all pending requests
   */
  getPendingRequests(): DecisionRequest[] {
    return Array.from(this.pendingRequests.values());
  }

  /**
   * Cancel a pending request
   */
  cancelRequest(requestId: string): void {
    this.pendingRequests.delete(requestId);
    console.log("[HumanInput] Cancelled request:", requestId);
  }
}

// Export singleton
let humanInputInstance: HumanInputOrchestrator | null = null;

export function getHumanInput(): HumanInputOrchestrator {
  if (!humanInputInstance) {
    humanInputInstance = new HumanInputOrchestrator();
  }
  return humanInputInstance;
}

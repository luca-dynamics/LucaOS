export interface PolicyEvaluationContext {
  turnId?: string;
  userPrompt?: string;
  isResponding?: boolean;
  toolSensitivity?: "low" | "medium" | "high";
}

export class PolicyEngine {
  public shouldRequireApproval(context: PolicyEvaluationContext): boolean {
    return context.toolSensitivity === "high";
  }

  public shouldInterrupt(context: PolicyEvaluationContext): boolean {
    return Boolean(context.isResponding);
  }

  public shouldWriteMemory(userPrompt?: string): boolean {
    if (!userPrompt) return false;
    const clean = userPrompt.toLowerCase();
    return clean.includes("remember") || clean.includes("my name is") || clean.includes("prefer");
  }

  public shouldInvokeTools(userPrompt?: string): boolean {
    if (!userPrompt) return false;
    const clean = userPrompt.toLowerCase();
    return (
      clean.includes("search") ||
      clean.includes("check") ||
      clean.includes("calculate") ||
      clean.includes("system")
    );
  }
}

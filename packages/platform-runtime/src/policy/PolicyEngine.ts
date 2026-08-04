export interface PolicyRule {
  ruleId: string;
  category: "privacy" | "cost" | "permissions" | "offline";
  description: string;
  evaluate: (context: Record<string, unknown>) => boolean;
}

export class PolicyEngine {
  private rules: PolicyRule[] = [];

  constructor() {
    // Default system safety & privacy rules
    this.addRule({
      ruleId: "privacy_pii_check",
      category: "privacy",
      description: "Prevent PII leaks to external models",
      evaluate: (ctx) => !Boolean(ctx.hasPii),
    });
    this.addRule({
      ruleId: "offline_mode_check",
      category: "offline",
      description: "Require local model adapter when offline",
      evaluate: (ctx) => (ctx.isOffline ? ctx.providerType === "local" : true),
    });
  }

  public addRule(rule: PolicyRule): void {
    this.rules.push(rule);
  }

  public validateAction(context: Record<string, unknown>): { allowed: boolean; failedRules: string[] } {
    const failed: string[] = [];
    for (const rule of this.rules) {
      if (!rule.evaluate(context)) {
        failed.push(rule.ruleId);
        console.warn(`⚠️ [PolicyEngine] Policy Violation: Rule '${rule.ruleId}' (${rule.description}) FAILED.`);
      }
    }
    return {
      allowed: failed.length === 0,
      failedRules: failed,
    };
  }
}

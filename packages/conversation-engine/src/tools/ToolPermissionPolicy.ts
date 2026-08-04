export type ToolCategory = "read_only" | "personal_read" | "personal_write" | "system_action" | "financial" | "system_read";

export interface ToolPermissionRule {
  toolName: string;
  category: ToolCategory;
  requiresUserApproval: boolean;
  autoApprove?: boolean;
}

export class ToolPermissionPolicy {
  private rules: Map<string, ToolPermissionRule> = new Map();

  constructor() {
    // Default Rules
    this.registerRule({ toolName: "weather_lookup", category: "read_only", requiresUserApproval: false });
    this.registerRule({ toolName: "calendar_read", category: "personal_read", requiresUserApproval: false });
    this.registerRule({ toolName: "calendar_write", category: "personal_write", requiresUserApproval: true });
    this.registerRule({ toolName: "system_terminal", category: "system_action", requiresUserApproval: true });
  }

  public registerRule(rule: ToolPermissionRule): void {
    this.rules.set(rule.toolName, rule);
  }

  public addRule(rule: ToolPermissionRule): void {
    this.registerRule(rule);
  }

  public requiresApproval(toolName: string): boolean {
    const rule = this.rules.get(toolName);
    if (!rule) return true; // Fail-safe default: require approval for unknown tools
    return rule.requiresUserApproval;
  }

  public evaluate(category: ToolCategory, toolName: string, _params?: Record<string, unknown>): boolean {
    const rule = this.rules.get(toolName);
    if (!rule) return false;
    if (rule.autoApprove) return true;
    return !rule.requiresUserApproval;
  }
}

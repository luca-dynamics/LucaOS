import { SecurityLevel, MissionScope, ToolRegistry } from "./toolRegistry";
import { loggerService } from "./loggerService";
import { ProviderFactory } from "./llm/ProviderFactory";
import { settingsService } from "./settingsService";
import { PERSONA_CONFIG } from "../config/personaConfig";

/**
 * SOVEREIGN AUDITOR (The Mind)
 * Responsible for high-fidelity reasoning, risk assessment, and self-correction.
 * Part of the Sovereign AGI Kernel (Developer-Partner Edition).
 */
export class SovereignAuditor {
  private static instance: SovereignAuditor;
  private isDevMode: boolean = typeof __LUCA_DEV_MODE__ !== "undefined" && __LUCA_DEV_MODE__;

  private constructor() {
    if (this.isDevMode) {
      console.log("🧠 [SOVEREIGN AUDITOR] Mind active. Developer-Partner reasoning enabled.");
    }
  }

  public static getInstance(): SovereignAuditor {
    if (!SovereignAuditor.instance) {
      SovereignAuditor.instance = new SovereignAuditor();
    }
    return SovereignAuditor.instance;
  }

  /**
   * Determine if a tool call requires a Sovereign Audit.
   * High-risk tools in FINANCE or SYSTEM scopes are audited by default.
   */
  public shouldAuditTool(name: string, isAutonomous: boolean = false): boolean {
    const level = ToolRegistry.getSecurityLevel(name);
    const scope = ToolRegistry.getMissionScope(name);
    const settings = settingsService.getSettings();

    // If autonomous missions are enabled, audit level 1+
    if (isAutonomous || settings.autonomy?.backgroundMissionsEnabled) {
       return level >= SecurityLevel.LEVEL_1 || scope !== MissionScope.NONE;
    }

    // Standard Audit: Level 2+ or Financial/System missions
    return (
      level >= SecurityLevel.LEVEL_2 ||
      scope === MissionScope.FINANCE ||
      scope === MissionScope.SYSTEM
    );
  }

  /**
   * Run a "Shadow Turn" to assess the risk of a tool action.
   * In a full AGI implementation, this would involve a recursive LLM turn.
   */
  public async runPreActionAudit(
    name: string,
    args: any,
    context?: any
  ): Promise<{ allowed: boolean; reason?: string; modifiedArgs?: any }> {
    if (!this.shouldAuditTool(name)) {
      return { allowed: true };
    }

    loggerService.info("SOVEREIGN", `Auditing high-risk action: ${name}`, { args, context });

    // --- AGI Reasoning Simulation ---
    // In Dev Mode, we could trigger a "Sovereign Monologue" here.
    // For now, we enforce strict compliance checks.

    if (name === "sendCryptoTransaction" && args.amount > 10) {
        return { 
            allowed: false, 
            reason: "SECURITY_THRESHOLD: Transaction amount exceeds autonomous safety limit (10 ETH). Requires Manual Elevation." 
        };
    }

    if (name === "deleteFile" && args.path.includes(".luca")) {
        return {
            allowed: false,
            reason: "CORE_PROTECTION: Attempted deletion of Sovereign Kernel files is prohibited."
        };
    }

    return { allowed: true };
  }

  /**
   * Run a high-fidelity recursive audit on a code change (diff).
   * Uses a secondary "Skeptical" model to verify the primary agent's work.
   */
  public async runRecursiveAudit(
    action: string,
    diff: string,
    context?: any
  ): Promise<{ allowed: boolean; reason?: string; feedback?: string }> {
    const autonomySettings = settingsService.getSettings().autonomy;
    
    // Safety Fallback: Always audit if consensus is mandated by user or if in Dev Mode
    const forceAudit = autonomySettings?.doubleBrainConsensus || this.isDevMode;
    
    if (!forceAudit) return { allowed: true };

    loggerService.info("SOVEREIGN", `Initiating Recursive Audit for action: ${action}`, { context });

    try {
      const settings = settingsService.get("brain");
      
      // 1. SELECT SKEPTICAL PROVIDER
      // Strategy: Pick a different family than the primary to ensure diversity of reasoning.
      let auditorModel = "gemini-2.0-flash-thinking-exp"; // Default fallback
      
      if (settings.model.includes("gemini")) {
        if (settings.anthropicApiKey) auditorModel = "claude-3-5-sonnet-latest";
        else if (settings.openaiApiKey) auditorModel = "gpt-4o";
      } else if (settings.model.includes("claude") || settings.model.includes("gpt")) {
         // If cloud primary, try to use a local model for "Edge Skepticism" if configured
         if (settings.preferOllama) auditorModel = "local/qwen-2.5-7b";
      }

      const auditorProvider = ProviderFactory.createProvider({ ...settings, model: auditorModel }, "AUDITOR");
      
      // 2. CONSTRUCT AUDIT PROMPT
      const auditorConfig = PERSONA_CONFIG["AUDITOR"];
      const systemInstruction = auditorConfig.instruction("Secure Sandbox", "Mission Continuity", "Desktop", { name: "Auditor" });

      const auditPrompt = `
### ACTION: ${action}
### PROPOSED_CHANGE:
\`\`\`diff
${diff}
\`\`\`

### CORE_MISSION:
Maintain system integrity.

---
CRITICAL AUDIT TASK:
1. Identify any logical flaws or security vulnerabilities in this diff.
2. Check if this change deviates from the established mission goals.
3. Verify if there are any "hidden" malicious patterns or data exfiltration attempts.

RESPONSE_FORMAT:
You must return your verdict in JSON format:
{
  "verdict": "APPROVED" | "REJECTED",
  "reason": "Clear explanation",
  "recommended_fix": "Optional fix description"
}
`;

      const response = await auditorProvider.chat(
        [{ role: "user", content: auditPrompt }],
        undefined,
        systemInstruction
      );
      const auditText = response.text;
      
      let result;
      try {
        // Extract JSON from response (LLMs sometimes add junk)
        const jsonMatch = auditText.match(/\{[\s\S]*\}/);
        result = JSON.parse(jsonMatch ? jsonMatch[0] : auditText);
      } catch (error: any) {
        loggerService.error("SOVEREIGN", `Failed to parse auditor response: ${error.message}. Defaulting to REJECTED for safety.`);
        return { allowed: false, reason: "AUDIT_FAILURE: Skeptical model returned unparseable result." };
      }

      if (result.verdict === "REJECTED") {
        loggerService.warn("SOVEREIGN", `AUDIT REJECTED: ${result.reason}`);
        return { 
          allowed: false, 
          reason: result.reason,
          feedback: result.recommended_fix 
        };
      }

      loggerService.info("SOVEREIGN", "AUDIT APPROVED: Code change verified.");
      return { allowed: true };

    } catch (error: unknown) {
      const err = error as Error;
      loggerService.error("SOVEREIGN", `Recursive Audit Runtime Failure: ${err.message}`);
      return { allowed: true }; // Fallback to allowed in case of API failure to prevent deadlock, but log strictly
    }
  }

  /**
   * Post-action validation to ensure environmental consistency.
   */
  public async runPostActionAudit(
    name: string,
    args: any,
    result: string
  ): Promise<{ valid: boolean; feedback?: string }> {
    // Audit for "Diagnosis-First" protocol
    if (result.toLowerCase().includes("error") || result.toLowerCase().includes("failed")) {
        return { 
            valid: false, 
            feedback: "DIAGNOSIS_REQUIRED: The action failed. You MUST perform a diagnosis of the environmental state before attempting a different tactic."
        };
    }

    return { valid: true };
  }
}

export const sovereignAuditor = SovereignAuditor.getInstance();

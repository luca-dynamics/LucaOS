import { PROTECTED_FILES } from "../config/constitution";
import { eventBus } from "./eventBus";
import { thoughtStreamService } from "./thoughtStreamService";

export interface SafetyViolation {
  lawId: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  message: string;
  blockedAction?: string;
}

class SafetyService {
  private isRootMode = false;

  constructor() {
    console.log("[SAFETY_SERVICE] Constitutional Sentinel Active");
  }

  /**
   * Set Root Mode (Only via explicit Operator Handshake)
   */
  public setRootMode(enabled: boolean) {
    this.isRootMode = enabled;
    thoughtStreamService.pushThought(
      enabled ? "WARNING" : "OBSERVATION",
      `SAFETY: Root Authorization Mode ${enabled ? "ARMED" : "DISARMED"}`
    );
  }

  /**
   * Check if a file operation is permitted under Law 3
   */
  public isFileOperationPermitted(filePath: string): boolean {
    if (this.isRootMode) return true;

    const isProtected = PROTECTED_FILES.some(f => filePath.includes(f));
    if (isProtected) {
      this.handleViolation({
        lawId: "LAW_3_SELF_EVOLUTION",
        severity: "HIGH",
        message: `Attempted unauthorized modification of protected core file: ${filePath}`,
        blockedAction: "WRITE_FILE"
      });
      return false;
    }

    return true;
  }

  /**
   * Validate a tool call against the Constitution
   */
  public validateAction(actionName: string, params: any): { allowed: boolean; reason?: string } {
    // Law 4: MISSION MODE - High risk actions check
    const highRiskActions = ["NETWORK_EXPLOIT", "FINANCIAL_TX", "DELETE_RECORDS", "RUN_SHELL"];
    
    // Check if the action or its target (in params) constitutes a high-risk move
    const isHighRisk = highRiskActions.includes(actionName.toUpperCase()) || 
                       (params?.command && highRiskActions.some(hr => params.command.includes(hr)));

    if (isHighRisk) {
       // Future: Check for active mission context via missionControlService
       console.log(`[SAFETY_AUDIT] Auditing high-risk action: ${actionName}`, params);
       
       this.handleViolation({
         lawId: "LAW_4_MISSION_MODE",
         severity: "CRITICAL",
         message: `High-risk action [${actionName}] detected. Explicit Mission Authorization required for parameters: ${JSON.stringify(params)}`,
         blockedAction: actionName
       });
       return { allowed: false, reason: "MISSION_MODE_REQUIRED" };
    }

    return { allowed: true };
  }

  private handleViolation(violation: SafetyViolation) {
    console.error(`[CONSTITUTIONAL_VIOLATION] [${violation.lawId}] ${violation.message}`);
    
    thoughtStreamService.pushThought(
      "SECURITY",
      `🧠 SAFETY OVERRIDE: ${violation.message}`
    );

    eventBus.emit("safety:violation", violation);
  }

  public getSystemPromptOverride(): string {
    return `
**STRICT CONSTITUTIONAL OVERRIDE**:
Current Status: ${this.isRootMode ? "ROOT_ADMIN_MISSION" : "ENFORCED"}
You must adhere to the LUCA Constitution. Protected files are currently ${this.isRootMode ? "UNLOCKED" : "LOCKED"}.
`;
  }
}

export const safetyService = new SafetyService();

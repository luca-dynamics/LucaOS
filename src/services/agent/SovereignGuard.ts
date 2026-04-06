/**
 * SOVEREIGN GUARD (The Shield)
 * Fast-path safety classifier for OS-level shell commands.
 * Ported and enhanced from OpenClaude's permission-mode kernels.
 */

export interface GuardVerdict {
  status: "SAFE" | "DANGEROUS" | "SUSPICIOUS";
  reason?: string;
  remediation?: string;
}

export class SovereignGuard {
  private static instance: SovereignGuard;

  // Cross-platform code-execution entry points
  private static readonly INTERPRETERS = [
    "python", "python3", "python2", "node", "deno", "tsx", "ruby", "perl", "php", "lua",
    "bash", "sh", "zsh", "fish", "powershell", "pwsh", "cmd", "ssh"
  ];

  // Dangerous patterns that could lead to OS compromise or data exfiltration
  private static readonly DANGEROUS_PATTERNS = [
    "rm -rf /", "mkfs", "dd if=", "> /dev/", "chmod -R 777", "chown -R",
    "curl | sh", "wget | sh", "nc -e", "netcat -e", "bash -i", "/etc/shadow", "/etc/passwd",
    "sudo ", "su -", "eval ", "exec ", "xargs ", "kill -9", "pkill"
  ];

  // Patterns that warrant a "Sovereign Warning" but not a hard stop
  private static readonly SUSPICIOUS_PATTERNS = [
    "git push --force", "npm publish", "docker stop", "docker rm", "ps aux", "netstat",
    "gh api", "aws s3 sync", "gcloud auth"
  ];

  private constructor() {}

  public static getInstance(): SovereignGuard {
    if (!SovereignGuard.instance) {
      SovereignGuard.instance = new SovereignGuard();
    }
    return SovereignGuard.instance;
  }

  /**
   * Classify a shell command for safety.
   */
  public classifyCommand(cmd: string): GuardVerdict {
    const trimmedCmd = cmd.trim().toLowerCase();

    // 1. HARD STOP: Critical OS threats
    for (const pattern of SovereignGuard.DANGEROUS_PATTERNS) {
      if (trimmedCmd.includes(pattern.toLowerCase())) {
        return {
          status: "DANGEROUS",
          reason: `Detected critical threat pattern: "${pattern}"`,
          remediation: "Execution blocked. This command could compromise the host OS. Use specialized tools or manual elevation if necessary."
        };
      }
    }

    // 2. WARNING: Potentially destructive state changes
    for (const pattern of SovereignGuard.SUSPICIOUS_PATTERNS) {
      if (trimmedCmd.includes(pattern.toLowerCase())) {
        return {
          status: "SUSPICIOUS",
          reason: `Detected suspicious state-change: "${pattern}"`,
          remediation: "Proceed with caution. This command modifies global project or system state."
        };
      }
    }

    // 3. INTERPRETER DETECTION: Flagging hidden arbitrary code
    const baseCmd = trimmedCmd.split(" ")[0];
    if (SovereignGuard.INTERPRETERS.includes(baseCmd)) {
        // High risk if passing code strings directly
        if (trimmedCmd.includes("-c ") || trimmedCmd.includes("-e ")) {
            return {
                status: "SUSPICIOUS",
                reason: `Indirect code execution via interpreter: "${baseCmd}"`,
                remediation: "Verify the script being executed before proceeding."
            };
        }
    }

    return { status: "SAFE" };
  }

  /**
   * High-level validation for shell tools.
   * Throws an error if the command is prohibited.
   */
  public validateShellAction(cmd: string): void {
    const verdict = this.classifyCommand(cmd);
    
    if (verdict.status === "DANGEROUS") {
      throw new Error(`[SOVEREIGN_GUARD] BLOCKED: ${verdict.reason}. ${verdict.remediation}`);
    }

    if (verdict.status === "SUSPICIOUS") {
      console.warn(`[SOVEREIGN_GUARD] WARNING: ${verdict.reason}.`);
    }
  }
}

export const sovereignGuard = SovereignGuard.getInstance();

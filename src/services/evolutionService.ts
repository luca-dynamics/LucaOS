import fs from "fs";
import path from "path";
import { exec } from "child_process";
import util from "util";

const execPromise = util.promisify(exec);

export interface EvolutionResult {
  success: boolean;
  message: string;
  output?: string;
}

/**
 * Evolution Service
 * 
 * Manages the self-patching lifecycle for LUCA OS.
 * SAFETY: Only available in "God Mode" (Development Environment).
 */
class EvolutionService {
  private sandboxDir: string;
  private backupDir: string;
  private isSovereignActive: boolean = false;

  constructor() {
    const cwd = typeof process !== "undefined" && process.cwd ? process.cwd() : "/tmp";
    this.sandboxDir = path.join(cwd, "temp_nofx_v2", "sandbox");
    this.backupDir = path.join(cwd, "temp_nofx_v2", "backups");

    // Check for God Mode / Dev Environment
    this.isSovereignActive = this.checkEvolutionAuthority();

    if (this.isSovereignActive) {
      this.ensureDirs();
    } else {
      console.warn("[EVOLUTION] Sovereign Authority NOT detected. Evolution features are dormant.");
    }
  }

  private checkEvolutionAuthority(): boolean {
      // 1. Check for explicit dev mode flag
      const isDevVar = typeof __LUCA_DEV_MODE__ !== "undefined" && __LUCA_DEV_MODE__;
      
      // 2. Check current process environment
      const isLocal = typeof process !== "undefined" && process.env && process.env.NODE_ENV === "development";
      
      // 3. Electron development check
      const isElectronDev = typeof process !== "undefined" && process.env && !!process.env.ELECTRON_IS_DEV;

      return !!(isDevVar || isLocal || isElectronDev);
  }

  /**
   * SAFETY GATE: Throws if evolution is attempted in a production binary.
   */
  private verifyAuthority() {
    if (!this.isSovereignActive) {
      throw new Error("[SECURITY_VIOLATION] Evolution operations are strictly prohibited in the current environment.");
    }
  }

  private ensureDirs() {
    if (typeof fs === "undefined" || !fs.existsSync) return;
    if (!fs.existsSync(this.sandboxDir)) fs.mkdirSync(this.sandboxDir, { recursive: true });
    if (!fs.existsSync(this.backupDir)) fs.mkdirSync(this.backupDir, { recursive: true });
  }

  /**
   * Stage 1: Create a Sandbox Environment
   */
  public async createSandbox(targetPath: string): Promise<string> {
    this.verifyAuthority();
    const fileName = path.basename(targetPath);
    const sandboxPath = path.join(this.sandboxDir, fileName);

    fs.copyFileSync(targetPath, sandboxPath);
    console.log(`[EVOLUTION] Created sandbox for ${fileName}`);
    return sandboxPath;
  }

  /**
   * Stage 2: Apply Mutation
   */
  public async applyMutation(sandboxPath: string, code: string): Promise<void> {
    this.verifyAuthority();
    fs.writeFileSync(sandboxPath, code, "utf8");
    console.log(`[EVOLUTION] Mutated ${path.basename(sandboxPath)}`);
  }

  /**
   * Stage 3: Verify Mutation
   */
  public async verifyMutation(
    sandboxPath: string,
    verificationCommand?: string,
  ): Promise<EvolutionResult> {
    this.verifyAuthority();
    try {
      let cmd = verificationCommand;
      if (!cmd) {
        cmd = `npx tsc ${sandboxPath} --noEmit --esModuleInterop --skipLibCheck`;
      }

      console.log(`[EVOLUTION] Verifying: ${cmd}`);
      const { stdout } = await execPromise(cmd);
      return { success: true, message: "Verification Passed", output: stdout };
    } catch (error: any) {
      return {
        success: false,
        message: "Verification Failed",
        output: error.stdout || error.message,
      };
    }
  }

  /**
   * Stage 4: Commit Evolution
   */
  public async commitEvolution(
    sandboxPath: string,
    targetPath: string,
  ): Promise<void> {
    this.verifyAuthority();
    
    // 1. Backup original
    const fileName = path.basename(targetPath);
    const backupPath = path.join(this.backupDir, `${fileName}.${Date.now()}.bak`);
    fs.copyFileSync(targetPath, backupPath);

    // 2. Overwrite
    fs.copyFileSync(sandboxPath, targetPath);
    console.log(`[EVOLUTION] Committed evolution to ${targetPath}`);
  }
}

export const evolutionService = new EvolutionService();
export default evolutionService;

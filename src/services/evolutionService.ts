import fs from "fs";
import path from "path";
import { exec } from "child_process";
import util from "util";

const execPromise = util.promisify(exec);

// Configuration
// const SANDBOX_DIR = path.join(process.cwd(), "temp_nofx_v2", "sandbox");
// const BACKUP_DIR = path.join(process.cwd(), "temp_nofx_v2", "backups");

export interface EvolutionResult {
  success: boolean;
  message: string;
  output?: string;
}

class EvolutionService {
  private sandboxDir: string;
  private backupDir: string;

  constructor() {
    const cwd =
      typeof process !== "undefined" && process.cwd ? process.cwd() : "/tmp";
    this.sandboxDir = path.join(cwd, "temp_nofx_v2", "sandbox");
    this.backupDir = path.join(cwd, "temp_nofx_v2", "backups");

    this.ensureDirs();
  }

  private ensureDirs() {
    // Only attempt invalid FS ops if in Node
    if (typeof fs === "undefined" || !fs.existsSync) return;

    if (!fs.existsSync(this.sandboxDir))
      fs.mkdirSync(this.sandboxDir, { recursive: true });
    if (!fs.existsSync(this.backupDir))
      fs.mkdirSync(this.backupDir, { recursive: true });
  }

  /**
   * Stage 1: Create a Sandbox Environment
   * Copies the target file to the sandbox directory.
   */
  public async createSandbox(targetPath: string): Promise<string> {
    const fileName = path.basename(targetPath);
    const sandboxPath = path.join(this.sandboxDir, fileName);

    // Copy file
    fs.copyFileSync(targetPath, sandboxPath);
    console.log(`[EVOLUTION] Created sandbox for ${fileName}`);
    return sandboxPath;
  }

  /**
   * Stage 2: Apply Mutation
   * Writes the new AI-generated code to the sandboxed file.
   */
  public async applyMutation(sandboxPath: string, code: string): Promise<void> {
    fs.writeFileSync(sandboxPath, code, "utf8");
    console.log(`[EVOLUTION] Mutated ${path.basename(sandboxPath)}`);
  }

  /**
   * Stage 3: Verify Mutation (The Filter)
   * Runs a verification command (e.g., test runner or compile check).
   * For now, we will run a basic syntax/compile check if it's a TS file.
   */
  public async verifyMutation(
    sandboxPath: string,
    verificationCommand?: string,
  ): Promise<EvolutionResult> {
    const fileName = path.basename(sandboxPath);

    try {
      // Default Verification: Try to compile just this file (syntax check)
      // This is weak, but better than nothing.
      // DGM uses 'pytest'. We can check if there is a corresponding .test.ts file.

      let cmd = verificationCommand;
      if (!cmd) {
        // Quick syntax check using tsc
        cmd = `npx tsc ${sandboxPath} --noEmit --esModuleInterop --skipLibCheck`;
      }

      console.log(`[EVOLUTION] Verifying: ${cmd}`);
      const { stdout, stderr } = await execPromise(cmd);
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
   * If verification passed, overwrite the original file.
   */
  public async commitEvolution(
    sandboxPath: string,
    targetPath: string,
  ): Promise<void> {
    // 1. Backup original
    const fileName = path.basename(targetPath);
    const backupPath = path.join(
      this.backupDir,
      `${fileName}.${Date.now()}.bak`,
    );
    fs.copyFileSync(targetPath, backupPath);

    // 2. Overwrite
    fs.copyFileSync(sandboxPath, targetPath);
    console.log(`[EVOLUTION] Committed evolution to ${targetPath}`);
  }
}

export const evolutionService = new EvolutionService();

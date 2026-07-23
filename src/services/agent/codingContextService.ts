import * as fs from "fs";
import * as path from "path";

export interface CodingContextSnapshot {
  isCodingWorkspace: boolean;
  workspacePath: string;
  detectedMarkers: string[];
  gitBranch?: string;
  cachedAt: number;
}

export class CodingContextService {
  private cache = new Map<string, CodingContextSnapshot>();

  private static PROJECT_MARKERS = [
    "package.json",
    "tsconfig.json",
    "pyproject.toml",
    "requirements.txt",
    "setup.py",
    "Cargo.toml",
    "go.mod",
    "pom.xml",
    "build.gradle",
    "deno.json",
    ".git",
  ];

  /**
   * Detects whether a directory is a coding workspace by inspecting project markers
   */
  public detectCodingPosture(workspaceDir: string = process.cwd()): boolean {
    const markers = this.scanProjectMarkers(workspaceDir);
    return markers.length > 0;
  }

  /**
   * Scans project markers in the workspace directory
   */
  public scanProjectMarkers(workspaceDir: string = process.cwd()): string[] {
    const found: string[] = [];

    // Check direct existsSync
    for (const marker of CodingContextService.PROJECT_MARKERS) {
      const markerPath = path.join(workspaceDir, marker);
      try {
        if (fs.existsSync(markerPath)) {
          found.push(marker);
        }
      } catch {
        // Ignore fs errors
      }
    }

    if (found.length === 0) {
      try {
        if (fs.existsSync(workspaceDir) && fs.readdirSync) {
          const files = fs.readdirSync(workspaceDir);
          for (const marker of CodingContextService.PROJECT_MARKERS) {
            if (files.includes(marker)) {
              found.push(marker);
            }
          }
        }
      } catch {
        // Ignore read errors
      }
    }

    return found;
  }

  /**
   * Resolves and caches the CodingContextSnapshot ONCE per session to preserve LLM prompt caches
   */
  public getCachedCodingContext(workspaceDir: string = process.cwd()): CodingContextSnapshot {
    const normalizedDir = path.resolve(workspaceDir);
    if (this.cache.has(normalizedDir)) {
      return this.cache.get(normalizedDir)!;
    }

    const detectedMarkers = this.scanProjectMarkers(normalizedDir);
    const isCodingWorkspace = detectedMarkers.length > 0;
    const gitBranch = this.detectGitBranch(normalizedDir);

    const snapshot: CodingContextSnapshot = {
      isCodingWorkspace,
      workspacePath: normalizedDir,
      detectedMarkers,
      gitBranch,
      cachedAt: Date.now(),
    };

    this.cache.set(normalizedDir, snapshot);
    console.log(
      `[CODING_CONTEXT] Cached workspace posture for ${normalizedDir} (Coding: ${isCodingWorkspace}, Markers: ${detectedMarkers.join(", ")})`
    );
    return snapshot;
  }

  /**
   * Generates a byte-stable system prompt brief for lucaService.ts
   */
  public getSystemPromptBrief(workspaceDir: string = process.cwd()): string {
    const snapshot = this.getCachedCodingContext(workspaceDir);
    if (!snapshot.isCodingWorkspace) {
      return (
        `**RUNTIME POSTURE**: Sovereign Host AI OS (Universal Mode).\n` +
        `- Active Surface: Host Desktop, Vision, Voice HUD, & System Automation.\n` +
        `- Prompt Cache Safety: Active (Snapshot cached at session start).`
      );
    }

    let brief = `**RUNTIME POSTURE**: Autonomous Pair-Programmer (Code Workspace Mode).\n`;
    brief += `- Workspace Root: ${path.basename(snapshot.workspacePath)}\n`;
    brief += `- Detected Markers: ${snapshot.detectedMarkers.join(", ")}\n`;
    if (snapshot.gitBranch) {
      brief += `- Active Git Branch: ${snapshot.gitBranch}\n`;
    }
    brief += `- Prompt Cache Safety: Active (Snapshot cached at session start).`;
    return brief;
  }

  /**
   * Clears cached workspace snapshots
   */
  public clearCache(): void {
    this.cache.clear();
  }

  private detectGitBranch(workspaceDir: string): string | undefined {
    try {
      const headPath = path.join(workspaceDir, ".git", "HEAD");
      if (fs.existsSync(headPath)) {
        const content = fs.readFileSync(headPath, "utf8").trim();
        if (content.startsWith("ref: refs/heads/")) {
          return content.replace("ref: refs/heads/", "");
        }
      }
    } catch {
      // Ignore git read errors
    }
    return undefined;
  }
}

export const codingContextService = new CodingContextService();

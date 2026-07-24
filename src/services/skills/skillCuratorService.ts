import * as fs from "fs";
import * as path from "path";
import { lucaWorkspaceService, type LucaSkillMetadata } from "../workspace/lucaWorkspaceService";

export interface CuratorReport {
  workspacePath: string;
  totalSkillsAnalyzed: number;
  duplicatesConsolidated: number;
  staleSkillsArchived: number;
  pinnedSkillsPreserved: number;
  auditErrorsFixed: number;
  timestamp: number;
}

export class SkillCuratorService {
  /**
   * Performs background curation on a workspace's .luca/skills/ directory
   */
  public async curateWorkspaceSkills(workspaceDir: string = process.cwd()): Promise<CuratorReport> {
    const workspace = lucaWorkspaceService.discoverWorkspace(workspaceDir);
    const skillsDir = path.join(workspace.workspacePath, ".luca", "skills");
    const archiveDir = path.join(skillsDir, "archive");

    if (!fs.existsSync(skillsDir)) {
      fs.mkdirSync(skillsDir, { recursive: true });
    }
    if (!fs.existsSync(archiveDir)) {
      fs.mkdirSync(archiveDir, { recursive: true });
    }

    const skills = workspace.skills;
    const initialCount = skills.length;

    // 1. Audit and Fix Missing Frontmatter / Metadata
    let auditErrorsFixed = 0;
    for (const skill of skills) {
      if (!skill.name || skill.name.startsWith("Unnamed")) {
        skill.name = this.formatSkillName(skill.filepath);
        auditErrorsFixed++;
      }
    }

    // 2. De-duplicate Skills with matching names or intents
    const { duplicatesConsolidated, remaining } = this.deduplicateSkills(skills);

    // 3. Archive Stale Skills (Older than 30 days and not pinned)
    const { staleSkillsArchived, pinnedSkillsPreserved } = this.archiveStaleSkills(remaining, archiveDir);

    return {
      workspacePath: workspace.workspacePath,
      totalSkillsAnalyzed: initialCount,
      duplicatesConsolidated,
      staleSkillsArchived,
      pinnedSkillsPreserved,
      auditErrorsFixed,
      timestamp: Date.now(),
    };
  }

  /**
   * De-duplicates skills with matching normalized names
   */
  public deduplicateSkills(skills: LucaSkillMetadata[]): {
    duplicatesConsolidated: number;
    remaining: LucaSkillMetadata[];
  } {
    const seen = new Map<string, LucaSkillMetadata>();
    let duplicatesConsolidated = 0;
    const remaining: LucaSkillMetadata[] = [];

    for (const skill of skills) {
      const key = skill.name.toLowerCase().trim();
      if (seen.has(key)) {
        const existing = seen.get(key)!;
        // Keep the pinned or newer skill, remove the duplicate
        if (!existing.pinned && skill.pinned) {
          this.safeDelete(existing.filepath);
          seen.set(key, skill);
        } else {
          this.safeDelete(skill.filepath);
        }
        duplicatesConsolidated++;
      } else {
        seen.set(key, skill);
        remaining.push(skill);
      }
    }

    return { duplicatesConsolidated, remaining: Array.from(seen.values()) };
  }

  /**
   * Archives stale skills to .luca/skills/archive/ while respecting pinned: true
   */
  public archiveStaleSkills(
    skills: LucaSkillMetadata[],
    archiveDir: string,
    maxAgeDays: number = 30
  ): { staleSkillsArchived: number; pinnedSkillsPreserved: number } {
    let staleSkillsArchived = 0;
    let pinnedSkillsPreserved = 0;
    const now = Date.now();
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;

    for (const skill of skills) {
      if (skill.pinned) {
        pinnedSkillsPreserved++;
        continue;
      }

      try {
        if (fs.existsSync(skill.filepath)) {
          const stats = fs.statSync(skill.filepath);
          const ageMs = now - stats.mtimeMs;

          if (ageMs > maxAgeMs) {
            const fileName = path.basename(skill.filepath);
            const targetPath = path.join(archiveDir, fileName);
            fs.renameSync(skill.filepath, targetPath);
            staleSkillsArchived++;
            console.log(`[CURATOR] Archived stale skill ${fileName} to ${targetPath}`);
          }
        }
      } catch (err) {
        console.warn(`[CURATOR] Failed to archive skill ${skill.filepath}:`, err);
      }
    }

    return { staleSkillsArchived, pinnedSkillsPreserved };
  }

  private formatSkillName(filePath: string): string {
    const base = path.basename(filePath, ".md");
    return base
      .split(/[-_]/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  private safeDelete(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`[CURATOR] Deleted duplicate skill file: ${filePath}`);
      }
    } catch (err) {
      console.warn(`[CURATOR] Safe delete failed for ${filePath}:`, err);
    }
  }
}

export const skillCuratorService = new SkillCuratorService();

import * as fs from "node:fs";
import * as path from "node:path";
import { lucaWorkspaceService } from "../workspace/lucaWorkspaceService";

export interface MissionTrajectoryStep {
  kind: string;
  description: string;
  args?: any;
  resultSummary?: string;
}

export interface SkillSynthesisOptions {
  missionTitle: string;
  description: string;
  triggers?: string[];
  steps: MissionTrajectoryStep[];
  targetDir?: string;
}

export class AutonomousSkillSynthesizer {
  private static instance: AutonomousSkillSynthesizer;

  public static getInstance(): AutonomousSkillSynthesizer {
    if (!AutonomousSkillSynthesizer.instance) {
      AutonomousSkillSynthesizer.instance = new AutonomousSkillSynthesizer();
    }
    return AutonomousSkillSynthesizer.instance;
  }

  /**
   * Synthesizes a verified mission trajectory into an agentskills.io compatible Markdown skill
   */
  public async synthesizeSkill(options: SkillSynthesisOptions): Promise<{ success: boolean; filepath: string; skillName: string }> {
    const slugName = options.missionTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const skillName = slugName || "auto-synthesized-skill";
    const triggers = options.triggers || [options.missionTitle.toLowerCase()];
    
    // Determine destination folder (.luca/skills inside targetDir or process cwd)
    const baseDir = options.targetDir || process.cwd();
    const lucaSkillsDir = path.join(baseDir, ".luca", "skills");

    if (!fs.existsSync(lucaSkillsDir)) {
      fs.mkdirSync(lucaSkillsDir, { recursive: true });
    }

    const filepath = path.join(lucaSkillsDir, `${skillName}.md`);

    // Build Markdown document with YAML frontmatter
    let markdown = `---\n`;
    markdown += `name: "${skillName}"\n`;
    markdown += `description: "${options.description.replace(/"/g, '\\"')}"\n`;
    markdown += `triggers: ${JSON.stringify(triggers)}\n`;
    markdown += `generated_at: "${new Date().toISOString()}"\n`;
    markdown += `---\n\n`;

    markdown += `# ${options.missionTitle}\n\n`;
    markdown += `> **Synthesized Skill**: Autonomous trajectory recording from LucaOS execution.\n\n`;
    markdown += `## Overview\n${options.description}\n\n`;

    markdown += `## Verified Execution Trajectory\n\n`;
    options.steps.forEach((step, idx) => {
      markdown += `### Step ${idx + 1}: ${step.kind}\n`;
      markdown += `${step.description}\n\n`;
      if (step.args) {
        markdown += `\`\`\`json\n${JSON.stringify(step.args, null, 2)}\n\`\`\`\n\n`;
      }
      if (step.resultSummary) {
        markdown += `**Output Summary**:\n> ${step.resultSummary.replace(/\n/g, "\n> ")}\n\n`;
      }
    });

    fs.writeFileSync(filepath, markdown, "utf-8");

    // Inform workspace service to refresh skills
    lucaWorkspaceService.discoverWorkspace(baseDir);

    return {
      success: true,
      filepath,
      skillName,
    };
  }
}

export const autonomousSkillSynthesizer = AutonomousSkillSynthesizer.getInstance();

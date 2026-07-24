import * as fs from "node:fs";
import * as path from "node:path";

export interface LucaSkillMetadata {
  name: string;
  description: string;
  triggers: string[];
  filepath: string;
  content: string;
  frontmatter: Record<string, any>;
  pinned?: boolean;
}

export interface LucaWorkspaceConfig {
  name?: string;
  version?: string;
  permissionOverrides?: Record<string, string>;
  enabledTools?: string[];
  disabledTools?: string[];
  customEnv?: Record<string, string>;
}

export interface LucaWorkspaceInfo {
  workspacePath: string;
  hasLucaDir: boolean;
  rules: string[];
  skills: LucaSkillMetadata[];
  config: LucaWorkspaceConfig;
}

export class LucaWorkspaceService {
  private static instance: LucaWorkspaceService;

  public static getInstance(): LucaWorkspaceService {
    if (!LucaWorkspaceService.instance) {
      LucaWorkspaceService.instance = new LucaWorkspaceService();
    }
    return LucaWorkspaceService.instance;
  }

  /**
   * Scaffolds a new .luca directory in the specified project directory
   */
  public async initWorkspace(projectDir: string): Promise<LucaWorkspaceInfo> {
    const lucaDir = path.join(projectDir, ".luca");
    const skillsDir = path.join(lucaDir, "skills");
    const rulesDir = path.join(lucaDir, "rules");
    const memoryDir = path.join(lucaDir, "memory");

    if (!fs.existsSync(lucaDir)) {
      fs.mkdirSync(lucaDir, { recursive: true });
    }
    if (!fs.existsSync(skillsDir)) {
      fs.mkdirSync(skillsDir, { recursive: true });
    }
    if (!fs.existsSync(rulesDir)) {
      fs.mkdirSync(rulesDir, { recursive: true });
    }
    if (!fs.existsSync(memoryDir)) {
      fs.mkdirSync(memoryDir, { recursive: true });
    }

    // Default LUCA.md
    const lucaMdPath = path.join(lucaDir, "LUCA.md");
    if (!fs.existsSync(lucaMdPath)) {
      const defaultLucaMd = `# .luca Workspace Directives\n\nThis file contains project-specific instructions for LucaOS.\n\n## Guidelines\n- Adhere to existing code formatting and architectural patterns.\n- Run verification tests after modifying source files.\n`;
      fs.writeFileSync(lucaMdPath, defaultLucaMd, "utf-8");
    }

    // Default config.json
    const configPath = path.join(lucaDir, "config.json");
    if (!fs.existsSync(configPath)) {
      const defaultConfig: LucaWorkspaceConfig = {
        name: path.basename(projectDir),
        version: "1.0.0",
        permissionOverrides: {},
        enabledTools: [],
      };
      fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2), "utf-8");
    }

    // Default sample skill
    const sampleSkillPath = path.join(skillsDir, "workspace-health-check.md");
    if (!fs.existsSync(sampleSkillPath)) {
      const sampleSkill = `---
name: workspace-health-check
description: Verifies repository status, unit test suite, and dependencies
triggers: ["health check", "verify project", "status check"]
---

# Workspace Health Check Skill

When checking project status:
1. Verify git working directory status
2. Execute test runner if package.json exists
3. Check node_modules presence
`;
      fs.writeFileSync(sampleSkillPath, sampleSkill, "utf-8");
    }

    return this.discoverWorkspace(projectDir);
  }

  /**
   * Scans a directory for .luca configuration, rules, and markdown skills
   */
  public discoverWorkspace(projectDir: string): LucaWorkspaceInfo {
    const lucaDir = path.join(projectDir, ".luca");
    const hasLucaDir = fs.existsSync(lucaDir) && fs.statSync(lucaDir).isDirectory();

    if (!hasLucaDir) {
      return {
        workspacePath: projectDir,
        hasLucaDir: false,
        rules: [],
        skills: [],
        config: {},
      };
    }

    const rules = this.loadWorkspaceRules(lucaDir);
    const skills = this.loadWorkspaceSkills(path.join(lucaDir, "skills"));
    const config = this.loadWorkspaceConfig(path.join(lucaDir, "config.json"));

    return {
      workspacePath: projectDir,
      hasLucaDir: true,
      rules,
      skills,
      config,
    };
  }

  private loadWorkspaceRules(lucaDir: string): string[] {
    const rules: string[] = [];

    const lucaMdPath = path.join(lucaDir, "LUCA.md");
    if (fs.existsSync(lucaMdPath)) {
      rules.push(fs.readFileSync(lucaMdPath, "utf-8"));
    }

    const rulesDir = path.join(lucaDir, "rules");
    if (fs.existsSync(rulesDir) && fs.statSync(rulesDir).isDirectory()) {
      const files = fs.readdirSync(rulesDir);
      for (const file of files) {
        if (file.endsWith(".md")) {
          rules.push(fs.readFileSync(path.join(rulesDir, file), "utf-8"));
        }
      }
    }

    return rules;
  }

  private loadWorkspaceSkills(skillsDir: string): LucaSkillMetadata[] {
    const skills: LucaSkillMetadata[] = [];
    if (!fs.existsSync(skillsDir) || !fs.statSync(skillsDir).isDirectory()) {
      return skills;
    }

    const files = fs.readdirSync(skillsDir);
    for (const file of files) {
      if (file.endsWith(".md")) {
        const fullPath = path.join(skillsDir, file);
        const content = fs.readFileSync(fullPath, "utf-8");
        const parsed = this.parseMarkdownSkill(fullPath, content);
        if (parsed) {
          skills.push(parsed);
        }
      }
    }

    return skills;
  }

  private loadWorkspaceConfig(configPath: string): LucaWorkspaceConfig {
    if (!fs.existsSync(configPath)) return {};
    try {
      return JSON.parse(fs.readFileSync(configPath, "utf-8"));
    } catch {
      return {};
    }
  }

  /**
   * Helper to parse YAML frontmatter from a Markdown skill file
   */
  public parseMarkdownSkill(filepath: string, rawContent: string): LucaSkillMetadata | null {
    const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
    const match = rawContent.match(frontmatterRegex);

    if (!match) {
      return {
        name: path.basename(filepath, ".md"),
        description: "",
        triggers: [],
        filepath,
        content: rawContent,
        frontmatter: {},
      };
    }

    const yamlBlock = match[1];
    const markdownBody = match[2];
    const frontmatter: Record<string, any> = {};

    for (const line of yamlBlock.split("\n")) {
      const parts = line.split(":");
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const rawVal = parts.slice(1).join(":").trim();
        if (rawVal.startsWith("[") && rawVal.endsWith("]")) {
          try {
            frontmatter[key] = JSON.parse(rawVal.replace(/'/g, '"'));
          } catch {
            frontmatter[key] = rawVal;
          }
        } else {
          frontmatter[key] = rawVal.replace(/^["']|["']$/g, "");
        }
      }
    }

    return {
      name: frontmatter.name || path.basename(filepath, ".md"),
      description: frontmatter.description || "",
      triggers: Array.isArray(frontmatter.triggers) ? frontmatter.triggers : [],
      filepath,
      content: markdownBody,
      frontmatter,
    };
  }
}

export const lucaWorkspaceService = LucaWorkspaceService.getInstance();

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { lucaWorkspaceService } from "./lucaWorkspaceService";
import { autonomousSkillSynthesizer } from "../skills/autonomousSkillSynthesizer";

describe("LucaWorkspaceService & .luca Ecosystem", () => {
  let tempDir: string;

  beforeEach(() => {
    const baseTmp = typeof os.tmpdir === "function" ? os.tmpdir() : path.join(process.cwd(), "tmp");
    if (!fs.existsSync(baseTmp)) fs.mkdirSync(baseTmp, { recursive: true });
    tempDir = fs.mkdtempSync(path.join(baseTmp, "luca-test-workspace-"));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("scaffolds .luca directory structure with LUCA.md, config.json, and sample skills", async () => {
    const workspace = await lucaWorkspaceService.initWorkspace(tempDir);

    expect(workspace.hasLucaDir).toBe(true);
    expect(fs.existsSync(path.join(tempDir, ".luca", "LUCA.md"))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, ".luca", "config.json"))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, ".luca", "skills"))).toBe(true);
    expect(workspace.rules.length).toBeGreaterThan(0);
    expect(workspace.skills.length).toBeGreaterThan(0);
  });

  it("parses YAML frontmatter and markdown body from .md skill file correctly", () => {
    const rawSkill = `---
name: test-skill
description: "Sample test skill"
triggers: ["test", "demo"]
---

# Test Skill
This is the skill body.
`;
    const parsed = lucaWorkspaceService.parseMarkdownSkill("/path/to/test-skill.md", rawSkill);

    expect(parsed).not.toBeNull();
    expect(parsed?.name).toBe("test-skill");
    expect(parsed?.description).toBe("Sample test skill");
    expect(parsed?.triggers).toEqual(["test", "demo"]);
    expect(parsed?.content).toContain("# Test Skill");
  });

  it("synthesizes trajectory steps into a valid .luca/skills/*.md document", async () => {
    await lucaWorkspaceService.initWorkspace(tempDir);

    const result = await autonomousSkillSynthesizer.synthesizeSkill({
      targetDir: tempDir,
      missionTitle: "Database Migration Audit",
      description: "Audits local schema against remote migrations",
      triggers: ["audit db", "check schema"],
      steps: [
        { kind: "terminal", description: "Ran git diff migrations", resultSummary: "No conflicts" },
        { kind: "execute_script", description: "Checked table definitions", resultSummary: "12 tables verified" },
      ],
    });

    expect(result.success).toBe(true);
    expect(fs.existsSync(result.filepath)).toBe(true);

    const workspace = lucaWorkspaceService.discoverWorkspace(tempDir);
    const synthesizedSkill = workspace.skills.find(s => s.name === "database-migration-audit");

    expect(synthesizedSkill).toBeDefined();
    expect(synthesizedSkill?.description).toBe("Audits local schema against remote migrations");
    expect(synthesizedSkill?.triggers).toEqual(["audit db", "check schema"]);
  });
});

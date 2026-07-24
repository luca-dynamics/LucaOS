import { describe, expect, it, beforeEach } from "vitest";
import { SkillCuratorService } from "./skillCuratorService";
import type { LucaSkillMetadata } from "../workspace/lucaWorkspaceService";

describe("SkillCuratorService", () => {
  let curator: SkillCuratorService;

  beforeEach(() => {
    curator = new SkillCuratorService();
  });

  it("deduplicates skills with matching names", () => {
    const mockSkills: LucaSkillMetadata[] = [
      {
        name: "Deploy App",
        description: "Deploys application to staging",
        triggers: ["deploy"],
        filepath: "/tmp/.luca/skills/deploy-app.md",
        content: "# Deploy App",
        frontmatter: {},
      },
      {
        name: "Deploy App",
        description: "Duplicate deploy app skill",
        triggers: ["deploy"],
        filepath: "/tmp/.luca/skills/deploy-app-duplicate.md",
        content: "# Deploy App Duplicate",
        frontmatter: {},
      },
    ];

    const { duplicatesConsolidated, remaining } = curator.deduplicateSkills(mockSkills);

    expect(duplicatesConsolidated).toBe(1);
    expect(remaining.length).toBe(1);
    expect(remaining[0].name).toBe("Deploy App");
  });

  it("preserves pinned skills during deduplication", () => {
    const mockSkills: LucaSkillMetadata[] = [
      {
        name: "Deploy App",
        description: "Unpinned skill",
        triggers: ["deploy"],
        filepath: "/tmp/.luca/skills/deploy-unpinned.md",
        content: "# Unpinned",
        frontmatter: {},
        pinned: false,
      },
      {
        name: "Deploy App",
        description: "Pinned skill",
        triggers: ["deploy"],
        filepath: "/tmp/.luca/skills/deploy-pinned.md",
        content: "# Pinned",
        frontmatter: {},
        pinned: true,
      },
    ];

    const { remaining } = curator.deduplicateSkills(mockSkills);

    expect(remaining.length).toBe(1);
    expect(remaining[0].pinned).toBe(true);
    expect(remaining[0].filepath).toContain("deploy-pinned.md");
  });

  it("archives stale skills older than threshold", () => {
    const mockSkills: LucaSkillMetadata[] = [
      {
        name: "Pinned Skill",
        description: "Should not be archived",
        triggers: ["pinned"],
        filepath: "/tmp/.luca/skills/pinned.md",
        content: "# Pinned",
        frontmatter: {},
        pinned: true,
      },
      {
        name: "Fresh Skill",
        description: "Active skill",
        triggers: ["fresh"],
        filepath: "/tmp/.luca/skills/fresh.md",
        content: "# Fresh",
        frontmatter: {},
        pinned: false,
      },
    ];

    const result = curator.archiveStaleSkills(mockSkills, "/tmp/.luca/skills/archive", 30);

    expect(result.pinnedSkillsPreserved).toBe(1);
    expect(result.staleSkillsArchived).toBe(0);
  });
});


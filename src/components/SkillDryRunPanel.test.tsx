// @vitest-environment jsdom
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { personalIntelligenceSkillDryRunFixtures } from "../personal-intelligence/skillDryRun";
import { SkillDryRunPanel } from "./SkillDryRunPanel";

describe("Skill Dry-run panel", () => {
  it("renders simulated evidence and mandatory safety copy", () => {
    const html = renderToStaticMarkup(<SkillDryRunPanel simulation={personalIntelligenceSkillDryRunFixtures[0]} />);
    expect(html).toContain("Controlled Dry-run Simulation");
    expect(html).toContain("simulation only, no skill execution occurs.");
    expect(html).toContain("The Act stage is skipped.");
    expect(html).toContain("Grant-for-review does not authorize execution.");
    expect(html).toContain("Runtime trace preview");
    expect(html).not.toMatch(/<button[^>]*>\s*(Run|Execute)\s*<\/button>/i);
  });
});

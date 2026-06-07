// @vitest-environment jsdom
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { personalIntelligenceSkillSandboxPlanFixtures } from "../personal-intelligence/skillSandbox";
import SkillsMatrix from "./SkillsMatrix";
import { SkillSandboxPlanPanel } from "./SkillSandboxPlanPanel";

describe("Skill Sandbox Plan panel", () => {
  it("renders planning, approval, trace, rollback, and execution-disabled evidence", () => {
    const html = renderToStaticMarkup(<SkillSandboxPlanPanel plan={personalIntelligenceSkillSandboxPlanFixtures[2]} />);
    expect(html).toContain("Sandbox Plan");
    expect(html).toContain("approval required");
    expect(html).toContain("Runtime trace requirements");
    expect(html).toContain("Rollback expectations");
    expect(html).toContain("Sandbox planning only — skill execution remains disabled.");
    expect(html).toContain("Approval planning does not satisfy approval.");
  });

  it("does not expose an enabled run control or call onExecute", () => {
    const onExecute = vi.fn();
    const html = renderToStaticMarkup(<SkillsMatrix onClose={() => undefined} onExecute={onExecute} />);
    expect(html).not.toMatch(/>\s*(Run|Execute)\s*</);
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Execution disabled<\/button>/);
    expect(onExecute).not.toHaveBeenCalled();
  });
});

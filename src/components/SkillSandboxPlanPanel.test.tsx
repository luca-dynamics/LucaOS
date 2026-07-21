// @vitest-environment jsdom
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { personalIntelligenceSkillSandboxPlanFixtures } from "../personal-intelligence/skillSandbox";
import SkillsMatrix from "./SkillsMatrix";
import { SkillPermissionGrantProvider } from "./SkillPermissionGrantContext";
import { SkillSandboxPlanPanel } from "./SkillSandboxPlanPanel";

describe("Skill Sandbox Plan panel", () => {
  it("renders planning, approval, trace, rollback, and execution-disabled evidence", () => {
    // Prefer a plan that actually requires approval (memory / high-risk fixtures).
    const plan =
      personalIntelligenceSkillSandboxPlanFixtures.find(
        (item) => item.status === "approval_required",
      ) ?? personalIntelligenceSkillSandboxPlanFixtures[0];
    const html = renderToStaticMarkup(<SkillSandboxPlanPanel plan={plan} />);
    expect(html).toContain("Sandbox Plan");
    expect(html).toMatch(/approval required|ready for review|blocked/i);
    expect(html).toContain("Runtime trace requirements");
    expect(html).toContain("Rollback expectations");
    expect(html).toContain("Sandbox planning only — skill execution remains disabled.");
    expect(html).toContain("Approval planning does not satisfy approval.");
  });

  it("does not expose an enabled run or execute control", () => {
    const html = renderToStaticMarkup(<SkillPermissionGrantProvider><SkillsMatrix onClose={() => undefined} /></SkillPermissionGrantProvider>);
    expect(html).not.toMatch(/>\s*(Run|Execute)\s*</);
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Execution disabled<\/button>/);
  });
});

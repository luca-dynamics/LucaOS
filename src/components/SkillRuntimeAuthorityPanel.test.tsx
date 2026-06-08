// @vitest-environment jsdom
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { personalIntelligenceRuntimeAuthorityFixtures } from "../personal-intelligence/runtimeAuthority";
import { SkillRuntimeAuthorityPanel } from "./SkillRuntimeAuthorityPanel";
describe("Skill Runtime Authority panel", () => { it("renders authority safety copy without execution controls", () => { const html=renderToStaticMarkup(<SkillRuntimeAuthorityPanel records={[personalIntelligenceRuntimeAuthorityFixtures[9]]} />); expect(html).toContain("Runtime Authority Boundary"); expect(html).toContain("Runtime authority is not granted."); expect(html).toContain("Future pilot candidate does not mean executable."); expect(html).toContain("Dry-run success and grant-for-review do not authorize execution."); expect(html).not.toMatch(/<button[^>]*>\s*(Run|Execute)\s*<\/button>/i); }); });

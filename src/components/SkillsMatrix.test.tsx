// @vitest-environment jsdom
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import SkillsMatrix from "./SkillsMatrix";

const html = renderToStaticMarkup(<SkillsMatrix onClose={() => undefined} onExecute={() => undefined} />);

describe("existing Dashboard Skills modal registry integration", () => {
  it("renders manifest registry entries inside the existing modal", () => {
    expect(html).toContain("Skill Registry");
    expect(html).toContain("Writing &amp; Formatting Assistant");
    expect(html).toContain("Memory Proposal Helper");
    expect(html).toContain("Blocked System Modifier");
  });

  it("renders explicit execution safety notices", () => {
    expect(html).toContain("Manifest loading only — execution disabled.");
    expect(html).toContain("Skills cannot run, call tools, call models, write memory, access files, use network, or trigger LucaLink in this PR.");
    expect(html).toContain("Execution disabled");
    expect(html).toContain("Sandbox Plan");
    expect(html).toContain("Sandbox planning only — skill execution remains disabled.");
    expect(html).toContain("Approval planning does not satisfy approval.");
  });

  it("has no enabled Run or Execute control", () => {
    expect(html).not.toMatch(/>\s*(Run|Execute)\s*</);
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Execution disabled<\/button>/);
  });
});

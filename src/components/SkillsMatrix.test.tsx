// @vitest-environment jsdom
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import SkillsMatrix from "./SkillsMatrix";
import { SkillPermissionGrantProvider } from "./SkillPermissionGrantContext";

const html = renderToStaticMarkup(<SkillPermissionGrantProvider><SkillsMatrix onClose={() => undefined} /></SkillPermissionGrantProvider>);

describe("existing Dashboard Skills modal registry integration", () => {
  it("renders manifest registry entries inside the existing modal", () => {
    expect(html).toContain("Skill Registry");
    expect(html).toContain("Writing &amp; Formatting Assistant");
    expect(html).toContain("Memory Proposal Helper");
    expect(html).toContain("Blocked System Modifier");
  });

  it("renders explicit execution safety notices", () => {
    expect(html).toMatch(/Live registry|Sample registry/);
    expect(html).toContain("execution disabled");
    expect(html).toContain("These are your real registered skills, shown for inspection only. From here they cannot run, call tools, call models, write memory, access files, use network, or trigger LucaLink.");
    expect(html).toContain("Execution disabled");
    expect(html).toContain("Sandbox Plan");
    expect(html).toContain("Sandbox planning only — skill execution remains disabled.");
    expect(html).toContain("Approval planning does not satisfy approval.");
    expect(html).toContain("Permission Grant Review");
    expect(html).toContain("Ephemeral, scoped review decisions only.");
  });

  it("has no enabled Run or Execute control", () => {
    expect(html).not.toMatch(/>\s*(Run|Execute)\s*</);
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Execution disabled<\/button>/);
  });
});

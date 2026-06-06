// @vitest-environment jsdom
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  createExecutionDoctrinePreview,
  createIdentityProfilePreview,
  createMemoryPreview,
  createSkillManifestPreview,
  evaluateIntegrationReadinessPreview,
} from "../../../personal-intelligence";
import { ExecutionDoctrinePreviewCard } from "./ExecutionDoctrinePreviewCard";
import { IdentityCorePreviewCard } from "./IdentityCorePreviewCard";
import { IntegrationReadinessPreviewCard } from "./IntegrationReadinessPreviewCard";
import { MemoryItemPreviewCard } from "./MemoryItemPreviewCard";
import { PersonalIntelligencePreviewBadge } from "./PersonalIntelligencePreviewBadge";
import { SkillManifestPreviewCard } from "./SkillManifestPreviewCard";

const render = (node: React.ReactElement) => renderToStaticMarkup(node);

const identity = createIdentityProfilePreview({
  userId: "preview-user",
  displayName: "Preview User",
  preferredName: "Preview",
  communicationStyle: "technical",
  lucaPersonality: {
    tone: "calm",
    traits: ["direct"],
    boundaries: ["approval-before-action"],
  },
  activeProjects: ["LucaOS"],
  preferredModels: ["local-first"],
  devicePreferences: [],
  privacyDefaults: { private: "deny" },
});

const memory = createMemoryPreview({
  id: "memory-preview-test",
  kind: "project",
  title: "Preview knowledge",
  content: "A serialization-only test item.",
  source: "unit test",
  confidence: 0.88,
  privacyZone: "private",
  tags: ["preview"],
});

const manifest = createSkillManifestPreview({
  id: "preview-skill",
  name: "Preview Skill",
  description: "A non-executable manifest preview.",
  version: "1.0.0",
  category: "knowledge",
  entrypoint: "skills/preview",
  permissions: [],
  memoryPolicy: { read: ["project"], write: [] },
  requiredModels: [],
  requiredTools: [],
  workflows: [{ id: "review", description: "Review", steps: ["inspect"] }],
  tests: [
    { id: "inert", description: "Is inert", expectedOutcome: "No execution" },
  ],
});

describe("Personal Intelligence preview cards", () => {
  it.each([
    "Preview only",
    "Not saved",
    "Not applied",
    "No execution",
  ] as const)("renders the %s badge", (label) => {
    expect(
      render(<PersonalIntelligencePreviewBadge label={label} />),
    ).toContain(label);
  });

  it("renders Identity Core fields", () => {
    const html = render(<IdentityCorePreviewCard identity={identity} />);
    for (const value of [
      "Communication style",
      "technical",
      "Luca personality",
      "Active projects",
      "Preferred models",
      "Privacy defaults",
    ]) {
      expect(html).toContain(value);
    }
  });

  it("renders memory privacy zone and confidence", () => {
    const html = render(<MemoryItemPreviewCard preview={memory} />);
    expect(html).toContain("Privacy zone");
    expect(html).toContain("private");
    expect(html).toContain("Confidence");
    expect(html).toContain("88%");
  });

  it("renders a skill manifest without loading its entrypoint", () => {
    const html = render(<SkillManifestPreviewCard manifest={manifest} />);
    expect(html).toContain("entrypoint not loaded");
    expect(html).toContain("No execution");
  });

  it("renders all seven doctrine stages", () => {
    const html = render(
      <ExecutionDoctrinePreviewCard
        doctrine={createExecutionDoctrinePreview()}
      />,
    );
    for (const stage of [
      "Sense",
      "Understand",
      "Plan",
      "Approve",
      "Act",
      "Verify",
      "Learn",
    ]) {
      expect(html).toContain(stage);
    }
  });

  it("renders readiness blockers for all live boundaries", () => {
    const html = render(
      <IntegrationReadinessPreviewCard
        readiness={evaluateIntegrationReadinessPreview()}
      />,
    );
    for (const blocker of [
      "Persistence blocked",
      "Network blocked",
      "Execution blocked",
      "Sensitive zones blocked",
    ]) {
      expect(html).toContain(blocker);
    }
  });
});

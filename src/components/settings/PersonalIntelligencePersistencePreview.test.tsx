// @vitest-environment jsdom
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  persistenceProposalPreview,
  PersonalIntelligencePersistencePreview,
} from "./PersonalIntelligencePersistencePreview";

describe("Personal Intelligence persistence Settings preview", () => {
  it("renders proposal-only safety state for the existing Data & Memory surface", () => {
    const markup = renderToStaticMarkup(
      <PersonalIntelligencePersistencePreview />,
    );

    expect(markup).toContain("Persistence Proposal Preview");
    expect(markup).toContain("No storage adapter connected.");
    expect(markup).toContain("Write performed");
    expect(markup).toContain("review_required");
    expect(persistenceProposalPreview.writePerformed).toBe(false);
  });

  it("renders the compact Knowledge Bridge proposal preview", () => {
    const markup = renderToStaticMarkup(
      <PersonalIntelligencePersistencePreview compact />,
    );

    expect(markup).toContain("Memory persistence proposal");
    expect(markup).toContain("Proposed path");
    expect(markup).toContain("Explicit user approval required");
  });
});

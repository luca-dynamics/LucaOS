// @vitest-environment jsdom
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { personalIntelligenceReviewWorkflowGraphFixture } from "../../personal-intelligence/reviewWorkflow";
import PersonalIntelligenceReviewWorkflowPanel from "./PersonalIntelligenceReviewWorkflowPanel";

describe("PersonalIntelligenceReviewWorkflowPanel", () => {
  it("renders preview-only and persistence-deferred language", () => {
    const html = renderToStaticMarkup(
      <PersonalIntelligenceReviewWorkflowPanel
        graph={personalIntelligenceReviewWorkflowGraphFixture}
        mode="basic"
        now={new Date("2026-06-09T12:00:00.000Z")}
      />,
    );

    expect(html).toContain("No memory changes have been applied");
    expect(html).toContain("Confirmation records intent only; persistence is deferred");
    expect(html).toContain("Manage memory settings in Settings");
  });
});

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SkillPermissionGrantProvider } from "../SkillPermissionGrantContext";
import OperationPermissionCenter from "./OperationPermissionCenter";

const renderCenter = () => renderToStaticMarkup(
  <SkillPermissionGrantProvider>
    <OperationPermissionCenter />
  </SkillPermissionGrantProvider>,
);

describe("OperationPermissionCenter", () => {
  it("keeps the original skill permission summary and renders the unified center", () => {
    const markup = renderCenter();
    expect(markup).toContain("Permission center");
    expect(markup).toContain("Review grants");
    expect(markup).toContain("Operation Center");
    expect(markup).toContain("Unified read-only governance summary across Personal Intelligence and LucaLink.");
  });

  it("groups Personal Intelligence, LucaLink, and runtime cards", () => {
    const markup = renderCenter();
    expect(markup).toContain("Personal Intelligence");
    expect(markup).toContain("LucaLink");
    expect(markup).toContain("Runtime");
    expect(markup).toContain("Preview only — nothing has run yet.");
  });

  it("shows safety copy and no operational action buttons", () => {
    const markup = renderCenter();
    expect(markup).toContain("Right-panel status is informational only.");
    expect(markup).toContain("No execution, transport send, memory write, sensor collection, file write, install, or model/tool call is performed.");
    expect(markup).toContain("Approved/review states here do not grant runtime authority.");
    expect(markup).not.toMatch(/<button[^>]*>[^<]*(execute|send|write|install|approve|live collect)/i);
  });
});

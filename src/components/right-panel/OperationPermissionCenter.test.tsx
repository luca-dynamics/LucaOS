import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SkillPermissionGrantProvider } from "../SkillPermissionGrantContext";
import OperationPermissionCenter from "./OperationPermissionCenter";

const renderCenter = (creatorMode = false) =>
  renderToStaticMarkup(
    <SkillPermissionGrantProvider>
      <OperationPermissionCenter creatorMode={creatorMode} />
    </SkillPermissionGrantProvider>,
  );

describe("OperationPermissionCenter", () => {
  it("renders a calm permission summary in the default (non-creator) view", () => {
    const markup = renderCenter();
    expect(markup).toContain("Permission center");
    expect(markup).toContain("Review grants");
    // Mission Center is always available (control surface).
    expect(markup).toContain("Mission Center");
    // The detailed governance Operation Center is gated behind creator mode.
    expect(markup).not.toContain("Operation Center");
    expect(markup).not.toContain("Right-panel status is informational only.");
  });

  it("keeps the original skill permission summary and renders the unified center (creator mode)", () => {
    const markup = renderCenter(true);
    expect(markup).toContain("Permission center");
    expect(markup).toContain("Review grants");
    expect(markup).toContain("Operation Center");
    expect(markup).toContain("Unified read-only governance summary across Personal Intelligence and LucaLink.");
  });

  it("groups Personal Intelligence, LucaLink, and runtime cards (creator mode)", () => {
    const markup = renderCenter(true);
    expect(markup).toContain("Personal Intelligence");
    expect(markup).toContain("LucaLink");
    expect(markup).toContain("Runtime");
    expect(markup).toContain("Review status only - no action has run.");
  });

  it("shows safety copy for Operation Center cards (creator mode)", () => {
    const markup = renderCenter(true);
    expect(markup).toContain("Right-panel status is informational only.");
    expect(markup).toContain("No execution, transport send, memory write, sensor collection, file write, install, or model/tool call is performed.");
    expect(markup).toContain("Approved/review states here do not grant runtime authority.");
    // Mission Center may have control buttons; Operation Center card copy still forbids execute/send/install.
    expect(markup).not.toMatch(
      /data-operation-center-item[\s\S]*?<button[^>]*>[^<]*(execute|send|write|install|approve|live collect)/i,
    );
  });
});

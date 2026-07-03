// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import InlineApprovalCard from "./InlineApprovalCard";
import type { ApprovalRequest } from "../../types/approvalCenter";

const request: ApprovalRequest = {
  approvalRequestId: "req-1",
  actionDigest: "digest",
  title: "Send the Q3 summary to Dana",
  description: "Email draft is ready to send.",
  riskLevel: "medium",
  requestedBy: "Mail agent",
  sourceType: "tool",
  sourceId: "governed-1",
  provenanceIds: [],
  status: "pending",
  createdAt: "2026-07-03T00:00:00.000Z",
  userSafeReason: "Sends one email to a known contact.",
  actionPreview: {},
};

describe("InlineApprovalCard", () => {
  it("states what Luca wants, the safe reason, and the trust line", () => {
    const markup = renderToStaticMarkup(
      <InlineApprovalCard request={request} onApprove={() => {}} onDeny={() => {}} />,
    );
    expect(markup).toContain("Send the Q3 summary to Dana");
    expect(markup).toContain("Sends one email to a known contact.");
    expect(markup).toContain("medium risk");
    expect(markup).toContain("requested by Mail agent");
    expect(markup).toContain("Nothing runs until you decide.");
    expect(markup).toContain("Approve");
    expect(markup).toContain("Deny");
  });

  it("never uses resting-state red — high risk reads as warning tone", () => {
    const markup = renderToStaticMarkup(
      <InlineApprovalCard
        request={{ ...request, riskLevel: "high" }}
        onApprove={() => {}}
        onDeny={() => {}}
      />,
    );
    expect(markup).toContain("--luca-warning");
    expect(markup).not.toMatch(/#ef4444|#f87171|red-500/);
  });

  it("passes the full request to approve and deny handlers", () => {
    // Handlers receive the request so containers can sync source records.
    const onApprove = vi.fn();
    const onDeny = vi.fn();
    const element = InlineApprovalCard({ request, onApprove, onDeny });
    // Walk the element tree for the two buttons and fire their onClick.
    const buttons: any[] = [];
    const walk = (node: any) => {
      if (!node || typeof node !== "object") return;
      if (node.type === "button") buttons.push(node);
      const children = node.props?.children;
      (Array.isArray(children) ? children : [children]).forEach(walk);
    };
    walk(element);
    expect(buttons).toHaveLength(2);
    buttons[0].props.onClick();
    buttons[1].props.onClick();
    expect(onApprove).toHaveBeenCalledWith(request);
    expect(onDeny).toHaveBeenCalledWith(request);
  });
});

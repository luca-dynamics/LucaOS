import { describe, expect, it } from "vitest";
import lucaLinkSource from "./SettingsLucaLinkTab.tsx?raw";

const approvalActionSource = lucaLinkSource.slice(
  lucaLinkSource.indexOf("const handleApprovalAction"),
  lucaLinkSource.indexOf("return (", lucaLinkSource.indexOf("const handleApprovalAction")),
);

describe("Settings LucaLink Device Center", () => {
  it("renders the Device Center shell with overview cards and tabs", () => {
    expect(lucaLinkSource).toContain('title="LucaLink Device Center"');
    expect(lucaLinkSource).toContain("Manage trusted devices, approval requests, guest sessions, and mesh security.");
    expect(lucaLinkSource).toContain('label="Primary Host"');
    expect(lucaLinkSource).toContain('label="Connected Devices"');
    expect(lucaLinkSource).toContain('label="Pending Approvals"');
    expect(lucaLinkSource).toContain('label="Guest Sessions"');
    expect(lucaLinkSource).toContain('label="Security Mode"');
    expect(lucaLinkSource).toContain('{ id: "devices", label: "Devices" }');
    expect(lucaLinkSource).toContain('{ id: "approvals", label: "Approvals" }');
    expect(lucaLinkSource).toContain('{ id: "advanced", label: "Advanced" }');
  });

  it("connects approval buttons to queue-only approve, deny, and cancel actions", () => {
    expect(approvalActionSource).toContain("lucaLink.approveApprovalRequest");
    expect(approvalActionSource).toContain("lucaLink.denyApprovalRequest");
    expect(approvalActionSource).toContain("lucaLink.cancelApprovalRequest");
    expect(approvalActionSource).toContain("queue status only, no runtime continuation");
    expect(approvalActionSource).not.toContain("emit(");
    expect(approvalActionSource).not.toContain("send(");
    expect(approvalActionSource).not.toContain("socket");
    expect(approvalActionSource).not.toContain("retry");
    expect(approvalActionSource).not.toContain("replay");
  });

  it("renders approval details from payloadPreview without raw payload access", () => {
    expect(lucaLinkSource).toContain("renderPayloadPreview(selectedApproval.payloadPreview)");
    expect(lucaLinkSource).toContain("Payload preview");
    expect(lucaLinkSource).not.toMatch(/selectedApproval\.payload(?!Preview)/);
    expect(lucaLinkSource).not.toContain("raw payload");
  });

  it("uses Primary Host device authority language and role labels without reserved-source approval language", () => {
    expect(lucaLinkSource).toContain("Primary Host");
    expect(lucaLinkSource).toContain("Companion");
    expect(lucaLinkSource).toContain("Execution");
    expect(lucaLinkSource).toContain("Guest");
    expect(lucaLinkSource).not.toContain("Origin" + " approval");
  });

  it("maps soft enforcement modes to user-readable labels", () => {
    expect(lucaLinkSource).toContain('mode === "high-risk-only"');
    expect(lucaLinkSource).toContain("High-risk gates active");
    expect(lucaLinkSource).toContain('mode === "observe-only"');
    expect(lucaLinkSource).toContain("Observe-only");
    expect(lucaLinkSource).toContain("Disabled");
  });
});

import { describe, expect, it } from "vitest";
import lucaLinkSource from "./SettingsLucaLinkTab.tsx?raw";

const approvalActionSource = lucaLinkSource.slice(
  lucaLinkSource.indexOf("const handleApprovalAction"),
  lucaLinkSource.indexOf(
    "const handleContinuationRecordAction",
    lucaLinkSource.indexOf("const handleApprovalAction"),
  ),
);

const continuationActionSource = lucaLinkSource.slice(
  lucaLinkSource.indexOf("const handleContinuationRecordAction"),
  lucaLinkSource.indexOf(
    "return (",
    lucaLinkSource.indexOf("const handleContinuationRecordAction"),
  ),
);

const snapshotSource = lucaLinkSource.slice(
  lucaLinkSource.indexOf("function readLucaLinkDeviceCenterSnapshot"),
  lucaLinkSource.indexOf("export function formatLucaLinkTimestamp"),
);

const continuationRecordsSource = lucaLinkSource.slice(
  lucaLinkSource.indexOf("Continuation Records"),
  lucaLinkSource.indexOf("Recent observations"),
);

describe("Settings LucaLink Device Center", () => {
  it("renders the Device Center shell with overview cards and tabs", () => {
    expect(lucaLinkSource).toContain('title="LucaLink Device Center"');
    expect(lucaLinkSource).toContain(
      "Manage trusted devices, approval requests, guest sessions, and mesh security.",
    );
    expect(lucaLinkSource).toContain('label="Primary Host"');
    expect(lucaLinkSource).toContain('label="Connected Devices"');
    expect(lucaLinkSource).toContain('label="Pending Approvals"');
    expect(lucaLinkSource).toContain('label="Guest Sessions"');
    expect(lucaLinkSource).toContain('label="Security Mode"');
    expect(lucaLinkSource).toContain('{ id: "devices", label: "Devices" }');
    expect(lucaLinkSource).toContain('{ id: "approvals", label: "Approvals" }');
    expect(lucaLinkSource).toContain('{ id: "advanced", label: "Advanced" }');
  });

  it("creates continuation tokens only after approved queue decisions", () => {
    expect(approvalActionSource).toContain("lucaLink.approveApprovalRequest");
    expect(approvalActionSource).toContain(
      "lucaLink.createContinuationFromApprovalRequest(request.id)",
    );
    expect(approvalActionSource).toContain(
      'approvalResult.request?.status === "approved"',
    );

    const approveBranch = approvalActionSource.slice(
      approvalActionSource.indexOf('if (action === "approve")'),
      approvalActionSource.indexOf('} else if (action === "deny")'),
    );
    const denyBranch = approvalActionSource.slice(
      approvalActionSource.indexOf('} else if (action === "deny")'),
      approvalActionSource.indexOf(
        "} else {",
        approvalActionSource.indexOf('} else if (action === "deny")'),
      ),
    );
    const cancelBranch = approvalActionSource.slice(
      approvalActionSource.indexOf(
        "} else {",
        approvalActionSource.indexOf('} else if (action === "deny")'),
      ),
    );

    expect(approveBranch).toContain("lucaLink.approveApprovalRequest");
    expect(approveBranch).toContain(
      "lucaLink.createContinuationFromApprovalRequest",
    );
    expect(denyBranch).toContain("lucaLink.denyApprovalRequest");
    expect(denyBranch).not.toContain("createContinuationFromApprovalRequest");
    expect(cancelBranch).toContain("lucaLink.cancelApprovalRequest");
    expect(cancelBranch).not.toContain("createContinuationFromApprovalRequest");
  });

  it("keeps approval and continuation code state-only with no transport or action calls", () => {
    const guardedSource = `${approvalActionSource}\n${continuationActionSource}`;
    expect(guardedSource).not.toMatch(/\bemit\s*\(/);
    expect(guardedSource).not.toMatch(/\bsend\s*\(/);
    expect(guardedSource).not.toMatch(/\bbeamPacket\s*\(/);
    expect(guardedSource).not.toMatch(/\bsocket\b/);
    expect(guardedSource).not.toMatch(/\bretry\s*\(/);
    expect(guardedSource).not.toMatch(/\breplay\s*\(/);
  });

  it("reads continuation state into the Device Center snapshot", () => {
    expect(lucaLinkSource).toContain(
      "continuationTokens: LucaLinkContinuationToken[]",
    );
    expect(lucaLinkSource).toContain(
      "validContinuationTokens: LucaLinkContinuationToken[]",
    );
    expect(lucaLinkSource).toContain(
      "continuationSummary: LucaLinkContinuationRegistrySummary",
    );
    expect(snapshotSource).toContain("lucaLink.getContinuationTokens()");
    expect(snapshotSource).toContain("lucaLink.getValidContinuationTokens()");
    expect(snapshotSource).toContain(
      "lucaLink.getContinuationRegistrySummary()",
    );
  });

  it("renders continuation summary and model-only safety copy in Advanced", () => {
    expect(lucaLinkSource).toContain('label="Continuation tokens"');
    expect(lucaLinkSource).toContain('label="Valid continuations"');
    expect(lucaLinkSource).toContain('label="Consumed"');
    expect(lucaLinkSource).toContain('label="Expired / blocked"');
    expect(lucaLinkSource).toContain('label="Manual retry only"');
    expect(lucaLinkSource).toContain('label="Fresh confirmation required"');
    expect(lucaLinkSource).toContain("Continuation model only");
    expect(lucaLinkSource).toContain("No action replay");
    expect(lucaLinkSource).toContain("No runtime execution");
  });

  it("links approval details to continuation records by requestId", () => {
    expect(lucaLinkSource).toContain("selectedApprovalContinuation");
    expect(lucaLinkSource).toContain("token.requestId === selectedApproval.id");
    expect(lucaLinkSource).toContain(
      "Continuation token visibility is read-only model state",
    );
    expect(lucaLinkSource).toContain(
      "This action requires a new Primary Host confirmation and cannot be replayed from approval.",
    );
  });

  it("uses safe continuation record action labels", () => {
    expect(continuationRecordsSource).toContain("Validate record");
    expect(continuationRecordsSource).toContain("Cancel record");
    expect(continuationRecordsSource).toContain("Mark consumed");
    expect(continuationRecordsSource).not.toMatch(
      />\s*(Run|Retry|Replay|Execute)\s*</,
    );
    expect(continuationRecordsSource).toContain(
      "Mark consumed only records state; it does not execute the",
    );
    expect(continuationRecordsSource).toContain("action.");
  });

  it("renders approval details from payloadPreview without raw payload access", () => {
    expect(lucaLinkSource).toContain(
      "renderPayloadPreview(selectedApproval.payloadPreview)",
    );
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


  it("reads device trust state into the Device Center snapshot", () => {
    expect(lucaLinkSource).toContain("trustedDevices: LucaLinkTrustedDeviceRecord[]");
    expect(lucaLinkSource).toContain("deviceTrustSummary: LucaLinkDeviceTrustRegistrySummary");
    expect(lucaLinkSource).toContain("deviceTrustAudit: LucaLinkDeviceTrustAuditRecord[]");
    expect(snapshotSource).toContain("lucaLink.getTrustedDevices()");
    expect(snapshotSource).toContain("lucaLink.getActiveTrustedDevices()");
    expect(snapshotSource).toContain("lucaLink.getDeviceTrustSummary()");
    expect(snapshotSource).toContain("lucaLink.getDeviceTrustAudit()");
  });

  it("renders local device trust controls and conservative safety copy", () => {
    expect(lucaLinkSource).toContain("Local LucaLink device trust management");
    expect(lucaLinkSource).toContain("Rename");
    expect(lucaLinkSource).toContain("Revoke locally");
    expect(lucaLinkSource).toContain("Block locally");
    expect(lucaLinkSource).toContain("Unblock locally");
    expect(lucaLinkSource).toContain("Local only; does not disconnect remote transport yet");
    expect(lucaLinkSource).toContain("Admin does not bypass Primary Host approvals");
    expect(lucaLinkSource).toContain("Conversation/WebRTC limited");
  });

  it("does not expose unsafe owner assignment or reserved device authority text", () => {
    expect(lucaLinkSource).not.toContain('<option value="owner"');
    expect(lucaLinkSource).not.toContain("Origin");
  });

  it("wires trust actions through service helpers without socket operations", () => {
    const trustActionSource = lucaLinkSource.slice(
      lucaLinkSource.indexOf("const handleDeviceTrustAction"),
      lucaLinkSource.indexOf("return (", lucaLinkSource.indexOf("const handleDeviceTrustAction")),
    );
    expect(trustActionSource).toContain("lucaLink.renameTrustedDevice");
    expect(trustActionSource).toContain("lucaLink.setTrustedDeviceTrustLevel");
    expect(trustActionSource).toContain("lucaLink.revokeTrustedDevice");
    expect(trustActionSource).toContain("lucaLink.blockTrustedDevice");
    expect(trustActionSource).toContain("lucaLink.unblockTrustedDevice");
    expect(trustActionSource).not.toMatch(/\bemit\s*\(/);
    expect(trustActionSource).not.toMatch(/\bdisconnect\s*\(/);
    expect(trustActionSource).not.toMatch(/\bsocket\b/);
  });

  it("maps soft enforcement modes to user-readable labels", () => {
    expect(lucaLinkSource).toContain('mode === "high-risk-only"');
    expect(lucaLinkSource).toContain("High-risk gates active");
    expect(lucaLinkSource).toContain('mode === "observe-only"');
    expect(lucaLinkSource).toContain("Observe-only");
    expect(lucaLinkSource).toContain("Disabled");
  });
});

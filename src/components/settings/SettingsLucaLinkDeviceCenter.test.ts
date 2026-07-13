import { describe, expect, it } from "vitest";
import lucaLinkSource from "./SettingsLucaLinkTab.tsx?raw";
import lucaLinkServiceSource from "../../services/lucaLink/relayClientAdapter.ts?raw";
import { LUCA_LINK_FORBIDDEN_DEVICE_CENTER_ACTION_LABELS } from "../../services/lucaLink/lucaLinkArchitectureInvariants";

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
  it("renders the LucaLink runtime authority boundary near the safety governance cards", () => {
    expect(lucaLinkSource).toContain(
      "import { SettingsLucaLinkRuntimeAuthority }",
    );
    expect(lucaLinkSource).toContain(
      "<SettingsLucaLinkRuntimeAuthority accentColor={theme.hex} />",
    );
  });

  it("renders the Device Center shell with overview cards and tabs", () => {
    expect(lucaLinkSource).toContain('title="LucaLink Device Center"');
    expect(lucaLinkSource).toContain(
      "Manage trusted devices, approval requests, guest sessions, and mesh security.",
    );
    expect(lucaLinkSource).toContain('label: "Primary Host"');
    expect(lucaLinkSource).toContain('label: "Connected devices"');
    expect(lucaLinkSource).toContain('label: "Pending approvals"');
    expect(lucaLinkSource).toContain('label: "Guest sessions"');
    expect(lucaLinkSource).toContain('label: "Security mode"');
    expect(lucaLinkSource).toContain('{ id: "devices", label: "Devices" }');
    expect(lucaLinkSource).toContain('{ id: "approvals", label: "Approvals" }');
    expect(lucaLinkSource).toContain('{ id: "advanced", label: "Advanced" }');
  });

  it("renders the creator-only pairing policy review card", () => {
    expect(lucaLinkSource).toContain("Pairing policy review");
    expect(lucaLinkSource).toContain("Pairing code");
    expect(lucaLinkSource).toContain("Primary Host approval required");
    expect(lucaLinkSource).toContain("Limited trust");
    expect(lucaLinkSource).toContain("Sensitive access remains blocked");
    expect(lucaLinkSource).toContain("Review only");
    expect(lucaLinkSource).toContain("This review does not pair a device or change trust.");
  });

  it("creates continuation tokens only after approved queue decisions", () => {
    expect(approvalActionSource).toContain("lucaLinkManager.console.approveApprovalRequest");
    expect(approvalActionSource).toContain(
      "lucaLinkManager.console.createContinuationFromApprovalRequest(request.id)",
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

    expect(approveBranch).toContain("lucaLinkManager.console.approveApprovalRequest");
    expect(approveBranch).toContain(
      "lucaLinkManager.console.createContinuationFromApprovalRequest",
    );
    expect(denyBranch).toContain("lucaLinkManager.console.denyApprovalRequest");
    expect(denyBranch).not.toContain("createContinuationFromApprovalRequest");
    expect(cancelBranch).toContain("lucaLinkManager.console.cancelApprovalRequest");
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
    expect(snapshotSource).toContain("lucaLinkManager.console.getContinuationTokens()");
    expect(snapshotSource).toContain("lucaLinkManager.console.getValidContinuationTokens()");
    expect(snapshotSource).toContain(
      "lucaLinkManager.console.getContinuationRegistrySummary()",
    );
  });

  it("renders continuation summary and read-only safety copy in Advanced", () => {
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
    expect(lucaLinkSource).toContain(
      "trustedDevices: LucaLinkTrustedDeviceRecord[]",
    );
    expect(lucaLinkSource).toContain(
      "deviceTrustSummary: LucaLinkDeviceTrustRegistrySummary",
    );
    expect(lucaLinkSource).toContain(
      "deviceTrustAudit: LucaLinkDeviceTrustAuditRecord[]",
    );
    expect(snapshotSource).toContain("lucaLinkManager.console.getTrustedDevices()");
    expect(snapshotSource).toContain("lucaLinkManager.console.getActiveTrustedDevices()");
    expect(snapshotSource).toContain("lucaLinkManager.console.getDeviceTrustSummary()");
    expect(snapshotSource).toContain("lucaLinkManager.console.getDeviceTrustAudit()");
  });

  it("renders local device trust controls and conservative safety copy", () => {
    expect(lucaLinkSource).toContain(
      "Linked hosts, trust state, and scoped permission summaries",
    );
    expect(lucaLinkSource).toContain("Rename");
    expect(lucaLinkSource).toContain("Revoke locally");
    expect(lucaLinkSource).toContain("Block locally");
    expect(lucaLinkSource).toContain("Unblock locally");
    expect(lucaLinkSource).toContain(
      "Local only; does not disconnect remote transport yet",
    );
    expect(lucaLinkSource).toContain(
      "Admin does not bypass Primary Host approvals",
    );
    expect(lucaLinkSource).toContain("Conversation/WebRTC limited");
    expect(lucaLinkSource).toContain("Current device");
    expect(lucaLinkSource).toContain("Sensitive access requires approval");
    expect(lucaLinkSource).toContain("Permission profile");
  });

  it("does not expose unsafe owner assignment or reserved device authority text", () => {
    expect(lucaLinkSource).not.toContain('<option value="owner"');
    expect(lucaLinkSource).not.toContain("Origin");
  });

  it("wires trust actions through service helpers without socket operations", () => {
    const trustActionSource = lucaLinkSource.slice(
      lucaLinkSource.indexOf("const handleDeviceTrustAction"),
      lucaLinkSource.indexOf(
        "return (",
        lucaLinkSource.indexOf("const handleDeviceTrustAction"),
      ),
    );
    expect(trustActionSource).toContain("lucaLinkManager.console.renameTrustedDevice");
    expect(trustActionSource).toContain("lucaLinkManager.console.setTrustedDeviceTrustLevel");
    expect(trustActionSource).toContain("lucaLinkManager.console.revokeTrustedDevice");
    expect(trustActionSource).toContain("lucaLinkManager.console.blockTrustedDevice");
    expect(trustActionSource).toContain("lucaLinkManager.console.unblockTrustedDevice");
    expect(trustActionSource).not.toMatch(/\bemit\s*\(/);
    expect(trustActionSource).not.toMatch(/\bdisconnect\s*\(/);
    expect(trustActionSource).not.toMatch(/\bsocket\b/);
  });

  it("reads handoff state into the Device Center snapshot", () => {
    expect(lucaLinkSource).toContain("handoffs: LucaLinkHandoffRequest[]");
    expect(lucaLinkSource).toContain(
      "pendingHandoffs: LucaLinkHandoffRequest[]",
    );
    expect(lucaLinkSource).toContain(
      "handoffSummary: LucaLinkHandoffRegistrySummary",
    );
    expect(snapshotSource).toContain("lucaLinkManager.console.getHandoffs()");
    expect(snapshotSource).toContain("lucaLinkManager.console.getPendingHandoffs()");
    expect(snapshotSource).toContain("lucaLinkManager.console.getHandoffSummary()");
  });

  it("renders Device Center Sync handoff summary and safe copy", () => {
    expect(lucaLinkSource).toContain('label: "Pending handoffs"');
    expect(lucaLinkSource).toContain('label: "Conversation handoffs"');
    expect(lucaLinkSource).toContain('label: "Memory intent handoffs"');
    expect(lucaLinkSource).toContain('label: "Artifact / mission handoffs"');
    expect(lucaLinkSource).toContain('label: "Blocked / expired"');
    expect(lucaLinkSource).toContain(
      "Memory handoff is intent-only; raw memory databases are not transferred.",
    );
    expect(lucaLinkSource).toContain(
      "Conversation handoff excludes hidden system prompts and private reasoning.",
    );
    expect(lucaLinkSource).toContain("Secrets are redacted before handoff.");
    expect(lucaLinkSource).toContain(
      "Handoff does not execute tools or mutate remote devices.",
    );
    expect(lucaLinkSource).toContain("Continue on another host");
    expect(lucaLinkSource).toContain(
      "prepares a reviewable payload preview",
    );
    expect(lucaLinkSource).not.toContain(
      "Create draft conversation handoff",
    );
  });

  it("renders handoff payload summaries and avoids raw payload controls", () => {
    expect(lucaLinkSource).toContain(
      "renderPayloadPreview(handoff.payloadPreview)",
    );
    expect(lucaLinkSource).toContain("Payload preview only");
    expect(lucaLinkSource).toContain(
      "No send-now action is exposed from settings.",
    );
    expect(lucaLinkSource).not.toMatch(/handoff\.payload(?!Preview)/);
    expect(lucaLinkSource).not.toContain("sync full memory database");
    expect(lucaLinkSource).not.toContain("Sync full memory database");
    expect(lucaLinkSource).not.toContain("Origin");
  });

  it("wires handoff actions through state-only service helpers without transport calls", () => {
    const handoffActionSource = lucaLinkSource.slice(
      lucaLinkSource.indexOf("const handleStartContinueOnHost"),
      lucaLinkSource.indexOf("const handleDeviceTrustAction"),
    );
    expect(handoffActionSource).toContain("lucaLinkManager.console.createConversationHandoff");
    expect(handoffActionSource).toContain("Continue current conversation");
    expect(handoffActionSource).toContain("Device Center continue flow");
    expect(handoffActionSource).toContain("lucaLinkManager.console.approveHandoff");
    expect(handoffActionSource).toContain("lucaLinkManager.console.declineHandoff");
    expect(handoffActionSource).toContain("lucaLinkManager.console.cancelHandoff");
    expect(handoffActionSource).toContain("lucaLinkManager.console.markHandoffAccepted");
    expect(handoffActionSource).not.toMatch(/\bemit\s*\(/);
    expect(handoffActionSource).not.toMatch(/\bsocket\b/);
    expect(handoffActionSource).not.toMatch(/\bsend\s*\(/);
  });

  it("maps soft enforcement modes to user-readable labels", () => {
    expect(lucaLinkSource).toContain('mode === "high-risk-only"');
    expect(lucaLinkSource).toContain("High-risk gates active");
    expect(lucaLinkSource).toContain('mode === "observe-only"');
    expect(lucaLinkSource).toContain("Observe-only");
    expect(lucaLinkSource).toContain("Disabled");
  });

  it("uses Primary Host copy in the LucaLink connection flow while preserving existing pairing and QR controls", () => {
    expect(lucaLinkSource).toContain("Primary Host connection");
    expect(lucaLinkSource).toContain("Primary Host address");
    expect(lucaLinkSource).toContain("Scan QR Code from");
    expect(lucaLinkSource).toContain("Primary Host");
    expect(lucaLinkSource).toContain("Failed to connect to Primary Host");
    expect(lucaLinkSource).toContain("Connected to Primary Host");
    expect(lucaLinkSource).toContain("Connect to Primary Host");
    expect(lucaLinkSource).toContain(
      "Allow trusted Luca-capable hosts to pair securely",
    );
    expect(lucaLinkSource).toContain(
      "Scan a QR from your phone to pair it with this LucaOS",
    );
    expect(lucaLinkSource).toContain('onUpdate("lucaLink", "vpnServerUrl"');

    for (const staleCopy of [
      "Connect to desktop",
      "connect to desktop",
      "Desktop address",
      "Desktop connection",
      "Mobile clients remain",
      "Pair with Desktop",
      "Scan QR Code from Desktop",
      "Failed to connect to Desktop",
      "Connected to desktop",
      "Your connection to Desktop",
    ]) {
      expect(lucaLinkSource).not.toContain(staleCopy);
    }
  });

  it("keeps Device Center Origin and forbidden action labels out of user-facing copy", () => {
    expect(lucaLinkSource).not.toContain("Origin approval");
    for (const label of LUCA_LINK_FORBIDDEN_DEVICE_CENTER_ACTION_LABELS) {
      expect(lucaLinkSource).not.toContain(label);
    }
  });
});

describe("Settings LucaLink Device Center host connections", () => {
  const hostsSectionSource = lucaLinkSource.slice(
    lucaLinkSource.indexOf('deviceCenterTab === "hosts"'),
    lucaLinkSource.indexOf('deviceCenterTab === "approvals"'),
  );

  it("renders a Hosts tab with multi-host connection summary cards", () => {
    expect(lucaLinkSource).toContain('{ id: "hosts", label: "Hosts" }');
    expect(hostsSectionSource).toContain("Host Connections / Adaptation");
    expect(hostsSectionSource).toContain('label: "Host connections"');
    expect(hostsSectionSource).toContain('label: "Display hosts"');
    expect(hostsSectionSource).toContain('label: "Approval-capable hosts"');
    expect(hostsSectionSource).toContain('label: "Sensor hosts"');
    expect(hostsSectionSource).toContain('label: "Embodied hosts"');
    expect(hostsSectionSource).toContain('label: "Unknown hosts"');
  });

  it("reads host connection state into the Device Center snapshot", () => {
    expect(lucaLinkSource).toContain(
      "hostConnections: LucaLinkHostConnectionRecord[]",
    );
    expect(lucaLinkSource).toContain(
      "hostConnectionSummary: LucaLinkHostConnectionRegistrySummary",
    );
    expect(snapshotSource).not.toContain(
      ["lucaLinkManager.console.refresh", "HostConnectionsFromCurrentState()"].join(""),
    );
    expect(snapshotSource).toContain("lucaLinkManager.console.getFreshHostConnections()");
    expect(snapshotSource).toContain(
      "lucaLinkManager.console.getFreshHostConnectionSummary()",
    );
  });

  it("shows host class, connection class, runtime surface, approval capability, and approval-first adaptation copy", () => {
    expect(hostsSectionSource).toContain("host.hostClass");
    expect(hostsSectionSource).toContain("host.connectionClass");
    expect(hostsSectionSource).toContain("host.runtimeSurfaces.join");
    expect(hostsSectionSource).toContain("host.approvalCapability");
    expect(hostsSectionSource).toContain(
      "Host adaptation stays approval-first.",
    );
    expect(hostsSectionSource).toContain(
      "it cannot activate adapters without your approval",
    );
    expect(hostsSectionSource).toContain("Bridge programs require Primary Host approval");
    expect(hostsSectionSource).toContain("clear execution permissions before use.");
  });

  it("does not expose unsafe host adaptation action labels or reserved device authority language", () => {
    const forbiddenHostActions = [
      ["Generate", "and", "run"].join(" "),
      ["Install", "adapter"].join(" "),
      ["Connect", "now"].join(" "),
      ["Take", "over"].join(" "),
      ["Auto", "bridge"].join(" "),
    ];
    forbiddenHostActions.forEach((label) => {
      expect(hostsSectionSource).not.toContain(label);
    });
    expect(hostsSectionSource).not.toContain("Origin");
    expect(hostsSectionSource).not.toMatch(/bypass|exploit/i);
  });
});

describe("Settings LucaLink Device Center guest and service cleanup", () => {
  const guestsSectionSource = lucaLinkSource.slice(
    lucaLinkSource.indexOf('deviceCenterTab === "guests"'),
    lucaLinkSource.indexOf('deviceCenterTab === "sync"'),
  );
  const hostGetterSource = lucaLinkServiceSource.slice(
    lucaLinkServiceSource.indexOf("getHostConnections"),
    lucaLinkServiceSource.indexOf("getRuntimeShadowObservations"),
  );

  it("reads guest security sessions and summary into Device Center snapshot and overview", () => {
    expect(lucaLinkSource).toContain(
      "guestSecuritySessions: LucaLinkGuestSessionRecord[]",
    );
    expect(lucaLinkSource).toContain(
      "guestSecuritySummary: LucaLinkGuestSessionSummary",
    );
    expect(snapshotSource).toContain("lucaLinkManager.console.getGuestSecuritySessions()");
    expect(snapshotSource).toContain("lucaLinkManager.console.getGuestSecuritySummary()");
    expect(lucaLinkSource).toContain(
      "deviceCenterSnapshot.guestSecuritySummary.deniedGuestInbound",
    );
    expect(lucaLinkSource).toContain(
      "deviceCenterSnapshot.guestSecuritySummary.rateLimitedGuestInbound",
    );
  });

  it("replaces stale guest copy with local guest access controls", () => {
    expect(lucaLinkSource).not.toContain(
      ["No active guest", "session data exposed yet."].join(" "),
    );
    expect(lucaLinkSource).not.toContain(
      ["No reliable active", "guest session list is exposed yet."].join(" "),
    );
    expect(guestsSectionSource).toContain(
      "Guest access controls",
    );
    expect(guestsSectionSource).toContain(
      "handleGuestSessionAction(session, \"revoke\")",
    );
    expect(lucaLinkSource).toContain(
      "lucaLinkManager.console.revokeGuestSession",
    );
    expect(guestsSectionSource).toContain(
      "invite generation, PIN setup, and WebRTC setup stay",
    );
  });

  it("updates LucaLinkService comments and host getters without transport behavior", () => {
    expect(lucaLinkServiceSource).toContain(
      "multi-host LucaLink mesh communication",
    );
    expect(lucaLinkServiceSource).toContain(
      "Primary Host, companion, display, guest, sensor, electronics, and embodied host messaging",
    );
    expect(lucaLinkServiceSource).not.toContain(
      ["Desktop", "↔", "Mobile communication"].join(" "),
    );
    expect(hostGetterSource).toContain("getFreshHostConnections");
    expect(hostGetterSource).toContain("getFreshHostConnectionSummary");
    expect(hostGetterSource).not.toMatch(/\.emit\s*\(/);
    expect(hostGetterSource).not.toMatch(/\.on\s*\(/);
    expect(hostGetterSource).not.toMatch(/fetch\s*\(/);
    expect(hostGetterSource).not.toMatch(/io\s*\(/);
  });

  it("does not add reserved approval terminology", () => {
    expect(lucaLinkSource).not.toContain("Origin approval");
    expect(lucaLinkServiceSource).not.toContain("Origin approval");
  });
});

describe("Settings LucaLink Device Center creator bridge review surfaces", () => {
  const bridgeReviewSectionSource = lucaLinkSource.slice(
    lucaLinkSource.indexOf('deviceCenterTab === "bridge-review"'),
    lucaLinkSource.indexOf('deviceCenterTab === "devices"'),
  );

  it("reads multi-host approval, bridge review, embodied policy, and adapter draft state", () => {
    expect(lucaLinkSource).toContain(
      "approvalSurfaces: LucaLinkApprovalSurfaceRecord[]",
    );
    expect(lucaLinkSource).toContain(
      "approvalSurfaceSummary: LucaLinkApprovalSurfaceSummary",
    );
    expect(lucaLinkSource).toContain(
      "bridgeReviews: LucaLinkBridgeReviewRecord[]",
    );
    expect(lucaLinkSource).toContain(
      "bridgeReviewSummary: LucaLinkBridgeReviewSummary",
    );
    expect(lucaLinkSource).toContain(
      "embodiedCapabilityEnvelopes: LucaLinkEmbodiedCapabilityEnvelope[]",
    );
    expect(lucaLinkSource).toContain("adapterDrafts: LucaLinkAdapterDraft[]");
    expect(snapshotSource).toContain("lucaLinkManager.console.getApprovalSurfaces()");
    expect(snapshotSource).toContain("lucaLinkManager.console.getApprovalSurfaceSummary()");
    expect(snapshotSource).toContain("lucaLinkManager.console.getBridgeReviews()");
    expect(snapshotSource).toContain("lucaLinkManager.console.getBridgeReviewSummary()");
    expect(snapshotSource).toContain(
      "lucaLinkManager.console.getEmbodiedHostCapabilityEnvelopes()",
    );
    expect(snapshotSource).toContain("lucaLinkManager.console.getAdapterDrafts()");
    expect(snapshotSource).toContain("lucaLinkManager.console.getAdapterDraftSummary()");
  });

  it("renders multi-host approval surface, bridge review, embodied policy, and adapter draft sections", () => {
    expect(lucaLinkSource).toContain(
      '{ id: "bridge-review", label: "Bridge Review" }',
    );
    expect(bridgeReviewSectionSource).toContain("Multi-Host Approval Surface");
    expect(bridgeReviewSectionSource).toContain("Bridge Blueprint Review");
    expect(bridgeReviewSectionSource).toContain("Sensor / Embodied Policy");
    expect(bridgeReviewSectionSource).toContain("Adapter Drafts");
    expect(bridgeReviewSectionSource).toContain(
      "Approval is host-aware and risk-aware.",
    );
    expect(bridgeReviewSectionSource).toContain(
      "Mobile is one companion host type, not the only approval host.",
    );
    expect(bridgeReviewSectionSource).toContain(
      "Approval for sandbox does not execute or install the adapter.",
    );
    expect(bridgeReviewSectionSource).toContain("Sensor read is read-only.");
    expect(bridgeReviewSectionSource).toContain("generatedTextOnly true");
    expect(bridgeReviewSectionSource).toContain("canWriteToDisk false");
    expect(bridgeReviewSectionSource).toContain("canExecute false");
    expect(bridgeReviewSectionSource).toContain("canInstall false");
  });

  it("keeps bridge review actions approval-gated and avoids forbidden action labels", () => {
    expect(bridgeReviewSectionSource).toContain("Create review draft");
    expect(bridgeReviewSectionSource).toContain("Approve for sandbox only");
    expect(bridgeReviewSectionSource).toContain("Create text draft");
    expect(bridgeReviewSectionSource).toContain("Clear drafts");
    for (const label of [
      ...LUCA_LINK_FORBIDDEN_DEVICE_CENTER_ACTION_LABELS,
      "Connect now",
    ]) {
      expect(bridgeReviewSectionSource).not.toContain(label);
    }
    expect(bridgeReviewSectionSource).not.toContain("Origin approval");
  });

  it("exposes service helpers without new socket events or execution", () => {
    const helperSource = lucaLinkServiceSource.slice(
      lucaLinkServiceSource.indexOf("getApprovalSurfaces"),
      lucaLinkServiceSource.indexOf("getContinuationTokens"),
    );
    expect(helperSource).toContain("getApprovalSurfaceSummary");
    expect(helperSource).toContain("createBridgeReviewFromBlueprint");
    expect(helperSource).toContain("approveBridgeReviewForSandbox");
    expect(helperSource).toContain("createAdapterDraftFromBridgeReview");
    expect(helperSource).not.toMatch(/\.emit\s*\(/);
    expect(helperSource).not.toMatch(/fetch\s*\(/);
    expect(helperSource).not.toMatch(/io\s*\(/);
    expect(helperSource).not.toMatch(/localStorage|sessionStorage/);
  });
});

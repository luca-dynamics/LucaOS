import { describe, expect, it } from "vitest";
import evaluatorSource from "./lucaLinkPairingRequestEvaluator.ts?raw";
import fixturesSource from "./lucaLinkPairingRequestFixtures.ts?raw";
import policySource from "./lucaLinkPairingRequestPolicy.ts?raw";
import typesSource from "./lucaLinkPairingRequestTypes.ts?raw";
import {
  createLucaLinkPairingCodePreview,
  createLucaLinkPairingDisclosureSummary,
  createLucaLinkPairingOperationCenterSummary,
  createLucaLinkPairingRequestPreview,
  evaluateLucaLinkPairingRequest,
  LUCA_LINK_PAIRING_FIXTURE_NOW,
  LUCA_LINK_PAIRING_REQUEST_FIXTURES,
  LUCA_LINK_PAIRING_REQUEST_SOURCES,
  previewLucaLinkPairingApproval,
  previewLucaLinkPairingDenial,
  previewLucaLinkPairingExpiration,
} from ".";

const fixtures = LUCA_LINK_PAIRING_REQUEST_FIXTURES;

describe("LucaLink pairing request preview foundation", () => {
  it("new pairing request defaults to pending Primary Host review and trusted_limited", () => {
    const preview = createLucaLinkPairingRequestPreview({
      requestId: "fixture-pairing-request-2222",
      source: LUCA_LINK_PAIRING_REQUEST_SOURCES.mobileCompanion,
      targetHostId: LUCA_LINK_PAIRING_REQUEST_SOURCES.primaryHost.hostId,
      method: "qr_code",
      requestedAt: LUCA_LINK_PAIRING_FIXTURE_NOW,
    });
    expect(preview.request.status).toBe("awaiting_primary_host");
    expect(preview.request.requestedTrustState).toBe("trusted_limited");
    expect(preview.request.requestedConnectionState).toBe("pending_approval");
  });

  it("Primary Host approval and user confirmation are required", () => {
    const preview = evaluateLucaLinkPairingRequest({ request: fixtures.pendingMobileCompanion, nowIso: LUCA_LINK_PAIRING_FIXTURE_NOW });
    expect(preview.request.requiresPrimaryHostApproval).toBe(true);
    expect(preview.request.requiresUserConfirmation).toBe(true);
    expect(preview.primaryHostReview).toBe("required");
    expect(preview.decision).toBe("approval_required");
  });

  it("QR/code preview is non-secret, not runtime-valid, single-use, and expires", () => {
    const code = createLucaLinkPairingCodePreview({ request: fixtures.qrPreviewRequest });
    expect(code.validForRuntimePairing).toBe(false);
    expect(code.containsSecret).toBe(false);
    expect(code.singleUse).toBe(true);
    expect(code.expiresAt).toBe(fixtures.qrPreviewRequest.expiresAt);
    expect(code.ttlSeconds).toBeGreaterThan(0);
  });

  it("approve pairing preview composes approval action preview", () => {
    const approval = previewLucaLinkPairingApproval({ request: fixtures.pendingMobileCompanion, nowIso: LUCA_LINK_PAIRING_FIXTURE_NOW });
    expect(approval.status).toBe("approved_preview");
    expect(approval.approvalActionPreview?.action).toBe("approve_host");
    expect(approval.approvalActionPreview?.previewOnly).toBe(true);
    expect(approval.registryMutated).toBe(false);
    expect(approval.transportStarted).toBe(false);
  });

  it("approve pairing preview does not grant remote_action/tool_execution/admin_trust", () => {
    const approval = previewLucaLinkPairingApproval({ request: fixtures.sensitiveRuntimeRequest, nowIso: LUCA_LINK_PAIRING_FIXTURE_NOW });
    expect(approval.blockedPermissions).toEqual(expect.arrayContaining(["remote_action", "tool_execution", "admin_trust"]));
    expect(approval.approvalRequiredPermissions).toEqual(expect.arrayContaining(["remote_action", "tool_execution", "admin_trust"]));
    expect(approval.proposedTrustState).toBe("trusted_limited");
  });

  it("deny pairing preview is side-effect-free", () => {
    const denial = previewLucaLinkPairingDenial(fixtures.pendingMobileCompanion);
    expect(denial.status).toBe("denied_preview");
    expect(denial.registryMutated).toBe(false);
    expect(denial.disconnected).toBe(false);
    expect(denial.sideEffectsPerformed).toBe(false);
  });

  it("expired request cannot be approved and returns expired decision", () => {
    const evaluated = evaluateLucaLinkPairingRequest({ request: fixtures.expiredRequest, nowIso: LUCA_LINK_PAIRING_FIXTURE_NOW });
    const approval = previewLucaLinkPairingApproval({ request: fixtures.expiredRequest, nowIso: LUCA_LINK_PAIRING_FIXTURE_NOW });
    expect(evaluated.decision).toBe("expired");
    expect(evaluated.request.status).toBe("expired");
    expect(approval.status).toBe("expired");
    expect(approval.decision).toBe("expired");
    expect(approval.approvalActionPreview).toBeUndefined();
  });

  it("expiration preview blocks approval without deleting anything", () => {
    const expiration = previewLucaLinkPairingExpiration(fixtures.pendingMobileCompanion);
    expect(expiration.approvalBlocked).toBe(true);
    expect(expiration.deleted).toBe(false);
    expect(expiration.registryMutated).toBe(false);
  });

  it("request with missing Primary Host requires review and blocks approval preview", () => {
    const evaluated = evaluateLucaLinkPairingRequest({ request: fixtures.missingPrimaryHostRequest, nowIso: LUCA_LINK_PAIRING_FIXTURE_NOW, hasPrimaryHost: false });
    const approval = previewLucaLinkPairingApproval({ request: fixtures.missingPrimaryHostRequest, nowIso: LUCA_LINK_PAIRING_FIXTURE_NOW, hasPrimaryHost: false });
    expect(evaluated.primaryHostReview).toBe("missing");
    expect(evaluated.decision).toBe("review_only");
    expect(approval.status).toBe("blocked");
    expect(approval.approvalActionPreview).toBeUndefined();
  });

  it("request asking for sensitive capabilities marks them blocked or approval-required", () => {
    const evaluated = evaluateLucaLinkPairingRequest({ request: fixtures.sensitiveRuntimeRequest, nowIso: LUCA_LINK_PAIRING_FIXTURE_NOW });
    expect(evaluated.blockedPermissions).toEqual(expect.arrayContaining(["remote_action", "tool_execution", "admin_trust"]));
    expect(evaluated.approvalRequiredPermissions).toEqual(expect.arrayContaining(["remote_action", "tool_execution", "admin_trust"]));
    expect(evaluated.request.risk).toBe("critical");
  });

  it("memory sync requests are approval-required but model-only", () => {
    const evaluated = evaluateLucaLinkPairingRequest({ request: fixtures.memorySyncRequest, nowIso: LUCA_LINK_PAIRING_FIXTURE_NOW });
    expect(evaluated.approvalRequiredPermissions).toContain("sync_memory");
    expect(evaluated.warnings.join(" ")).toContain("does not sync memory");
  });

  it("Basic hides raw request/host IDs, permission matrix, and QR internals", () => {
    const preview = evaluateLucaLinkPairingRequest({ request: fixtures.pendingMobileCompanion, nowIso: LUCA_LINK_PAIRING_FIXTURE_NOW });
    const summary = createLucaLinkPairingDisclosureSummary(preview, "basic");
    expect(summary.diagnosticRequestId).toBeUndefined();
    expect(summary.diagnosticSourceHostId).toBeUndefined();
    expect(summary.requestedPermissionsCount).toBeUndefined();
    expect(summary.qrPayloadPreview).toBeUndefined();
  });

  it("Pro shows counts and safe states but not secrets or raw diagnostics", () => {
    const preview = evaluateLucaLinkPairingRequest({ request: fixtures.pendingMobileCompanion, nowIso: LUCA_LINK_PAIRING_FIXTURE_NOW });
    const summary = createLucaLinkPairingDisclosureSummary(preview, "pro");
    expect(summary.requestedPermissionsCount).toBe(2);
    expect(summary.requestMethod).toBe("qr_code");
    expect(summary.diagnosticRequestId).toBeUndefined();
    expect(JSON.stringify(summary)).not.toMatch(/secret|token/i);
  });

  it("Creator shows masked diagnostics and non-secret QR payload preview only", () => {
    const preview = evaluateLucaLinkPairingRequest({ request: fixtures.qrPreviewRequest, nowIso: LUCA_LINK_PAIRING_FIXTURE_NOW });
    const summary = createLucaLinkPairingDisclosureSummary(preview, "creator");
    expect(summary.diagnosticRequestId).toContain("…");
    expect(summary.diagnosticSourceHostId).toContain("…");
    expect(summary.qrPayloadPreview).toContain("non-secret");
    expect(summary.modelFlags).toContain("validForRuntimePairing:false");
    expect(JSON.stringify(summary)).not.toMatch(/runtime-valid|credential|api[_-]?key/i);
  });

  it("Operation Center summary remains pure and disabled", () => {
    const preview = evaluateLucaLinkPairingRequest({ request: fixtures.qrPreviewRequest, nowIso: LUCA_LINK_PAIRING_FIXTURE_NOW });
    const summary = createLucaLinkPairingOperationCenterSummary(preview);
    expect(summary.runtimePairing).toBe("disabled");
    expect(summary.sideEffects).toBe("none");
    expect(summary.previewOnly).toBe(true);
  });

  it("all outputs include sideEffectsPerformed false and previewOnly true", () => {
    const preview = evaluateLucaLinkPairingRequest({ request: fixtures.pendingMobileCompanion, nowIso: LUCA_LINK_PAIRING_FIXTURE_NOW });
    const approval = previewLucaLinkPairingApproval({ request: fixtures.pendingMobileCompanion, nowIso: LUCA_LINK_PAIRING_FIXTURE_NOW });
    const denial = previewLucaLinkPairingDenial(fixtures.pendingMobileCompanion);
    const expiration = previewLucaLinkPairingExpiration(fixtures.pendingMobileCompanion);
    expect([preview, preview.request, preview.codePreview, preview.auditPreview, approval, denial, expiration].every((output) => output.sideEffectsPerformed === false)).toBe(true);
    expect([preview, preview.request, preview.codePreview, preview.auditPreview, approval, denial, expiration].every((output) => output.previewOnly === true)).toBe(true);
  });

  it("original input is not mutated", () => {
    const request = structuredClone(fixtures.pendingMobileCompanion);
    const before = JSON.stringify(request);
    evaluateLucaLinkPairingRequest({ request, nowIso: LUCA_LINK_PAIRING_FIXTURE_NOW });
    previewLucaLinkPairingApproval({ request, nowIso: LUCA_LINK_PAIRING_FIXTURE_NOW });
    previewLucaLinkPairingDenial(request);
    previewLucaLinkPairingExpiration(request);
    expect(JSON.stringify(request)).toBe(before);
  });

  it("new module does not import runtime/socket/network/storage APIs", () => {
    const combined = [evaluatorSource, fixturesSource, policySource, typesSource].join("\n");
    expect(combined).not.toMatch(/from ["'].*(socket|transport|storage|lucaLinkService|qrScanner|qrcode)/i);
    expect(combined).not.toMatch(/\b(fetch|WebSocket|RTCPeerConnection|localStorage|sessionStorage|indexedDB)\b/);
  });
});

import { describe, expect, it } from "vitest";
import approvalSource from "./lucaLinkApprovalActionEvaluator.ts?raw";
import policySource from "./lucaLinkApprovalActionPolicy.ts?raw";
import fixtureSource from "./lucaLinkApprovalActionFixtures.ts?raw";
import typesSource from "./lucaLinkApprovalActionTypes.ts?raw";
import {
  createLucaLinkApprovalDisclosureSummary,
  createLucaLinkHandoffReviewSummary,
  createLucaLinkApprovalOperationCenterSummary,
  LUCA_LINK_APPROVAL_ACTION_APPROVALS,
  LUCA_LINK_APPROVAL_ACTION_HANDOFF_REVIEWS,
  LUCA_LINK_APPROVAL_ACTION_HOST_FIXTURES,
  LUCA_LINK_APPROVAL_ACTION_OWNERSHIP_ASSIGNMENTS,
  LUCA_LINK_APPROVAL_ACTION_PENDING_HANDOFFS,
  previewLucaLinkApprovalAction,
} from "./index";

const hostFixtures = LUCA_LINK_APPROVAL_ACTION_HOST_FIXTURES;

function revocationInput() {
  return {
    ownershipAssignments: LUCA_LINK_APPROVAL_ACTION_OWNERSHIP_ASSIGNMENTS,
    pendingHandoffs: LUCA_LINK_APPROVAL_ACTION_PENDING_HANDOFFS,
    approvals: LUCA_LINK_APPROVAL_ACTION_APPROVALS,
  };
}

describe("LucaLink local approval action previews", () => {
  it("approve_host preview moves pending host toward trusted_limited without runtime permissions", () => {
    const result = previewLucaLinkApprovalAction({
      host: hostFixtures.pendingMobileCompanion,
      action: "approve_host",
    });

    expect(result.proposedState.trustState).toBe("trusted_limited");
    expect(result.requiresConfirmation).toBe(true);
    expect(result.sideEffectsPerformed).toBe(false);
    expect(result.previewOnly).toBe(true);
    expect(result.proposedState.blockedPermissions).toEqual(
      expect.arrayContaining(["remote_action", "tool_execution", "admin_trust"]),
    );
  });

  it("approve_host does not allow remote_action/tool_execution/admin_trust", () => {
    const result = previewLucaLinkApprovalAction({
      host: hostFixtures.pendingMobileCompanion,
      action: "approve_host",
    });
    expect(result.proposedState.approvalRequiredPermissions).toEqual(
      expect.arrayContaining(["remote_action", "tool_execution", "admin_trust"]),
    );
    expect(result.runtimeDisabled).toBe(true);
  });

  it("deny_host preview blocks pending host without runtime side effects", () => {
    const result = previewLucaLinkApprovalAction({
      host: hostFixtures.pendingMobileCompanion,
      action: "deny_host",
    });
    expect(result.proposedState.connectionState).toBe("blocked");
    expect(result.proposedState.trustState).toBe("revoked");
    expect(result.sideEffectsPerformed).toBe(false);
    expect(result.previewOnly).toBe(true);
  });

  it("revoke_host preview composes revocation propagation dry-run", () => {
    const result = previewLucaLinkApprovalAction({
      host: hostFixtures.trustedLimitedDevice,
      action: "revoke_host",
      revocationInput: revocationInput(),
    });
    expect(result.revocationDryRun?.dryRunOnly).toBe(true);
    expect(result.revocationDryRun?.sideEffectsPerformed).toBe(false);
  });

  it("revoke_host result includes affected lanes, blocked permissions, and adapter dry-run actions", () => {
    const result = previewLucaLinkApprovalAction({
      host: hostFixtures.trustedLimitedDevice,
      action: "revoke_host",
      revocationInput: revocationInput(),
    });
    expect(result.revocationDryRun?.affectedLanes.length).toBeGreaterThan(0);
    expect(result.revocationDryRun?.blockedPermissions.length).toBeGreaterThan(0);
    expect(result.revocationDryRun?.adapterActions.length).toBeGreaterThan(0);
    expect(result.revocationDryRun?.adapterActions.every((action) => action.dryRunOnly)).toBe(true);
  });

  it("block_host requires confirmation and is dry-run", () => {
    const result = previewLucaLinkApprovalAction({
      host: hostFixtures.trustedFullDevice,
      action: "block_host",
      revocationInput: revocationInput(),
    });
    expect(result.requiresConfirmation).toBe(true);
    expect(result.revocationDryRun?.hostState).toBe("blocked");
    expect(result.revocationDryRun?.dryRunOnly).toBe(true);
  });

  it("review_handoff returns runtime_disabled for remote/tool lanes", () => {
    const result = previewLucaLinkApprovalAction({
      host: hostFixtures.trustedLimitedDevice,
      action: "review_handoff",
      handoff: LUCA_LINK_APPROVAL_ACTION_HANDOFF_REVIEWS.runtimeDisabledToolLane,
    });
    expect(result.handoffReview?.readiness).toBe("runtime_disabled");
    expect(result.decision).toBe("blocked");
  });

  it("review_handoff requires Primary Host review where appropriate", () => {
    const result = previewLucaLinkApprovalAction({
      host: hostFixtures.trustedLimitedDevice,
      action: "review_handoff",
      handoff: LUCA_LINK_APPROVAL_ACTION_HANDOFF_REVIEWS.primaryHostReviewRequired,
    });
    expect(result.requiresPrimaryHostReview).toBe(true);
    expect(result.handoffReview?.requiresPrimaryHostReview).toBe(true);
  });

  it("read-only observer cannot become authority", () => {
    const result = createLucaLinkHandoffReviewSummary(
      LUCA_LINK_APPROVAL_ACTION_HANDOFF_REVIEWS.readOnlyObserverAuthority,
    );
    expect(result.readiness).not.toBe("ready");
    expect(["blocked", "read_only"]).toContain(result.readiness);
  });

  it("Basic hides raw IDs and diagnostics", () => {
    const preview = previewLucaLinkApprovalAction({
      host: hostFixtures.trustedLimitedDevice,
      action: "revoke_host",
      revocationInput: revocationInput(),
    });
    const summary = createLucaLinkApprovalDisclosureSummary(preview, "basic");
    expect(summary.diagnosticHostId).toBeUndefined();
    expect(summary.affectedLanes).toBeUndefined();
    expect(summary.dryRunAdapterActions).toBeUndefined();
  });

  it("Pro shows counts but not raw dry-run matrix", () => {
    const preview = previewLucaLinkApprovalAction({
      host: hostFixtures.trustedLimitedDevice,
      action: "revoke_host",
      revocationInput: revocationInput(),
    });
    const summary = createLucaLinkApprovalDisclosureSummary(preview, "pro");
    expect(summary.counts?.affectedLanes).toBeGreaterThan(0);
    expect(summary.affectedLanes).toBeUndefined();
    expect(summary.dryRunAdapterActions).toBeUndefined();
  });

  it("Operation Center summary stays read-only and count-based", () => {
    const preview = previewLucaLinkApprovalAction({
      host: hostFixtures.trustedLimitedDevice,
      action: "revoke_host",
      revocationInput: revocationInput(),
    });
    const summary = createLucaLinkApprovalOperationCenterSummary(preview);
    expect(summary.runtimeExecution).toBe("disabled");
    expect(summary.sideEffects).toBe("none");
    expect(summary.affectedLanes).toBeGreaterThan(0);
    expect(summary.previewOnly).toBe(true);
  });

  it("Creator shows safe diagnostics without executing anything", () => {
    const preview = previewLucaLinkApprovalAction({
      host: hostFixtures.trustedLimitedDevice,
      action: "revoke_host",
      revocationInput: revocationInput(),
    });
    const summary = createLucaLinkApprovalDisclosureSummary(preview, "creator");
    expect(summary.diagnosticHostId).toContain("…");
    expect(summary.dryRunAdapterActions?.length).toBeGreaterThan(0);
    expect(summary.modelFlags).toContain("sideEffectsPerformed:false");
  });

  it("all previews include sideEffectsPerformed false and previewOnly true", () => {
    const previews = [
      previewLucaLinkApprovalAction({ host: hostFixtures.pendingMobileCompanion, action: "approve_host" }),
      previewLucaLinkApprovalAction({ host: hostFixtures.pendingMobileCompanion, action: "deny_host" }),
      previewLucaLinkApprovalAction({ host: hostFixtures.trustedLimitedDevice, action: "revoke_host", revocationInput: revocationInput() }),
      previewLucaLinkApprovalAction({ host: hostFixtures.trustedFullDevice, action: "block_host", revocationInput: revocationInput() }),
      previewLucaLinkApprovalAction({ host: hostFixtures.trustedLimitedDevice, action: "review_handoff", handoff: LUCA_LINK_APPROVAL_ACTION_HANDOFF_REVIEWS.pendingHandoff }),
      previewLucaLinkApprovalAction({ host: hostFixtures.trustedLimitedDevice, action: "cancel_handoff", handoff: LUCA_LINK_APPROVAL_ACTION_HANDOFF_REVIEWS.pendingHandoff }),
    ];
    expect(previews.every((preview) => preview.sideEffectsPerformed === false)).toBe(true);
    expect(previews.every((preview) => preview.previewOnly === true)).toBe(true);
  });

  it("original inputs are not mutated", () => {
    const host = structuredClone(hostFixtures.pendingMobileCompanion);
    const before = JSON.stringify(host);
    previewLucaLinkApprovalAction({ host, action: "approve_host" });
    expect(JSON.stringify(host)).toBe(before);
  });

  it("does not import runtime, socket, transport, persistence, or network APIs", () => {
    const combined = [approvalSource, policySource, fixtureSource, typesSource].join("\n");
    expect(combined).not.toMatch(/from ["'].*(socket|transport|persistence|storage|lucaLinkService)/i);
    expect(combined).not.toMatch(/\b(fetch|WebSocket|RTCPeerConnection|localStorage|sessionStorage)\b/);
  });
});

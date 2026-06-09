import { describe, expect, it } from "vitest";
import {
  canExchangeFiles,
  canPerformRemoteAction,
  canRelayVoice,
  canRequestAdminTrust,
  canShareScreen,
  canSyncMemory,
  canUsePermission,
  canUseToolExecution,
} from "./lucaLinkPermissionEvaluator";
import { revokeLucaLinkGovernanceState } from "./lucaLinkRevocationEvaluator";
import type { LucaLinkGovernanceInput } from "./lucaLinkGovernanceTypes";

const approvedFull: LucaLinkGovernanceInput = {
  trustState: "trusted_full",
  permissionState: "allowed",
  approvalState: "approved",
  connectionState: "online",
};

describe("LucaLink governance permission evaluation", () => {
  it("allows approved model scopes while keeping runtime authority disabled", () => {
    expect(canSyncMemory(approvedFull)).toMatchObject({
      decision: "allowed",
      reason: "trusted_full + approved + permission_allowed",
    });
    expect(canRelayVoice(approvedFull).decision).toBe("allowed");
    expect(canShareScreen(approvedFull).decision).toBe("allowed");
    expect(canExchangeFiles(approvedFull).decision).toBe("allowed");

    expect(canPerformRemoteAction(approvedFull)).toMatchObject({
      decision: "denied",
      reason: "remote_action_runtime_disabled",
      sensitive: true,
    });
    expect(canUseToolExecution(approvedFull)).toMatchObject({
      decision: "denied",
      reason: "tool_execution_runtime_disabled",
      sensitive: true,
    });
    expect(canRequestAdminTrust(approvedFull)).toMatchObject({
      decision: "denied",
      reason: "admin_trust_requires_primary_host_review",
      sensitive: true,
    });
  });

  it("never allows revoked hosts and removes active permission state", () => {
    const revoked = revokeLucaLinkGovernanceState({
      trustState: "trusted_full",
      approvalState: "approved",
      connectionState: "online",
      permissionStates: {
        sync_memory: "allowed",
        voice_relay: "allowed",
        tool_execution: "allowed",
        remote_action: "allowed",
      },
    });

    expect(Object.values(revoked.permissionStates)).toEqual([
      "denied",
      "denied",
      "denied",
      "denied",
    ]);
    for (const evaluate of [
      canSyncMemory,
      canRelayVoice,
      canUseToolExecution,
      canPerformRemoteAction,
    ]) {
      expect(
        evaluate({
          trustState: revoked.trustState,
          permissionState: "allowed",
          approvalState: revoked.approvalState,
          connectionState: revoked.connectionState,
        }),
      ).toMatchObject({ decision: "revoked", reason: "device_revoked" });
    }
  });

  it.each(["trusted_limited", "pending"] as const)(
    "revocation wins for a %s host",
    (trustState) => {
      expect(
        canSyncMemory({
          ...approvedFull,
          trustState,
          connectionState: "revoked",
        }),
      ).toMatchObject({ decision: "revoked", reason: "device_revoked" });
    },
  );

  it("keeps pending approval non-authoritative for sensitive permissions", () => {
    for (const permission of [
      "sync_memory",
      "remote_action",
      "tool_execution",
      "file_exchange",
      "share_screen",
      "admin_trust",
    ] as const) {
      expect(
        canUsePermission({
          ...approvedFull,
          permission,
          approvalState: "pending",
        }),
      ).toMatchObject({ decision: "pending", reason: "approval_pending" });
    }
  });

  it("allows a limited host only when its specific scope is approved and granted", () => {
    expect(
      canRelayVoice({ ...approvedFull, trustState: "trusted_limited" }),
    ).toMatchObject({ decision: "allowed" });
    expect(
      canExchangeFiles({
        ...approvedFull,
        trustState: "trusted_limited",
        permissionState: "denied",
      }),
    ).toMatchObject({ decision: "denied", reason: "permission_denied" });
  });

  it("is deterministic while offline and does not invent transport authority", () => {
    expect(
      canSyncMemory({ ...approvedFull, connectionState: "offline" }),
    ).toEqual(canSyncMemory({ ...approvedFull, connectionState: "offline" }));
    expect(
      canSyncMemory({ ...approvedFull, connectionState: "offline" }).decision,
    ).toBe("allowed");
  });

  it("always denies blocked hosts before approval or permission checks", () => {
    expect(
      canPerformRemoteAction({
        ...approvedFull,
        connectionState: "blocked",
      }),
    ).toMatchObject({ decision: "denied", reason: "device_blocked" });
  });

  it("denies untrusted hosts and leaves trust-pending hosts non-authoritative", () => {
    expect(
      canSyncMemory({ ...approvedFull, trustState: "untrusted" }),
    ).toMatchObject({ decision: "denied", reason: "device_untrusted" });
    expect(
      canSyncMemory({ ...approvedFull, trustState: "pending" }),
    ).toMatchObject({ decision: "pending", reason: "trust_pending" });
  });
});

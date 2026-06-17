import { createLucaLinkLinkedHostRecord } from "../lucaLinkLinkedHostRegistry";
import type { LucaLinkTrustedDeviceRecord } from "../lucaLinkDeviceTrustRegistry";
import {
  LUCA_LINK_SESSION_OWNERSHIP_FIXTURES,
  type LucaLinkSessionOwnershipState,
} from "../sessionOwnership";
import type { LucaLinkPendingHandoff, LucaLinkRevocationApprovalRecord, LucaLinkRevocationOwnershipAssignment } from "../revocationPropagation";
import type { LucaLinkHandoffReviewInput } from "./lucaLinkApprovalActionTypes";

const now = 1780963200000;

function device(input: Partial<LucaLinkTrustedDeviceRecord> & Pick<LucaLinkTrustedDeviceRecord, "deviceId" | "displayName" | "role" | "trustLevel" | "status">): LucaLinkTrustedDeviceRecord {
  return {
    createdAt: now,
    updatedAt: now,
    lastSeenAt: now,
    deviceType: input.role === "display" ? "display" : input.role === "companion" ? "mobile" : "desktop",
    capabilities: [],
    deniedCapabilities: [],
    permissionSummary: {
      conversation: input.trustLevel !== "guest",
      notification: input.trustLevel !== "guest",
      memory: false,
      tools: false,
      files: false,
      code: false,
      browser: false,
      shell: false,
      payment: false,
      physicalWorld: false,
      safety: true,
    },
    warnings: [],
    errors: [],
    ...input,
  };
}

export const LUCA_LINK_APPROVAL_ACTION_DEVICE_FIXTURES = {
  primaryHost: device({ deviceId: "fixture-primary-host", displayName: "Primary Host", role: "primary-host", trustLevel: "owner", status: "connected" }),
  pendingMobileCompanion: device({ deviceId: "fixture-pending-mobile", displayName: "Pending Mobile Companion", role: "companion", trustLevel: "paired", status: "known" }),
  trustedLimitedDevice: device({ deviceId: "fixture-trusted-limited", displayName: "Limited Companion", role: "companion", trustLevel: "trusted", status: "connected" }),
  trustedFullDevice: device({ deviceId: "fixture-trusted-full", displayName: "Full Trust Workstation", role: "execution", trustLevel: "admin", status: "connected" }),
  revokedHost: device({ deviceId: "fixture-revoked-host", displayName: "Revoked Tablet", role: "companion", trustLevel: "paired", status: "revoked" }),
  blockedHost: device({ deviceId: "fixture-blocked-host", displayName: "Blocked Browser", role: "guest", trustLevel: "guest", status: "blocked" }),
  displaySurface: device({ deviceId: "fixture-display-surface", displayName: "Studio Display Surface", role: "display", trustLevel: "trusted", status: "connected" }),
  voiceRelay: device({ deviceId: "fixture-voice-relay", displayName: "Voice Relay", role: "sensor", trustLevel: "trusted", status: "connected" }),
} as const;

export const LUCA_LINK_APPROVAL_ACTION_HOST_FIXTURES = {
  primaryHost: createLucaLinkLinkedHostRecord(LUCA_LINK_APPROVAL_ACTION_DEVICE_FIXTURES.primaryHost, "fixture-primary-host"),
  pendingMobileCompanion: {
    ...createLucaLinkLinkedHostRecord(LUCA_LINK_APPROVAL_ACTION_DEVICE_FIXTURES.pendingMobileCompanion, "fixture-primary-host"),
    connectionState: "pending_approval" as const,
    trustState: "pending" as const,
  },
  trustedLimitedDevice: createLucaLinkLinkedHostRecord(LUCA_LINK_APPROVAL_ACTION_DEVICE_FIXTURES.trustedLimitedDevice, "fixture-primary-host"),
  trustedFullDevice: createLucaLinkLinkedHostRecord(LUCA_LINK_APPROVAL_ACTION_DEVICE_FIXTURES.trustedFullDevice, "fixture-primary-host"),
  revokedHost: createLucaLinkLinkedHostRecord(LUCA_LINK_APPROVAL_ACTION_DEVICE_FIXTURES.revokedHost, "fixture-primary-host"),
  blockedHost: createLucaLinkLinkedHostRecord(LUCA_LINK_APPROVAL_ACTION_DEVICE_FIXTURES.blockedHost, "fixture-primary-host"),
  displaySurface: createLucaLinkLinkedHostRecord(LUCA_LINK_APPROVAL_ACTION_DEVICE_FIXTURES.displaySurface, "fixture-primary-host"),
  voiceRelay: createLucaLinkLinkedHostRecord(LUCA_LINK_APPROVAL_ACTION_DEVICE_FIXTURES.voiceRelay, "fixture-primary-host"),
} as const;

const session = LUCA_LINK_SESSION_OWNERSHIP_FIXTURES;

export const LUCA_LINK_APPROVAL_ACTION_OWNERSHIP_ASSIGNMENTS: readonly LucaLinkRevocationOwnershipAssignment[] = [
  { lane: "conversation_owner", owner: { ...session.mobileCompanion, hostId: "fixture-trusted-limited" } },
  { lane: "voice_owner", owner: { ...session.mobileCompanion, hostId: "fixture-trusted-limited" } },
  { lane: "tool_execution_owner", owner: { ...session.mobileCompanion, hostId: "fixture-trusted-limited" } },
];

export const LUCA_LINK_APPROVAL_ACTION_PENDING_HANDOFFS: readonly LucaLinkPendingHandoff[] = [
  { handoffId: "fixture-pending-handoff", sessionId: "fixture-session", fromHostId: session.primaryHost.hostId, toHostId: session.mobileCompanion.hostId, lane: "display_owner", approvalOwnerHostId: session.primaryHost.hostId, state: "pending" },
  { handoffId: "fixture-revoked-target-handoff", sessionId: "fixture-session", fromHostId: session.primaryHost.hostId, toHostId: session.revokedHost.hostId, lane: "voice_owner", approvalOwnerHostId: session.primaryHost.hostId, state: "awaiting_approval" },
  { handoffId: "fixture-primary-review-handoff", sessionId: "fixture-session", fromHostId: session.mobileCompanion.hostId, toHostId: session.handoffTarget.hostId, lane: "approval_owner", approvalOwnerHostId: session.mobileCompanion.hostId, state: "awaiting_approval" },
  { handoffId: "fixture-tool-lane-handoff", sessionId: "fixture-session", fromHostId: session.primaryHost.hostId, toHostId: session.mobileCompanion.hostId, lane: "tool_execution_owner", approvalOwnerHostId: session.primaryHost.hostId, state: "pending" },
];

export const LUCA_LINK_APPROVAL_ACTION_APPROVALS: readonly LucaLinkRevocationApprovalRecord[] = [
  { approvalId: "fixture-stale-approval", requestedByHostId: "fixture-trusted-limited", targetHostId: session.primaryHost.hostId, approvalOwnerHostId: session.primaryHost.hostId, state: "approved", permission: "sync_context" },
];

export const LUCA_LINK_APPROVAL_ACTION_SESSION_STATE: LucaLinkSessionOwnershipState = {
  sessionId: "fixture-session",
  hosts: Object.values(session),
};

export const LUCA_LINK_APPROVAL_ACTION_HANDOFF_REVIEWS = {
  pendingHandoff: {
    handoffId: "fixture-pending-handoff",
    fromHost: session.primaryHost,
    toHost: session.displaySurface,
    lane: "display_owner",
    approvalOwnerHostId: session.primaryHost.hostId,
    governanceDecision: { decision: "allowed", reason: "fixture_allowed" },
    sessionOwnershipState: LUCA_LINK_APPROVAL_ACTION_SESSION_STATE,
  },
  revokedTarget: {
    handoffId: "fixture-revoked-target-handoff",
    fromHost: session.primaryHost,
    toHost: session.revokedHost,
    lane: "voice_owner",
    approvalOwnerHostId: session.primaryHost.hostId,
    governanceDecision: { decision: "allowed", reason: "fixture_allowed" },
    sessionOwnershipState: LUCA_LINK_APPROVAL_ACTION_SESSION_STATE,
  },
  primaryHostReviewRequired: {
    handoffId: "fixture-primary-review-handoff",
    fromHost: session.mobileCompanion,
    toHost: session.handoffTarget,
    lane: "approval_owner",
    approvalOwnerHostId: session.mobileCompanion.hostId,
    governanceDecision: { decision: "pending", reason: "fixture_pending" },
    sessionOwnershipState: LUCA_LINK_APPROVAL_ACTION_SESSION_STATE,
  },
  runtimeDisabledToolLane: {
    handoffId: "fixture-tool-lane-handoff",
    fromHost: session.primaryHost,
    toHost: session.mobileCompanion,
    lane: "tool_execution_owner",
    approvalOwnerHostId: session.primaryHost.hostId,
    governanceDecision: { decision: "allowed", reason: "fixture_allowed" },
    sessionOwnershipState: LUCA_LINK_APPROVAL_ACTION_SESSION_STATE,
  },
  readOnlyObserverAuthority: {
    handoffId: "fixture-read-only-authority",
    fromHost: session.primaryHost,
    toHost: session.readOnlyObserver,
    lane: "conversation_owner",
    approvalOwnerHostId: session.primaryHost.hostId,
    governanceDecision: { decision: "allowed", reason: "fixture_allowed" },
    sessionOwnershipState: LUCA_LINK_APPROVAL_ACTION_SESSION_STATE,
  },
} as const satisfies Record<string, LucaLinkHandoffReviewInput>;

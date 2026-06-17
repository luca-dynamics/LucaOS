import {
  LUCA_LINK_SESSION_OWNERSHIP_FIXTURES,
  type LucaLinkSessionHost,
} from "../sessionOwnership";
import { evaluateLucaLinkRevocationPropagation } from "./lucaLinkRevocationPropagationEvaluator";
import type {
  LucaLinkPendingHandoff,
  LucaLinkRevocationApprovalRecord,
  LucaLinkRevocationOwnershipAssignment,
  LucaLinkRevocationPropagationInput,
} from "./lucaLinkRevocationPropagationTypes";

const sessionFixtures = LUCA_LINK_SESSION_OWNERSHIP_FIXTURES;

export const LUCA_LINK_REVOCATION_PROPAGATION_HOST_FIXTURES = {
  primaryHost: sessionFixtures.primaryHost,
  mobileVoiceOwner: {
    ...sessionFixtures.mobileCompanion,
    displayName: "Pocket Voice Companion",
  },
  displayOwner: {
    ...sessionFixtures.displaySurface,
    displayName: "Workshop Display",
  },
  revokedLaneOwner: {
    hostId: "fixture-revoked-lane-owner",
    displayName: "Retired Companion",
    role: "revoked",
    trustState: "revoked",
    connectionState: "revoked",
    approvalState: "revoked",
  },
  blockedHost: sessionFixtures.blockedHost,
} as const satisfies Record<string, LucaLinkSessionHost>;

export const LUCA_LINK_REVOCATION_OWNERSHIP_FIXTURES: readonly LucaLinkRevocationOwnershipAssignment[] =
  [
    {
      lane: "conversation_owner",
      owner: LUCA_LINK_REVOCATION_PROPAGATION_HOST_FIXTURES.primaryHost,
    },
    {
      lane: "voice_owner",
      owner: LUCA_LINK_REVOCATION_PROPAGATION_HOST_FIXTURES.revokedLaneOwner,
    },
    {
      lane: "display_owner",
      owner: LUCA_LINK_REVOCATION_PROPAGATION_HOST_FIXTURES.revokedLaneOwner,
    },
    {
      lane: "approval_owner",
      owner: LUCA_LINK_REVOCATION_PROPAGATION_HOST_FIXTURES.revokedLaneOwner,
    },
    {
      lane: "memory_context_owner",
      owner: LUCA_LINK_REVOCATION_PROPAGATION_HOST_FIXTURES.revokedLaneOwner,
    },
    {
      lane: "tool_execution_owner",
      owner: LUCA_LINK_REVOCATION_PROPAGATION_HOST_FIXTURES.revokedLaneOwner,
    },
    {
      lane: "handoff_owner",
      owner: LUCA_LINK_REVOCATION_PROPAGATION_HOST_FIXTURES.revokedLaneOwner,
    },
  ];

export const LUCA_LINK_REVOCATION_HANDOFF_FIXTURES: readonly LucaLinkPendingHandoff[] =
  [
    {
      handoffId: "fixture-handoff-from-revoked",
      sessionId: "fixture-session-revocation",
      fromHostId: "fixture-revoked-lane-owner",
      toHostId: "fixture-primary",
      lane: "voice_owner",
      approvalOwnerHostId: "fixture-primary",
      state: "pending",
    },
    {
      handoffId: "fixture-handoff-to-revoked",
      sessionId: "fixture-session-revocation",
      fromHostId: "fixture-primary",
      toHostId: "fixture-revoked-lane-owner",
      lane: "display_owner",
      approvalOwnerHostId: "fixture-primary",
      state: "awaiting_approval",
    },
  ];

export const LUCA_LINK_REVOCATION_APPROVAL_FIXTURES: readonly LucaLinkRevocationApprovalRecord[] =
  [
    {
      approvalId: "fixture-approval-revoked-host",
      requestedByHostId: "fixture-revoked-lane-owner",
      targetHostId: "fixture-primary",
      approvalOwnerHostId: "fixture-primary",
      state: "approved",
      permission: "voice_relay",
    },
    {
      approvalId: "fixture-stale-memory-context",
      requestedByHostId: "fixture-primary",
      targetHostId: "fixture-revoked-lane-owner",
      approvalOwnerHostId: "fixture-primary",
      state: "pending",
      permission: "sync_memory",
    },
  ];

export const LUCA_LINK_REVOCATION_PROPAGATION_INPUT_FIXTURE: LucaLinkRevocationPropagationInput =
  {
    host: LUCA_LINK_REVOCATION_PROPAGATION_HOST_FIXTURES.revokedLaneOwner,
    primaryHost: LUCA_LINK_REVOCATION_PROPAGATION_HOST_FIXTURES.primaryHost,
    generatedAt: "2026-06-09T12:00:00.000Z",
    ownershipAssignments: LUCA_LINK_REVOCATION_OWNERSHIP_FIXTURES,
    pendingHandoffs: LUCA_LINK_REVOCATION_HANDOFF_FIXTURES,
    approvals: LUCA_LINK_REVOCATION_APPROVAL_FIXTURES,
  };

export const LUCA_LINK_REVOCATION_PROPAGATION_PLAN_FIXTURE =
  evaluateLucaLinkRevocationPropagation(
    LUCA_LINK_REVOCATION_PROPAGATION_INPUT_FIXTURE,
  );

export const LUCA_LINK_REVOCATION_ADAPTER_ACTION_FIXTURE =
  LUCA_LINK_REVOCATION_PROPAGATION_PLAN_FIXTURE.adapterActions;

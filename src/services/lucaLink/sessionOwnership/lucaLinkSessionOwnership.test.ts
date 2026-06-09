import { describe, expect, it } from "vitest";
import {
  evaluateLucaLinkHandoffReadiness,
  evaluateLucaLinkSessionOwnership,
} from "./lucaLinkSessionOwnershipEvaluator";
import {
  LUCA_LINK_SESSION_OWNERSHIP_FIXTURES,
  LUCA_LINK_SESSION_OWNERSHIP_STATE_FIXTURE,
} from "./lucaLinkSessionOwnershipFixtures";
import type {
  LucaLinkSessionLane,
  LucaLinkSessionOwnershipState,
} from "./lucaLinkSessionOwnershipTypes";

const fixtures = LUCA_LINK_SESSION_OWNERSHIP_FIXTURES;
const allowedGovernance = {
  decision: "allowed",
  reason: "fixture_governance_allowed",
} as const;

function withRequestedOwner(
  lane: LucaLinkSessionLane,
  hostId: string,
): LucaLinkSessionOwnershipState {
  return {
    ...LUCA_LINK_SESSION_OWNERSHIP_STATE_FIXTURE,
    requestedOwners: { [lane]: hostId },
  };
}

describe("LucaLink session ownership", () => {
  it("keeps the Primary Host as deterministic approval owner", () => {
    expect(
      evaluateLucaLinkSessionOwnership(
        LUCA_LINK_SESSION_OWNERSHIP_STATE_FIXTURE,
        "approval_owner",
      ),
    ).toMatchObject({
      status: "owned",
      owner: { hostId: fixtures.primaryHost.hostId, role: "primary_host" },
      modelOnly: true,
      sideEffectsPerformed: false,
    });
  });

  it("does not let a companion silently become Primary Host", () => {
    expect(
      evaluateLucaLinkSessionOwnership(
        withRequestedOwner("approval_owner", fixtures.mobileCompanion.hostId),
        "approval_owner",
      ),
    ).toMatchObject({
      status: "pending_approval",
      reason: "primary_host_required",
    });
  });

  it.each([
    ["display surface", fixtures.displaySurface.hostId],
    ["voice relay", fixtures.voiceRelayHost.hostId],
  ])("keeps the tool execution lane runtime disabled for a %s", (_label, hostId) => {
    expect(
      evaluateLucaLinkSessionOwnership(
        withRequestedOwner("tool_execution_owner", hostId),
        "tool_execution_owner",
      ),
    ).toMatchObject({
      status: "runtime_disabled",
      reason: "runtime_not_enabled",
      sideEffectsPerformed: false,
    });
  });

  it.each([
    ["revoked", fixtures.revokedHost.hostId, "revoked", "host_revoked"],
    ["blocked", fixtures.blockedHost.hostId, "blocked", "host_blocked"],
  ] as const)(
    "%s hosts cannot own an active lane",
    (_label, hostId, status, reason) => {
      const result = evaluateLucaLinkSessionOwnership(
        withRequestedOwner("conversation_owner", hostId),
        "conversation_owner",
      );
      expect(result).toMatchObject({ status, reason });
      expect(result.owner).toBeUndefined();
    },
  );

  it("classifies an observer as read-only instead of assigning ownership", () => {
    expect(
      evaluateLucaLinkSessionOwnership(
        withRequestedOwner(
          "display_owner",
          fixtures.readOnlyObserver.hostId,
        ),
        "display_owner",
      ),
    ).toMatchObject({
      status: "read_only",
      reason: "read_only_observer",
      owner: { hostId: fixtures.readOnlyObserver.hostId },
    });
  });

  it("does not let a read-only observer represent authority-sensitive lanes", () => {
    const result = evaluateLucaLinkSessionOwnership(
      withRequestedOwner(
        "memory_context_owner",
        fixtures.readOnlyObserver.hostId,
      ),
      "memory_context_owner",
    );
    expect(result).toMatchObject({
      status: "unassigned",
      reason: "role_not_allowed_for_lane",
    });
    expect(result.owner).toBeUndefined();
  });

  it("leaves the tool execution lane runtime disabled without a requested host", () => {
    expect(
      evaluateLucaLinkSessionOwnership(
        LUCA_LINK_SESSION_OWNERSHIP_STATE_FIXTURE,
        "tool_execution_owner",
      ),
    ).toEqual({
      lane: "tool_execution_owner",
      status: "runtime_disabled",
      reason: "runtime_not_enabled",
      modelOnly: true,
      sideEffectsPerformed: false,
    });
  });
});

describe("LucaLink handoff readiness", () => {
  it("classifies a handoff target without executing or mutating a handoff", () => {
    const stateBefore = structuredClone(
      LUCA_LINK_SESSION_OWNERSHIP_STATE_FIXTURE,
    );
    const result = evaluateLucaLinkHandoffReadiness({
      fromHost: fixtures.primaryHost,
      toHost: fixtures.handoffTarget,
      lane: "conversation_owner",
      governanceDecision: allowedGovernance,
      sessionOwnershipState: LUCA_LINK_SESSION_OWNERSHIP_STATE_FIXTURE,
    });

    expect(result).toMatchObject({
      readiness: "approval_required",
      reason: "approval_required",
      classificationOnly: true,
      sideEffectsPerformed: false,
    });
    expect(LUCA_LINK_SESSION_OWNERSHIP_STATE_FIXTURE).toEqual(stateBefore);
  });

  it.each([
    [fixtures.revokedHost, "revoked", "host_revoked"],
    [fixtures.blockedHost, "blocked", "host_blocked"],
  ] as const)(
    "never reports a terminal target as ready",
    (toHost, readiness, reason) => {
      expect(
        evaluateLucaLinkHandoffReadiness({
          fromHost: fixtures.primaryHost,
          toHost,
          lane: "display_owner",
          governanceDecision: allowedGovernance,
          sessionOwnershipState: LUCA_LINK_SESSION_OWNERSHIP_STATE_FIXTURE,
        }),
      ).toMatchObject({ readiness, reason });
    },
  );

  it.each(["remote_action", "tool_execution_owner"] as const)(
    "classifies %s as runtime disabled",
    (lane) => {
      expect(
        evaluateLucaLinkHandoffReadiness({
          fromHost: fixtures.primaryHost,
          toHost: fixtures.mobileCompanion,
          lane,
          governanceDecision: allowedGovernance,
          sessionOwnershipState: LUCA_LINK_SESSION_OWNERSHIP_STATE_FIXTURE,
        }),
      ).toMatchObject({
        readiness: "runtime_disabled",
        reason: "runtime_not_enabled",
      });
    },
  );

  it("requires Primary Host authority for the approval lane", () => {
    expect(
      evaluateLucaLinkHandoffReadiness({
        fromHost: fixtures.primaryHost,
        toHost: fixtures.mobileCompanion,
        lane: "approval_owner",
        governanceDecision: allowedGovernance,
        sessionOwnershipState: LUCA_LINK_SESSION_OWNERSHIP_STATE_FIXTURE,
      }),
    ).toMatchObject({
      readiness: "approval_required",
      reason: "primary_host_required",
    });
  });

  it("can mark an eligible display lane ready without changing session state", () => {
    const frozenState = Object.freeze({
      ...LUCA_LINK_SESSION_OWNERSHIP_STATE_FIXTURE,
      hosts: Object.freeze([...LUCA_LINK_SESSION_OWNERSHIP_STATE_FIXTURE.hosts]),
    });
    expect(
      evaluateLucaLinkHandoffReadiness({
        fromHost: fixtures.primaryHost,
        toHost: fixtures.displaySurface,
        lane: "display_owner",
        governanceDecision: allowedGovernance,
        sessionOwnershipState: frozenState,
      }),
    ).toEqual({
      readiness: "ready",
      fromHostId: fixtures.primaryHost.hostId,
      toHostId: fixtures.displaySurface.hostId,
      lane: "display_owner",
      classificationOnly: true,
      sideEffectsPerformed: false,
    });
  });
});

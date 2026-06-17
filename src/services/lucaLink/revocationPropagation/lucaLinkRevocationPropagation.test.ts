import { describe, expect, it } from "vitest";
import {
  classifyRevocationPendingHandoff,
  createRevocationDeviceCenterSummary,
  createRevocationOperationSummary,
  evaluateLucaLinkRevocationPropagation,
} from "./lucaLinkRevocationPropagationEvaluator";
import {
  LUCA_LINK_REVOCATION_HANDOFF_FIXTURES,
  LUCA_LINK_REVOCATION_PROPAGATION_HOST_FIXTURES,
  LUCA_LINK_REVOCATION_PROPAGATION_INPUT_FIXTURE,
} from "./lucaLinkRevocationPropagationFixtures";

const input = LUCA_LINK_REVOCATION_PROPAGATION_INPUT_FIXTURE;
const hosts = LUCA_LINK_REVOCATION_PROPAGATION_HOST_FIXTURES;

function evaluate() {
  return evaluateLucaLinkRevocationPropagation(input);
}

describe("LucaLink revocation propagation dry run", () => {
  it.each(["voice_owner", "display_owner"] as const)(
    "invalidates a revoked host that owns %s",
    (lane: "voice_owner" | "display_owner") => {
      expect(evaluate().affectedLanes).toContainEqual(
        expect.objectContaining({
          lane,
          previousOwnerHostId: hosts.revokedLaneOwner.hostId,
          disposition: "invalidate_and_review",
          reassignmentPerformed: false,
        }),
      );
    },
  );

  it("does not allow the revoked host to remain approval owner", () => {
    expect(evaluate().affectedLanes).toContainEqual(
      expect.objectContaining({
        lane: "approval_owner",
        disposition: "primary_host_review",
        previousOwnerHostId: hosts.revokedLaneOwner.hostId,
      }),
    );
  });

  it("suggests Primary Host review without mutating approval ownership", () => {
    const approvalLane = evaluate().affectedLanes.find(
      (lane) => lane.lane === "approval_owner",
    );
    expect(approvalLane).toMatchObject({
      suggestedFallbackHostId: hosts.primaryHost.hostId,
      reassignmentPerformed: false,
    });
    expect(evaluate().requiresUserReview).toBe(true);
  });

  it("cancels a pending handoff from the revoked host", () => {
    expect(
      classifyRevocationPendingHandoff(
        LUCA_LINK_REVOCATION_HANDOFF_FIXTURES[0],
        hosts.revokedLaneOwner.hostId,
      ),
    ).toMatchObject({
      disposition: "cancelled",
      reason: "handoff_source_invalid",
      stateMutationPerformed: false,
    });
  });

  it("blocks a pending handoff to the revoked host", () => {
    expect(
      classifyRevocationPendingHandoff(
        LUCA_LINK_REVOCATION_HANDOFF_FIXTURES[1],
        hosts.revokedLaneOwner.hostId,
      ),
    ).toMatchObject({
      disposition: "blocked",
      reason: "handoff_target_invalid",
      stateMutationPerformed: false,
    });
  });

  it("requires Primary Host review when the revoked host was approval owner", () => {
    expect(
      classifyRevocationPendingHandoff(
        {
          handoffId: "fixture-approval-owner-handoff",
          sessionId: "fixture-session",
          fromHostId: hosts.primaryHost.hostId,
          toHostId: hosts.displayOwner.hostId,
          lane: "display_owner",
          approvalOwnerHostId: hosts.revokedLaneOwner.hostId,
          state: "awaiting_approval",
        },
        hosts.revokedLaneOwner.hostId,
      ),
    ).toMatchObject({
      disposition: "requires_review",
      reason: "handoff_approval_owner_invalid",
      primaryHostReviewRequired: true,
    });
  });

  it.each(["remote_action", "tool_execution_owner"] as const)(
    "keeps a %s handoff runtime disabled",
    (lane: "remote_action" | "tool_execution_owner") => {
      expect(
        classifyRevocationPendingHandoff(
          {
            handoffId: `fixture-${lane}`,
            sessionId: "fixture-session",
            fromHostId: hosts.primaryHost.hostId,
            toHostId: hosts.mobileVoiceOwner.hostId,
            lane,
            state: "pending",
          },
          hosts.revokedLaneOwner.hostId,
        ),
      ).toMatchObject({
        disposition: "blocked",
        reason: "runtime_not_enabled",
      });
    },
  );

  it("creates a terminal blocked-host propagation plan", () => {
    const result = evaluateLucaLinkRevocationPropagation({
      ...input,
      host: hosts.blockedHost,
      ownershipAssignments: [{ lane: "voice_owner", owner: hosts.blockedHost }],
    });
    expect(result).toMatchObject({
      hostState: "blocked",
      deviceCenterState: {
        connectionState: "blocked",
        label: "Blocked",
        runtimeActionExecuted: false,
      },
    });
    expect(result.affectedLanes[0].reason).toBe("blocked_host_owns_lane");
  });

  it.each(["remote_action", "tool_execution", "admin_trust"] as const)(
    "keeps %s non-runtime and blocked regardless of stale state",
    (permission: "remote_action" | "tool_execution" | "admin_trust") => {
      expect(evaluate().blockedPermissions).toContainEqual({
        permission,
        state: "runtime_disabled",
        reason: "runtime_not_enabled",
      });
    },
  );

  it("marks every future adapter action as dry-run only", () => {
    const result = evaluate();
    expect(result.adapterActions.length).toBeGreaterThan(0);
    expect(result.adapterActions.every((action) => action.dryRunOnly)).toBe(
      true,
    );
    expect(result.adapterActions.map((action) => action.action)).toEqual(
      expect.arrayContaining([
        "disconnect_transport",
        "stop_voice_relay",
        "stop_display_session",
        "cancel_file_exchange",
        "cancel_pending_handoff",
        "clear_memory_context",
        "invalidate_tool_execution_candidate",
        "record_audit_event",
      ]),
    );
  });

  it("reports a side-effect-free deterministic result", () => {
    expect(evaluate()).toMatchObject({
      generatedAt: input.generatedAt,
      sideEffectsPerformed: false,
      dryRunOnly: true,
    });
    expect(evaluate()).toEqual(evaluate());
  });

  it("does not mutate original ownership, handoff, or approval inputs", () => {
    const frozenInput = Object.freeze({
      ...input,
      ownershipAssignments: Object.freeze(
        input.ownershipAssignments.map((assignment) =>
          Object.freeze({ ...assignment }),
        ),
      ),
      pendingHandoffs: Object.freeze(
        (input.pendingHandoffs ?? []).map((handoff) =>
          Object.freeze({ ...handoff }),
        ),
      ),
      approvals: Object.freeze(
        (input.approvals ?? []).map((approval) =>
          Object.freeze({ ...approval }),
        ),
      ),
    });
    const before = JSON.stringify(frozenInput);
    evaluateLucaLinkRevocationPropagation(frozenInput);
    expect(JSON.stringify(frozenInput)).toBe(before);
  });

  it("creates safe Operation Center counts without claiming execution", () => {
    const result = evaluate();
    expect(createRevocationOperationSummary(result)).toContain(
      `${result.affectedLanes.length} ownership lane(s) require invalidation`,
    );
    expect(result.operationCenterSummary).toContain(
      "No runtime action was executed.",
    );
  });

  it("creates a safe revoked Device Center state and summary", () => {
    const result = evaluate();
    expect(result.deviceCenterState).toMatchObject({
      connectionState: "revoked",
      label: "Revoked",
      activeOwnershipInvalid: true,
      runtimeActionExecuted: false,
    });
    expect(createRevocationDeviceCenterSummary(result)).toContain(
      "all listed adapter actions are dry-run guidance only",
    );
  });

  it("classifies approvals involving the revoked host as stale", () => {
    expect(evaluate().staleApprovals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ disposition: "revoked" }),
        expect.objectContaining({ disposition: "cancelled" }),
      ]),
    );
  });
});

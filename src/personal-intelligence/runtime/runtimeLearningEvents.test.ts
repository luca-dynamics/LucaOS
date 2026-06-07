import { describe, expect, it } from "vitest";
import {
  convertLearningEventToPersistenceProposalPreview,
  createLearningEventFromDryRunResult,
  createLearningEventFromFailedAction,
  createLearningEventFromUserFeedback,
} from "./runtimeLearningEvents";

const now = () => new Date("2026-06-07T12:00:00.000Z");

describe("runtimeLearningEvents", () => {
  it("creates a dry-run learning event without persistence", () => {
    const result = createLearningEventFromDryRunResult({
      eventId: "learning:dry-run",
      resultSummary: "The governed proposal passed dry-run validation.",
      succeeded: true,
      proposalId: "proposal:test",
      source: "unit-test",
      privacyZone: "project",
      confidence: 0.9,
      relatedTraceId: "trace:test",
      now,
    });
    expect(result.blockers).toEqual([]);
    expect(result.event.verificationStatus).toBe("verified");
    expect(result.event.relatedTraceId).toBe("trace:test");
    expect(result.event.persisted).toBe(false);
    expect(result.event.writePerformed).toBe(false);
  });

  it("records an externally reported failed action without retrying it", () => {
    const result = createLearningEventFromFailedAction({
      eventId: "learning:failed-action",
      actionSummary: "An external operation reported failure.",
      failureSummary: "Verification did not match the expected outcome.",
      source: "unit-test",
      privacyZone: "project",
      confidence: 0.8,
      now,
    });
    expect(result.event.outcome).toBe("failure");
    expect(result.event.verificationStatus).toBe("failed");
    expect(result.event.writePerformed).toBe(false);
  });

  it("creates a proposal preview that is neither approved nor written", () => {
    const event = createLearningEventFromUserFeedback({
      eventId: "learning:feedback",
      feedback: "User prefers concise project updates with explicit decisions and next steps.",
      source: "unit-test",
      privacyZone: "project",
      confidence: 0.98,
      now,
    }).event;
    const preview = convertLearningEventToPersistenceProposalPreview(event, {
      proposalId: "proposal:learning-feedback",
      now,
    });

    expect(preview.proposal.status).toBe("review_required");
    expect(preview.proposal.approvalMetadata).toBeUndefined();
    expect(preview.proposal.writePerformed).toBe(false);
    expect(preview.approved).toBe(false);
    expect(preview.writePerformed).toBe(false);
  });

  it("blocks unsafe and sensitive learning content", () => {
    const unsafe = createLearningEventFromUserFeedback({
      eventId: "learning:unsafe",
      feedback: "Store password=not-allowed in the learning record.",
      source: "unit-test",
      privacyZone: "credential",
      confidence: 0.2,
      now,
    });
    expect(unsafe.event.proposalReady).toBe(false);
    expect(unsafe.blockers.join(" ")).toMatch(/Credential or secret|requires explicit approval/);
  });
});

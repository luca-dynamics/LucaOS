import { describe, expect, it } from "vitest";
import type { LearningLogEntry } from "../learning/learningTypes";
import type { MemoryItem } from "../memory/memoryTypes";
import {
  cancelPersistenceProposal,
  createLearningPersistenceProposal,
  createMemoryPersistenceProposal,
  markPersistenceProposalApprovedForFutureAdapter,
  rejectPersistenceProposal,
  validatePersistenceProposal,
} from "./index";
import * as personalIntelligence from "../index";

const timestamp = "2026-06-06T12:00:00.000Z";
const memoryItem: MemoryItem = {
  id: "memory-1",
  kind: "project",
  title: "Release preference",
  content: "Use a review checklist.",
  source: "preview-test",
  confidence: 0.9,
  privacyZone: "project",
  tags: ["release"],
  createdAt: timestamp,
  updatedAt: timestamp,
};
const learningEvent: LearningLogEntry = {
  eventId: "learning-1",
  timestamp,
  inputSummary: "A release was reviewed.",
  actionTaken: "Applied the checklist.",
  outcome: "success",
  verificationStatus: "verified",
  privacyZone: "private",
  source: "preview-test",
  confidence: 0.8,
};
const now = () => new Date(timestamp);

function memoryProposal() {
  return createMemoryPersistenceProposal(memoryItem, {
    proposalId: "proposal-memory-1",
    proposedPath: "memory/release-preference.json",
    now,
  });
}

describe("persistence proposal creation and transitions", () => {
  it("creates memory and learning proposals without performing writes", () => {
    const memory = memoryProposal();
    const learning = createLearningPersistenceProposal(learningEvent, {
      proposalId: "proposal-learning-1",
      now,
    });

    expect(memory.writePerformed).toBe(false);
    expect(learning.writePerformed).toBe(false);
    expect(memory.status).toBe("review_required");
    expect(learning.status).toBe("review_required");
    expect(validatePersistenceProposal(memory).valid).toBe(true);
  });

  it("approval only returns approved_for_future_adapter proposal state", () => {
    const original = memoryProposal();
    const snapshot = structuredClone(original);
    const approved = markPersistenceProposalApprovedForFutureAdapter(original, {
      approvedBy: "user",
      approvedAt: timestamp,
      explicitUserApproval: true,
      approvalNote: "Approved for future adapter review only.",
    });

    expect(approved.status).toBe("approved_for_future_adapter");
    expect(approved.writePerformed).toBe(false);
    expect(approved.memoryItem).toEqual(original.memoryItem);
    expect(original).toEqual(snapshot);
  });

  it("reject and cancel are pure transitions that keep writePerformed false", () => {
    const original = memoryProposal();
    const rejected = rejectPersistenceProposal(
      original,
      "User rejected the proposal.",
    );
    const cancelled = cancelPersistenceProposal(
      original,
      "Preview was superseded.",
    );

    expect(rejected.status).toBe("rejected");
    expect(cancelled.status).toBe("cancelled");
    expect(rejected.writePerformed).toBe(false);
    expect(cancelled.writePerformed).toBe(false);
    expect(original.status).toBe("review_required");
  });

  it("exports persistence helpers through the Personal Intelligence barrel", () => {
    expect(personalIntelligence.createMemoryPersistenceProposal).toBe(
      createMemoryPersistenceProposal,
    );
    expect(personalIntelligence.summarizePersistenceReadiness).toBeTypeOf(
      "function",
    );
  });
});

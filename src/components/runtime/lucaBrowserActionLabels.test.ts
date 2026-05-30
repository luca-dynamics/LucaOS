import { describe, expect, it } from "vitest";
import {
  LUCA_BROWSER_ACTION_NO_EXECUTION_TEXT,
  getLucaBrowserActionKindLabel,
  getLucaBrowserActionNextAction,
  getLucaBrowserActionNoExecutionText,
  getLucaBrowserActionStatusLabel,
  getLucaBrowserActionSafeguardLabels,
} from "./lucaBrowserActionLabels";
import type { LucaBrowserActionRequest } from "../../types/lucaBrowserActions";

function makeRequest(overrides: Partial<LucaBrowserActionRequest> = {}): LucaBrowserActionRequest {
  return {
    actionRequestId: "a1",
    shellSessionId: "s1",
    kind: "propose_click",
    title: "Proposed click",
    summary: "queued",
    status: "waiting_user_confirmation",
    riskLevel: "elevated",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    policyDecision: { allowedForExecution: false } as any,
    provenanceIds: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("lucaBrowserActionLabels", () => {
  it("no-execution text says queued only", () => {
    expect(getLucaBrowserActionNoExecutionText()).toBe(LUCA_BROWSER_ACTION_NO_EXECUTION_TEXT);
    expect(getLucaBrowserActionNoExecutionText().toLowerCase()).toContain("queued only");
  });

  it("labels blocked kinds and statuses clearly", () => {
    expect(getLucaBrowserActionKindLabel("login")).toContain("blocked");
    expect(getLucaBrowserActionKindLabel("propose_click")).toContain("proposed");
    expect(getLucaBrowserActionStatusLabel("confirmed_for_future_execution")).toBe("Confirmed for future execution");
  });

  it("blocked actions surface a clear reason in next-action copy", () => {
    const blocked = makeRequest({ status: "blocked", blockedBy: ["credential_like_text"] });
    expect(getLucaBrowserActionNextAction(blocked)).toContain("credential_like_text");
  });

  it("safeguard labels include execution disabled and no DOM read", () => {
    const labels = getLucaBrowserActionSafeguardLabels();
    expect(labels).toContain("Execution disabled");
    expect(labels).toContain("No DOM read");
    expect(labels).toContain("Human confirmation required");
  });
});

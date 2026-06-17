import { describe, expect, it } from "vitest";
import {
  createPresenceApprovalDecision,
  createPresenceApprovalPrompt,
  createPresenceApprovalRequest,
  getPresenceApprovalId,
  getPresenceApprovalText,
  isPresenceApprovalPending,
  toLegacyApprovalRequest,
} from "./presenceApprovalRoute";

describe("Presence approval route helpers", () => {
  it("normalizes a raw approvalRequest payload into typed prompt and request shapes", () => {
    const approvalRequest = {
      id: "legacy-id",
      requestId: "request-id",
      title: "Approve tool",
      toolName: "calendar",
      args: { date: "2026-06-16" },
      status: "pending",
    };

    expect(createPresenceApprovalPrompt(approvalRequest)).toEqual(approvalRequest);
    expect(createPresenceApprovalRequest(approvalRequest)).toEqual(approvalRequest);
  });

  it("preserves unknown legacy fields without mutating the input", () => {
    const approvalRequest = {
      requestId: "approval-1",
      summary: "Allow action",
      unknownLegacyField: { preserve: true },
    };
    const before = JSON.stringify(approvalRequest);

    const prompt = createPresenceApprovalPrompt(approvalRequest);

    expect(prompt).toEqual(approvalRequest);
    expect(prompt).not.toBe(approvalRequest);
    expect(JSON.stringify(approvalRequest)).toBe(before);
  });

  it("tolerates missing optional fields and non-object payloads", () => {
    expect(createPresenceApprovalPrompt({})).toEqual({});
    expect(createPresenceApprovalRequest({ id: "approval-1" })).toEqual({ id: "approval-1" });
    expect(createPresenceApprovalDecision(null)).toBeNull();
    expect(createPresenceApprovalPrompt(undefined)).toBeNull();
  });

  it("preserves existing legacy approvalRequest shape when converting back", () => {
    const legacyPayload = {
      approvalRequest: {
        id: "legacy-id",
        toolName: "terminal",
        args: { command: "pwd" },
        legacyOnly: true,
      },
    };
    const approval = { requestId: "typed-id", summary: "Run command" };

    expect(toLegacyApprovalRequest(approval, legacyPayload)).toEqual({
      id: "legacy-id",
      requestId: "typed-id",
      toolName: "terminal",
      args: { command: "pwd" },
      summary: "Run command",
      legacyOnly: true,
    });
  });

  it("detects pending status", () => {
    expect(isPresenceApprovalPending({ id: "approval-1" })).toBe(true);
    expect(isPresenceApprovalPending({ id: "approval-1", status: "pending" })).toBe(true);
    expect(isPresenceApprovalPending({ id: "approval-1", status: "approved" })).toBe(false);
    expect(isPresenceApprovalPending(null)).toBe(false);
  });

  it("extracts approval ids from id or requestId", () => {
    expect(getPresenceApprovalId({ id: "approval-id", requestId: "request-id" })).toBe("approval-id");
    expect(getPresenceApprovalId({ requestId: "request-id" })).toBe("request-id");
    expect(getPresenceApprovalId({})).toBeNull();
  });

  it("extracts approval text from title, summary, or description", () => {
    expect(getPresenceApprovalText({ title: "Title", summary: "Summary" })).toBe("Title");
    expect(getPresenceApprovalText({ summary: "Summary", description: "Description" })).toBe("Summary");
    expect(getPresenceApprovalText({ description: "Description" })).toBe("Description");
    expect(getPresenceApprovalText({})).toBeNull();
  });

  it("keeps normalized approvals JSON serializable", () => {
    const prompt = createPresenceApprovalPrompt({
      id: "approval-id",
      permissions: ["calendar.write"],
      metadata: { source: "test" },
    });

    expect(JSON.parse(JSON.stringify(prompt))).toEqual(prompt);
  });
});

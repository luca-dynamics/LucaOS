import { describe, it, expect } from "vitest";
import {
  getSessionContinuityLabel, getSessionContinuityTone, getSessionNextAction,
  getReminderDeliveryLabel, getReminderDeliveryTone, getReminderNextAction,
  getPlanContinuityLabel, getPlanContinuityTone, getPlanNextAction,
  getCheckpointContinuityLabel, getCheckpointContinuityTone, getCheckpointNextAction,
  getContinuityNoExecutionText, getContinuitySummaryLine, compactTimestamp,
  getContinuityToneColor, getContinuityToneBorder, getContinuityToneBg,
} from "./continuityLabels";

describe("continuityLabels", () => {
  // --- Session ---
  describe("getSessionContinuityLabel", () => {
    it("active → Active", () => expect(getSessionContinuityLabel("active")).toBe("Active"));
    it("resumable → Can resume", () => expect(getSessionContinuityLabel("resumable")).toBe("Can resume"));
    it("paused → Paused", () => expect(getSessionContinuityLabel("paused")).toBe("Paused"));
    it("completed → Completed", () => expect(getSessionContinuityLabel("completed")).toBe("Completed"));
    it("archived → Archived", () => expect(getSessionContinuityLabel("archived")).toBe("Archived"));
    it("quarantined → Needs review", () => expect(getSessionContinuityLabel("quarantined")).toBe("Needs review"));
  });

  describe("getSessionContinuityTone", () => {
    it("active → good", () => expect(getSessionContinuityTone("active")).toBe("good"));
    it("resumable → info", () => expect(getSessionContinuityTone("resumable")).toBe("info"));
    it("quarantined → danger", () => expect(getSessionContinuityTone("quarantined")).toBe("danger"));
    it("archived → neutral", () => expect(getSessionContinuityTone("archived")).toBe("neutral"));
  });

  describe("getSessionNextAction", () => {
    it("resumable + safe → safe to continue copy", () => {
      expect(getSessionNextAction("resumable", true)).toContain("Safe to continue");
    });
    it("resumable + not safe → review before resume", () => {
      expect(getSessionNextAction("resumable", false)).toContain("Review before resume");
    });
    it("quarantined → needs review", () => {
      expect(getSessionNextAction("quarantined", false)).toContain("Needs review");
    });
    it("completed → no action needed", () => {
      expect(getSessionNextAction("completed", false)).toBe("No action needed");
    });
  });

  // --- Reminder ---
  describe("getReminderDeliveryLabel", () => {
    it("pending → Pending", () => expect(getReminderDeliveryLabel("pending")).toBe("Pending"));
    it("delivered → Delivered", () => expect(getReminderDeliveryLabel("delivered")).toBe("Delivered"));
    it("blocked → Blocked", () => expect(getReminderDeliveryLabel("blocked")).toBe("Blocked"));
    it("skipped → Skipped", () => expect(getReminderDeliveryLabel("skipped")).toBe("Skipped"));
    it("failed → Failed", () => expect(getReminderDeliveryLabel("failed")).toBe("Failed"));
  });

  describe("getReminderDeliveryTone", () => {
    it("pending → warn", () => expect(getReminderDeliveryTone("pending")).toBe("warn"));
    it("delivered → good", () => expect(getReminderDeliveryTone("delivered")).toBe("good"));
    it("blocked → danger", () => expect(getReminderDeliveryTone("blocked")).toBe("danger"));
  });

  describe("getReminderNextAction", () => {
    it("delivered → review in inbox", () => {
      expect(getReminderNextAction("delivered")).toContain("inbox");
    });
    it("blocked → blocked for safety", () => {
      expect(getReminderNextAction("blocked")).toContain("Blocked");
    });
  });

  // --- Plan ---
  describe("getPlanContinuityLabel", () => {
    it("proposed → Plan proposed", () => expect(getPlanContinuityLabel("proposed")).toBe("Plan proposed"));
    it("active → Active plan", () => expect(getPlanContinuityLabel("active")).toBe("Active plan"));
    it("waiting_approval → Waiting for approval", () => expect(getPlanContinuityLabel("waiting_approval")).toBe("Waiting for approval"));
    it("blocked → Blocked for safety", () => expect(getPlanContinuityLabel("blocked")).toBe("Blocked for safety"));
    it("completed → Completed", () => expect(getPlanContinuityLabel("completed")).toBe("Completed"));
    it("archived → Archived", () => expect(getPlanContinuityLabel("archived")).toBe("Archived"));
    it("rejected → Rejected", () => expect(getPlanContinuityLabel("rejected")).toBe("Rejected"));
  });

  describe("getPlanContinuityTone", () => {
    it("active → good", () => expect(getPlanContinuityTone("active")).toBe("good"));
    it("blocked → danger", () => expect(getPlanContinuityTone("blocked")).toBe("danger"));
    it("waiting_approval → warn", () => expect(getPlanContinuityTone("waiting_approval")).toBe("warn"));
  });

  describe("getPlanNextAction", () => {
    it("proposed → review and activate", () => {
      expect(getPlanNextAction("proposed")).toContain("Review");
    });
    it("blocked → blocked for safety", () => {
      expect(getPlanNextAction("blocked")).toContain("Blocked");
    });
  });

  // --- Checkpoint ---
  describe("getCheckpointContinuityLabel", () => {
    it("proposed → Review checkpoint", () => expect(getCheckpointContinuityLabel("proposed")).toBe("Review checkpoint"));
    it("approved → Approved", () => expect(getCheckpointContinuityLabel("approved")).toBe("Approved"));
    it("rejected → Rejected", () => expect(getCheckpointContinuityLabel("rejected")).toBe("Rejected"));
    it("blocked → Blocked for safety", () => expect(getCheckpointContinuityLabel("blocked")).toBe("Blocked for safety"));
    it("completed → Completed", () => expect(getCheckpointContinuityLabel("completed")).toBe("Completed"));
    it("archived → Archived", () => expect(getCheckpointContinuityLabel("archived")).toBe("Archived"));
  });

  describe("getCheckpointContinuityTone", () => {
    it("proposed → warn", () => expect(getCheckpointContinuityTone("proposed")).toBe("warn"));
    it("approved → good", () => expect(getCheckpointContinuityTone("approved")).toBe("good"));
    it("blocked → danger", () => expect(getCheckpointContinuityTone("blocked")).toBe("danger"));
  });

  describe("getCheckpointNextAction", () => {
    it("proposed → review and approve or reject", () => {
      expect(getCheckpointNextAction("proposed")).toContain("approve or reject");
    });
    it("blocked → blocked for safety", () => {
      expect(getCheckpointNextAction("blocked")).toContain("Blocked");
    });
  });

  // --- No execution text ---
  describe("getContinuityNoExecutionText", () => {
    it("session → no execution", () => {
      expect(getContinuityNoExecutionText("session")).toContain("no execution");
    });
    it("reminder → no execution", () => {
      expect(getContinuityNoExecutionText("reminder")).toContain("no execution");
    });
    it("plan → no execution", () => {
      expect(getContinuityNoExecutionText("plan")).toContain("no execution");
    });
    it("checkpoint → no execution", () => {
      expect(getContinuityNoExecutionText("checkpoint")).toContain("no execution");
    });
    it("inbox → No execution", () => {
      expect(getContinuityNoExecutionText("inbox")).toContain("No execution");
    });
  });

  // --- Summary line ---
  describe("getContinuitySummaryLine", () => {
    it("all zeros → no attention needed", () => {
      expect(getContinuitySummaryLine({ resumableSessions: 0, activePlans: 0, pendingCheckpoints: 0, pendingReminders: 0, pendingApprovals: 0, blockedItems: 0 })).toBe("No continuity items need attention");
    });
    it("resumable sessions → shows sessions can resume", () => {
      expect(getContinuitySummaryLine({ resumableSessions: 2, activePlans: 0, pendingCheckpoints: 0, pendingReminders: 0, pendingApprovals: 0, blockedItems: 0 })).toContain("2 sessions can resume");
    });
    it("single session → singular", () => {
      expect(getContinuitySummaryLine({ resumableSessions: 1, activePlans: 0, pendingCheckpoints: 0, pendingReminders: 0, pendingApprovals: 0, blockedItems: 0 })).toContain("1 session can resume");
    });
    it("multiple items → joined", () => {
      const result = getContinuitySummaryLine({ resumableSessions: 1, activePlans: 1, pendingCheckpoints: 0, pendingReminders: 0, pendingApprovals: 3, blockedItems: 0 });
      expect(result).toContain("1 session can resume");
      expect(result).toContain("1 active plan");
      expect(result).toContain("3 approvals need review");
    });
  });

  // --- Tone styling ---
  describe("tone CSS helpers", () => {
    it("good tone returns emerald color", () => {
      expect(getContinuityToneColor("good")).toContain("emerald");
    });
    it("danger tone returns red color", () => {
      expect(getContinuityToneColor("danger")).toContain("red");
    });
    it("warn tone returns amber border", () => {
      expect(getContinuityToneBorder("warn")).toContain("amber");
    });
    it("info tone returns sky bg", () => {
      expect(getContinuityToneBg("info")).toContain("sky");
    });
  });

  // --- Compact timestamp ---
  describe("compactTimestamp", () => {
    it("returns empty for undefined", () => {
      expect(compactTimestamp(undefined)).toBe("");
    });
    it("returns formatted string for valid ISO", () => {
      expect(compactTimestamp("2025-01-01T00:00:00Z")).toBeTruthy();
    });
  });
});

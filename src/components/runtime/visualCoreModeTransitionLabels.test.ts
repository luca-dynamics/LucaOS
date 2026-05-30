import { describe, expect, it } from "vitest";
import {
  getVisualCoreModeTransitionBoundaryLabels,
  getVisualCoreModeTransitionSafetyFlagSummary,
  getVisualCoreModeTransitionSourceLabel,
  getVisualCoreModeTransitionStatusLabel,
  getVisualCoreModeTransitionStatusTone,
  isVisualCoreModeTransitionBlocked,
} from "./visualCoreModeTransitionLabels";
import type {
  VisualCoreModeTransitionRecord,
  VisualCoreModeTransitionStatus,
} from "../../types/visualCoreModeTransitions";

function makeRecord(
  overrides: Partial<VisualCoreModeTransitionRecord> = {},
): VisualCoreModeTransitionRecord {
  return {
    transitionId: "visual-transition:test:abc123",
    fromMode: "IDLE",
    toMode: "DATA",
    status: "allowed",
    source: "local_ui",
    userSafeReason: "Transition to DATA allowed — safe display mode.",
    timestamp: "2026-01-01T00:00:00.000Z",
    governanceApplied: true,
    transitionOnly: true,
    executionChanged: false,
    captureEnabled: false,
    automationEnabled: false,
    externalActionEnabled: false,
    fileAccessEnabled: false,
    messagingEnabled: false,
    wirelessControlEnabled: false,
    walletPaymentEnabled: false,
    ...overrides,
  };
}

const ALL_STATUSES: VisualCoreModeTransitionStatus[] = [
  "allowed",
  "allowed_governed_browser",
  "blocked_sensitive",
  "blocked_unknown",
  "blocked_browser_no_session",
];

describe("visualCoreModeTransitionLabels", () => {
  it("maps every status to a non-empty label and a tone", () => {
    for (const status of ALL_STATUSES) {
      expect(getVisualCoreModeTransitionStatusLabel(status)).toBeTruthy();
      expect(getVisualCoreModeTransitionStatusTone(status)).toBeTruthy();
    }
  });

  it("marks blocked statuses as blocked and allowed statuses as not blocked", () => {
    expect(isVisualCoreModeTransitionBlocked("allowed")).toBe(false);
    expect(isVisualCoreModeTransitionBlocked("allowed_governed_browser")).toBe(false);
    expect(isVisualCoreModeTransitionBlocked("blocked_sensitive")).toBe(true);
    expect(isVisualCoreModeTransitionBlocked("blocked_unknown")).toBe(true);
    expect(isVisualCoreModeTransitionBlocked("blocked_browser_no_session")).toBe(true);
  });

  it("uses danger tone for hard blocks and warn for missing browser session", () => {
    expect(getVisualCoreModeTransitionStatusTone("blocked_sensitive")).toBe("danger");
    expect(getVisualCoreModeTransitionStatusTone("blocked_unknown")).toBe("danger");
    expect(getVisualCoreModeTransitionStatusTone("blocked_browser_no_session")).toBe("warn");
    expect(getVisualCoreModeTransitionStatusTone("allowed")).toBe("good");
    expect(getVisualCoreModeTransitionStatusTone("allowed_governed_browser")).toBe("info");
  });

  it("maps sources to readable labels", () => {
    expect(getVisualCoreModeTransitionSourceLabel("local_ui")).toBe("Local UI");
    expect(getVisualCoreModeTransitionSourceLabel("remote_command")).toBe("Remote command");
    expect(getVisualCoreModeTransitionSourceLabel("system")).toBe("System");
  });

  it("exposes fixed boundary labels asserting no automation/execution", () => {
    const labels = getVisualCoreModeTransitionBoundaryLabels();
    expect(labels).toContain("Mode transition audit only");
    expect(labels).toContain("No transition policy change");
    expect(labels).toContain("No approve/run/execute");
    expect(labels).toContain("No automation");
    expect(labels).toContain("No screenshot/OCR/vision");
  });

  it("summarizes safety flags as all-false for an allowed record", () => {
    const summary = getVisualCoreModeTransitionSafetyFlagSummary(makeRecord());
    for (const chip of summary) {
      expect(chip.endsWith("false")).toBe(true);
    }
    expect(summary).toContain("execution changed: false");
    expect(summary).toContain("automation: false");
    expect(summary).toContain("wallet/payment: false");
  });

  it("keeps all danger flags false even for blocked sensitive transitions", () => {
    const record = makeRecord({
      fromMode: "DATA",
      toMode: "WIRELESS",
      status: "blocked_sensitive",
      source: "remote_command",
      userSafeReason: "Transition to WIRELESS blocked — sensitive mode requires dedicated governance policy.",
      blockedBy: ["sensitive_mode:wireless"],
    });
    expect(isVisualCoreModeTransitionBlocked(record.status)).toBe(true);
    const summary = getVisualCoreModeTransitionSafetyFlagSummary(record);
    for (const chip of summary) {
      expect(chip.endsWith("false")).toBe(true);
    }
    expect(record.executionChanged).toBe(false);
    expect(record.automationEnabled).toBe(false);
    expect(record.captureEnabled).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import {
  getSkillCapabilityLabel,
  getSkillRequestLabel,
  getSkillRequestNextAction,
  getSkillRequestNoExecutionText,
  getSkillRequestTone,
  getSkillRequestTypeLabel,
  getSkillRiskLabel,
  getSkillRiskTone,
  getSkillSummaryLine,
} from "./skillGovernanceLabels";

describe("skillGovernanceLabels", () => {
  it("maps request statuses to labels and tones", () => {
    expect(getSkillRequestLabel("proposed")).toBe("Skill proposed");
    expect(getSkillRequestTone("proposed")).toBe("info");
    expect(getSkillRequestLabel("approval_required")).toBe("Needs approval");
    expect(getSkillRequestTone("approval_required")).toBe("warn");
    expect(getSkillRequestLabel("approved_waiting_install")).toContain("secure install bridge");
    expect(getSkillRequestTone("approved_waiting_install")).toBe("info");
    expect(getSkillRequestLabel("approved_waiting_execution")).toContain("secure execution bridge");
    expect(getSkillRequestTone("approved_waiting_execution")).toBe("info");
    expect(getSkillRequestLabel("rejected")).toBe("Rejected");
    expect(getSkillRequestLabel("blocked")).toBe("Blocked for safety");
    expect(getSkillRequestTone("blocked")).toBe("danger");
    expect(getSkillRequestLabel("expired")).toBe("Expired");
    expect(getSkillRequestLabel("revoked")).toBe("Revoked");
  });

  it("explains approved waiting install/execution as future secure bridges", () => {
    expect(getSkillRequestNextAction("approved_waiting_install", "install")).toContain("future secure install bridge");
    expect(getSkillRequestNextAction("approved_waiting_execution", "run")).toContain("future secure execution bridge");
  });

  it("maps risk levels to labels and tones", () => {
    expect(getSkillRiskLabel("low")).toBe("Low risk");
    expect(getSkillRiskTone("low")).toBe("good");
    expect(getSkillRiskLabel("medium")).toBe("Medium risk");
    expect(getSkillRiskTone("medium")).toBe("warn");
    expect(getSkillRiskLabel("high")).toBe("High risk");
    expect(getSkillRiskTone("high")).toBe("danger");
    expect(getSkillRiskLabel("critical")).toBe("Critical risk");
    expect(getSkillRiskTone("critical")).toBe("danger");
  });

  it("renders requested capabilities as human-readable labels", () => {
    expect(getSkillCapabilityLabel("read_calendar.events")).toBe("Read calendar events");
    expect(getSkillCapabilityLabel("risky_capability:network.fetch")).toBe("Network fetch");
    expect(getSkillCapabilityLabel("")).toBe("Unknown capability");
  });

  it("keeps no-execution copy explicit", () => {
    const copy = getSkillRequestNoExecutionText();
    expect(copy).toContain("no skill installed or run");
  });

  it("maps request types to labels", () => {
    expect(getSkillRequestTypeLabel("install")).toBe("Install skill");
    expect(getSkillRequestTypeLabel("enable")).toBe("Enable skill");
    expect(getSkillRequestTypeLabel("run")).toBe("Run skill");
    expect(getSkillRequestTypeLabel("update")).toBe("Update skill");
    expect(getSkillRequestTypeLabel("remove")).toBe("Remove skill");
  });

  it("summarizes zero, pending, blocked, and approved counts", () => {
    expect(getSkillSummaryLine({ registeredSkills: 0, pendingRequests: 0, approvedWaitingRequests: 0, blockedRequests: 0 })).toBe("No skill requests need attention");
    expect(getSkillSummaryLine({ registeredSkills: 0, pendingRequests: 2, approvedWaitingRequests: 0, blockedRequests: 0 })).toContain("2 requests need review");
    expect(getSkillSummaryLine({ registeredSkills: 0, pendingRequests: 0, approvedWaitingRequests: 0, blockedRequests: 1 })).toContain("1 blocked for safety");
    expect(getSkillSummaryLine({ registeredSkills: 3, pendingRequests: 0, approvedWaitingRequests: 1, blockedRequests: 0 })).toContain("1 approved waiting secure bridge");
  });
});

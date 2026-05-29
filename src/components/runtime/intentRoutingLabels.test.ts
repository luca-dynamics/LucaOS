// intentRoutingLabels tests — PR #125: Plan & Route UX Polish
import { describe, it, expect } from "vitest";
import {
  getRouteLabel,
  getRouteTone,
  getRouteHintText,
  getRouteNextAction,
  getRouteNoExecutionText,
  shouldAppendRouteHint,
} from "./intentRoutingLabels";
describe("getRouteHintText", () => {
  it("returns empty string for fast_response", () => {
    expect(getRouteHintText("fast_response")).toBe("");
  });

  it("returns plan copy for runtime_plan", () => {
    const text = getRouteHintText("runtime_plan");
    expect(text).toContain("Plan created");
    expect(text).toContain("ACTIVITY");
    expect(text).toContain("No action has been executed");
  });

  it("returns memory copy for memory_proposal", () => {
    const text = getRouteHintText("memory_proposal");
    expect(text).toContain("Memory proposal created");
    expect(text).toContain("not been saved yet");
  });

  it("returns approval copy for governed_action_request", () => {
    const text = getRouteHintText("governed_action_request");
    expect(text).toContain("approval");
  });

  it("returns approval + Run once copy for safe_execution_request", () => {
    const text = getRouteHintText("safe_execution_request");
    expect(text).toContain("approval");
    expect(text).toContain("Run once");
  });

  it("returns state-only copy for skill_request", () => {
    const text = getRouteHintText("skill_request");
    expect(text).toContain("state-only");
    expect(text).toContain("will not install or run");
  });

  it("returns blocked copy for blocked_risky_action", () => {
    const text = getRouteHintText("blocked_risky_action");
    expect(text).toContain("Blocked");
    expect(text).toContain("did not execute");
  });

  it("returns clarification copy for ask_user", () => {
    const text = getRouteHintText("ask_user");
    expect(text).toContain("Clarification");
  });
});

describe("getRouteNextAction", () => {
  it("returns empty for fast_response", () => {
    expect(getRouteNextAction("fast_response")).toBe("");
  });

  it("directs user to ACTIVITY for runtime_plan", () => {
    expect(getRouteNextAction("runtime_plan")).toContain("ACTIVITY");
  });

  it("directs user to approve for governed_action_request", () => {
    expect(getRouteNextAction("governed_action_request")).toContain("Approve");
  });

  it("says no action required for blocked", () => {
    expect(getRouteNextAction("blocked_risky_action")).toContain("No action required");
  });
});

describe("getRouteNoExecutionText", () => {
  it("blocked route says no execution", () => {
    expect(getRouteNoExecutionText("blocked_risky_action")).toContain("Blocked");
    expect(getRouteNoExecutionText("blocked_risky_action")).toContain("no execution");
  });

  it("safe execution route says needs approval", () => {
    expect(getRouteNoExecutionText("safe_execution_request")).toContain("Needs approval");
  });

  it("memory route says not saved yet", () => {
    expect(getRouteNoExecutionText("memory_proposal")).toContain("Not saved");
  });

  it("skill route says state-only", () => {
    expect(getRouteNoExecutionText("skill_request")).toContain("State-only");
  });
});

describe("getRouteLabel", () => {
  it("returns human-readable labels", () => {
    expect(getRouteLabel("runtime_plan")).toBe("Runtime plan");
    expect(getRouteLabel("blocked_risky_action")).toBe("Blocked");
    expect(getRouteLabel("ask_user")).toBe("Clarification needed");
  });
});

describe("getRouteTone", () => {
  it("returns correct tones", () => {
    expect(getRouteTone("fast_response")).toBe("neutral");
    expect(getRouteTone("runtime_plan")).toBe("plan");
    expect(getRouteTone("memory_proposal")).toBe("memory");
    expect(getRouteTone("blocked_risky_action")).toBe("blocked");
    expect(getRouteTone("ask_user")).toBe("attention");
    expect(getRouteTone("skill_request")).toBe("skill");
    expect(getRouteTone("governed_action_request")).toBe("approval");
  });
});

describe("shouldAppendRouteHint (dedupe)", () => {
  it("allows hint when no previous hints exist", () => {
    expect(shouldAppendRouteHint([], "Plan created.")).toBe(true);
  });

  it("skips empty hint text", () => {
    expect(shouldAppendRouteHint([], "")).toBe(false);
  });

  it("skips duplicate same hint within short window", () => {
    const now = Date.now();
    const prev = [
      { text: "Plan created.", isRouteHint: true, timestamp: now - 1_000 },
    ];
    expect(shouldAppendRouteHint(prev, "Plan created.")).toBe(false);
  });

  it("allows different route hint text", () => {
    const now = Date.now();
    const prev = [
      { text: "Plan created.", isRouteHint: true, timestamp: now - 1_000 },
    ];
    expect(shouldAppendRouteHint(prev, "Memory proposal created.")).toBe(true);
  });

  it("allows same hint after dedupe window expires", () => {
    const now = Date.now();
    const prev = [
      { text: "Plan created.", isRouteHint: true, timestamp: now - 10_000 },
    ];
    expect(shouldAppendRouteHint(prev, "Plan created.")).toBe(true);
  });

  it("ignores non-route-hint messages in dedupe check", () => {
    const now = Date.now();
    const prev = [
      { text: "Plan created.", isRouteHint: false, timestamp: now - 500 },
    ];
    expect(shouldAppendRouteHint(prev, "Plan created.")).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { ComputerUseActionPlanner } from "./ComputerUseActionPlanner";
import { ComputerUseFocusContext } from "./types";

const baseContext: ComputerUseFocusContext = {
  executionMode: "sandbox",
  riskLevel: "safe",
  trustTier: "verified",
  requiresGuardApproval: false,
  prefersSandbox: true,
  focusSignals: [],
  metadata: {
    contextOnly: true,
    actionsEnabled: false,
    systemApisEnabled: false,
  },
};

describe("ComputerUseActionPlanner", () => {
  it("no focus target returns observe plan", () => {
    const planner = new ComputerUseActionPlanner();
    const plan = planner.planFromFocusContext({ context: baseContext });

    expect(plan.actions).toHaveLength(1);
    expect(plan.actions[0].type).toBe("observe");
  });

  it("user-pointed target creates click candidate", () => {
    const planner = new ComputerUseActionPlanner();
    const plan = planner.planFromFocusContext({
      context: {
        ...baseContext,
        userPointedTarget: { description: "Click here" },
      },
    });

    expect(plan.actions.some((action) => action.type === "click")).toBe(true);
  });

  it("focused input with text payload creates type_text candidate", () => {
    const planner = new ComputerUseActionPlanner();
    const plan = planner.planFromFocusContext({
      context: {
        ...baseContext,
        focusedElement: { role: "textbox", label: "Search" },
      },
      textPayload: "hello",
    });

    const typeAction = plan.actions.find((action) => action.type === "type_text");
    expect(typeAction?.text).toBe("hello");
  });

  it("dangerous context + userPointedTarget creates click action with requiresGuardApproval true", () => {
    const planner = new ComputerUseActionPlanner();
    const plan = planner.planFromFocusContext({
      context: {
        ...baseContext,
        riskLevel: "dangerous",
        requiresGuardApproval: true,
        userPointedTarget: { description: "High-risk click" },
      },
    });

    const clickAction = plan.actions.find((action) => action.type === "click");
    expect(clickAction?.requiresGuardApproval).toBe(true);
  });

  it("dangerous context + focused input creates type_text action with requiresGuardApproval true", () => {
    const planner = new ComputerUseActionPlanner();
    const plan = planner.planFromFocusContext({
      context: {
        ...baseContext,
        riskLevel: "dangerous",
        requiresGuardApproval: true,
        focusedElement: { role: "input", label: "Password" },
      },
      textPayload: "secret",
    });

    const typeAction = plan.actions.find((action) => action.type === "type_text");
    expect(typeAction?.requiresGuardApproval).toBe(true);
  });

  it("dangerous plan requires guard approval", () => {
    const planner = new ComputerUseActionPlanner();
    const plan = planner.planFromFocusContext({
      context: {
        ...baseContext,
        riskLevel: "dangerous",
        requiresGuardApproval: true,
      },
    });

    expect(plan.requiresGuardApproval).toBe(true);
  });

  it("observe fallback remains requiresGuardApproval false", () => {
    const planner = new ComputerUseActionPlanner();
    const plan = planner.planFromFocusContext({
      context: {
        ...baseContext,
        riskLevel: "dangerous",
        requiresGuardApproval: true,
      },
    });

    expect(plan.actions[0].type).toBe("observe");
    expect(plan.actions[0].requiresGuardApproval).toBe(false);
  });

  it("untrusted plan prefers sandbox", () => {
    const planner = new ComputerUseActionPlanner();
    const plan = planner.planFromFocusContext({
      context: {
        ...baseContext,
        trustTier: "untrusted",
        prefersSandbox: true,
      },
    });

    expect(plan.prefersSandbox).toBe(true);
  });

  it("reset clears planner state", () => {
    const planner = new ComputerUseActionPlanner();
    planner.planFromFocusContext({ context: baseContext });

    expect(() => planner.reset()).not.toThrow();
  });

  it("no action execution happens", () => {
    const planner = new ComputerUseActionPlanner();
    const plan = planner.planFromFocusContext({ context: baseContext });

    expect(plan.metadata.planningOnly).toBe(true);
    expect(plan.metadata.executionEnabled).toBe(false);
    expect(plan.metadata.mouseKeyboardApisEnabled).toBe(false);
    expect(plan.metadata.systemApisEnabled).toBe(false);
  });
});

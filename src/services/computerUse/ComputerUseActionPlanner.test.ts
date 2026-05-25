import { describe, expect, it } from "vitest";
import { ComputerUseActionPlanner } from "./ComputerUseActionPlanner";
import { ComputerUseFocusContextBuilder } from "./ComputerUseFocusContext";

describe("ComputerUseActionPlanner", () => {
  it("no focus target returns observe plan", () => {
    const planner = new ComputerUseActionPlanner();
    const focusContext = new ComputerUseFocusContextBuilder().build();

    const result = planner.createPlan({ focusContext });

    expect(result.actions[0].type).toBe("observe");
  });

  it("user-pointed target creates click candidate", () => {
    const planner = new ComputerUseActionPlanner();
    const focusContext = new ComputerUseFocusContextBuilder()
      .withUserPointedTarget({ description: "Click this button" })
      .build();

    const result = planner.createPlan({ focusContext });

    expect(result.actions[0].type).toBe("click");
    expect(result.actions[0].target?.description).toBe("Click this button");
  });

  it("focused input with text payload creates type_text candidate", () => {
    const planner = new ComputerUseActionPlanner();
    const focusContext = new ComputerUseFocusContextBuilder()
      .withFocusedElement({ role: "textbox", label: "Search" })
      .build();

    const result = planner.createPlan({ focusContext, textPayload: "hello world" });

    expect(result.actions[0].type).toBe("type_text");
    expect(result.actions[0].text).toBe("hello world");
  });

  it("dangerous context + userPointedTarget creates click action with requiresGuardApproval: true", () => {
    const planner = new ComputerUseActionPlanner();
    const focusContext = new ComputerUseFocusContextBuilder({ riskLevel: "dangerous" })
      .withUserPointedTarget({ description: "Confirm wire" })
      .build();

    const result = planner.createPlan({ focusContext });

    expect(result.actions[0].type).toBe("click");
    expect(result.actions[0].requiresGuardApproval).toBe(true);
  });

  it("dangerous context + focused input creates type_text action with requiresGuardApproval: true", () => {
    const planner = new ComputerUseActionPlanner();
    const focusContext = new ComputerUseFocusContextBuilder({ riskLevel: "dangerous" })
      .withFocusedElement({ role: "textbox", label: "Amount" })
      .build();

    const result = planner.createPlan({ focusContext, textPayload: "1000" });

    expect(result.actions[0].type).toBe("type_text");
    expect(result.actions[0].requiresGuardApproval).toBe(true);
  });

  it("observe fallback remains requiresGuardApproval: false", () => {
    const planner = new ComputerUseActionPlanner();
    const focusContext = new ComputerUseFocusContextBuilder({ riskLevel: "dangerous" }).build();

    const result = planner.createPlan({ focusContext });

    expect(result.actions[0].type).toBe("observe");
    expect(result.actions[0].requiresGuardApproval).toBe(false);
  });

  it("dangerous plan requires guard approval", () => {
    const planner = new ComputerUseActionPlanner();
    const focusContext = new ComputerUseFocusContextBuilder({ riskLevel: "dangerous" })
      .withUserPointedTarget({ description: "Submit" })
      .build();

    const result = planner.createPlan({ focusContext });

    expect(result.requiresGuardApproval).toBe(true);
  });

  it("untrusted plan prefers sandbox", () => {
    const planner = new ComputerUseActionPlanner();
    const focusContext = new ComputerUseFocusContextBuilder({
      executionMode: "direct_host",
      trustTier: "untrusted",
    })
      .withUserPointedTarget({ description: "Open settings" })
      .build();

    const result = planner.createPlan({ focusContext });

    expect(result.prefersSandbox).toBe(true);
  });

  it("reset clears planner state", () => {
    const planner = new ComputerUseActionPlanner();
    const focusContext = new ComputerUseFocusContextBuilder()
      .withUserPointedTarget({ description: "Click" })
      .build();

    planner.createPlan({ focusContext });
    planner.reset();

    const result = planner.createPlan({ focusContext: new ComputerUseFocusContextBuilder().build() });

    expect(result.actions[0].type).toBe("observe");
  });

  it("no action execution happens", () => {
    const planner = new ComputerUseActionPlanner();
    const focusContext = new ComputerUseFocusContextBuilder()
      .withUserPointedTarget({ description: "Safe candidate" })
      .build();

    const result = planner.createPlan({ focusContext });

    expect(result.metadata.planningOnly).toBe(true);
    expect(result.metadata.actionsExecuted).toBe(false);
    expect(result.metadata.systemApisUsed).toBe(false);
  });
});

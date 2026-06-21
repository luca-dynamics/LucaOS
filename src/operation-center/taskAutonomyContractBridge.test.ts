import { describe, expect, it } from "vitest";
import { evaluateTaskPlanPermissions, getTaskAutonomyContractPreset } from "../autonomy/taskAutonomyContract";
import { createOperationCenterItemFromTaskAutonomyContract } from "./taskAutonomyContractBridge";
import appSource from "../../src/App.tsx?raw";
import bridgeSource from "./taskAutonomyContractBridge.ts?raw";
import contractSource from "../autonomy/taskAutonomyContract.ts?raw";

describe("task autonomy Operation Center bridge", () => {
  it("creates a read-only diagnostic item with execution disabled", () => {
    const contract = getTaskAutonomyContractPreset("strict_privacy");
    const evaluations = evaluateTaskPlanPermissions(contract, [
      { actionId: "cloud", label: "cloud", category: "cloud_data_transfer", riskLevel: "high", touchesCloud: true },
    ]);
    const item = createOperationCenterItemFromTaskAutonomyContract(contract, evaluations);
    expect(item.title).toBe("Task autonomy contract");
    expect(item.source).toBe("provider_hub");
    expect(item.category).toBe("model_mesh");
    expect(item.canExecute).toBe(false);
    expect(item.executionEnabled).toBe(false);
    expect(item.sideEffectsPerformed).toBe(false);
    expect(item.summary).toContain("strict_privacy");
    expect(item.blockedActions).toContain("blocked:cloud_data_transfer");
  });

  it("does not include live execution integrations or secrets", () => {
    expect(contractSource).not.toMatch(/fetch\(|axios|ProviderFactory|navigator\.clipboard|localStorage\.setItem|window\.open|child_process|exec\(/);
    expect(bridgeSource).not.toMatch(/fetch\(|axios|ProviderFactory|navigator\.clipboard|localStorage\.setItem|window\.open|child_process|exec\(/);
    expect(`${contractSource}\n${bridgeSource}`).not.toMatch(/apiKey|secret|password|tokenValue/);
  });

  it("does not rewrite App.tsx for this foundation", () => {
    expect(appSource).not.toContain("Task autonomy contract");
  });
});

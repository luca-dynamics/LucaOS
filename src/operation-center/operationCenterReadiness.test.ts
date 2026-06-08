import { describe, expect, it } from "vitest";
import { operationCenterFixtureItems } from "./operationCenterFixtures";
import { evaluateOperationCenterReadiness, summarizeOperationCenterItems } from "./operationCenterReadiness";

describe("operation center readiness", () => {
  it("summarizes statuses, sources, and risk", () => {
    const summary = summarizeOperationCenterItems(operationCenterFixtureItems);
    expect(summary.totalItems).toBe(operationCenterFixtureItems.length);
    expect(summary.approvalRequired).toBeGreaterThan(0);
    expect(summary.pending).toBeGreaterThan(0);
    expect(summary.blocked).toBeGreaterThan(0);
    expect(summary.modelOnly).toBeGreaterThan(0);
    expect(summary.readOnly).toBeGreaterThan(0);
    expect(summary.personalIntelligenceCount).toBeGreaterThan(0);
    expect(summary.lucaLinkCount).toBeGreaterThan(0);
    expect(summary.highRiskCount + summary.criticalRiskCount).toBeGreaterThan(0);
  });

  it("always preserves all execution and live capability invariants", () => {
    const readiness = evaluateOperationCenterReadiness(operationCenterFixtureItems);
    expect(readiness).toMatchObject({
      authorityGranted: false,
      readyForExecution: false,
      executionEnabled: false,
      canExecute: false,
      handoffEnabled: false,
      transportSendEnabled: false,
      adapterExecutionEnabled: false,
      displayOpenEnabled: false,
      sensorCollectionEnabled: false,
      fileWriteEnabled: false,
      installEnabled: false,
      readyForLiveSend: false,
      writeEnabled: false,
      liveCollectionEnabled: false,
      sideEffectsPerformed: false,
    });
    expect(readiness.topPendingApprovals.length).toBeGreaterThan(0);
    expect(readiness.topBlockedActions.length).toBeGreaterThan(0);
  });
});

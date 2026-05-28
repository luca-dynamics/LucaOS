import { describe, expect, it } from "vitest";
import { createOriginEvolutionDashboardSnapshot } from "./OriginEvolutionDashboardSnapshot";

describe("OriginEvolutionDashboardSnapshot", () => {
  it("empty input remains safe and read-only", () => {
    const snapshot = createOriginEvolutionDashboardSnapshot();
    expect(snapshot.readOnly).toBe(true);
    expect(snapshot.mockOnly).toBe(true);
    expect(snapshot.runtimeBehaviorChanged).toBe(false);
    expect(snapshot.uiWiringChanged).toBe(false);
  });

  it("privileged actions are always disabled", () => {
    const snapshot = createOriginEvolutionDashboardSnapshot({ proposalSummary: "x" });
    expect(snapshot.privilegedActionsEnabled).toBe(false);
  });
});

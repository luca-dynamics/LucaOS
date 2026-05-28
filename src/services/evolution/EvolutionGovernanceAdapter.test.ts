import { describe, expect, it } from "vitest";
import { EvolutionGovernanceAdapter } from "./EvolutionGovernanceAdapter";

describe("EvolutionGovernanceAdapter", () => {
  it("snapshot confirms adapter-only/no runtime replacement", () => {
    const snapshot = EvolutionGovernanceAdapter.getSnapshot();
    expect(snapshot.runtimeBehaviorChanged).toBe(false);
    expect(snapshot.existingEvolutionServiceReplaced).toBe(false);
    expect(snapshot.autonomousSelfModificationEnabled).toBe(false);
  });
});

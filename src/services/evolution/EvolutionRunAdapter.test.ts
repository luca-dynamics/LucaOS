import { describe, expect, it } from "vitest";
import { EvolutionRunAdapter } from "./EvolutionRunAdapter";

describe("EvolutionRunAdapter", () => {
  it("snapshot says optimizer execution and autonomous promotion are disabled", () => {
    const snapshot = EvolutionRunAdapter.getSnapshot();
    expect(snapshot.optimizerExecutionEnabled).toBe(false);
    expect(snapshot.autonomousPromotionEnabled).toBe(false);
    expect(snapshot.localExecutionAllowed).toBe(false);
  });
});

import { describe, expect, it } from "vitest";

import { createSkillRegistryEntry } from "./skillRegistry";
import { lucaFluidDesignReviewManifest } from "./lucaFluidDesignReviewManifest";

describe("Luca Fluid Design Review manifest", () => {
  it("loads as inspectable read-only knowledge without runtime authority", () => {
    const entry = createSkillRegistryEntry(lucaFluidDesignReviewManifest);
    expect(entry).toMatchObject({
      skillId: "luca-fluid-design-review",
      status: "available",
      riskLevel: "low",
      executionEnabled: false,
      sideEffectsPerformed: false,
      readiness: {
        readyForInspection: true,
        readyForExecution: false,
        requiresApproval: false,
        requiresSandbox: false,
      },
    });
    expect(entry.requiredTools).toEqual([]);
    expect(entry.requiredConnectors).toEqual([]);
    expect(entry.memoryPolicy?.access).toBe("none");
  });
});

import { describe, expect, it } from "vitest";
import { skillManifestAdapter } from "./SkillManifestAdapter";

describe("SkillManifestAdapter", () => {
  it("snapshot confirms adapter-only contract metadata", () => {
    const snapshot = skillManifestAdapter.getSnapshot();
    expect(snapshot.runtimeBehaviorChanged).toBe(false);
    expect(snapshot.autonomousSelfModificationEnabled).toBe(false);
    expect(snapshot.skillExecutionChanged).toBe(false);
  });
});

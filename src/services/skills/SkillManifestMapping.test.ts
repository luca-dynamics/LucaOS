import { describe, expect, it } from "vitest";
import { inferAllowedUserTiersFromLegacyTool, mapLegacyToolToSkillManifest } from "./SkillManifestMapping";

describe("SkillManifestMapping", () => {
  it("maps legacy tool to manifest and preserves unknown metadata", () => {
    const legacy = {
      category: "CORE",
      tool: { name: "searchweb", description: "Search docs", parameters: { type: "object" } },
      unknownField: { hello: "world" },
    };
    const manifest = mapLegacyToolToSkillManifest(legacy);
    expect(manifest.id).toBe("legacy.searchweb");
    expect(manifest.metadata.legacyTool).toEqual(legacy);
  });

  it("high-risk computer tools exclude normal tier", () => {
    const legacy = { category: "SYSTEM", tool: { name: "run_terminal", description: "execute system command" } };
    expect(inferAllowedUserTiersFromLegacyTool(legacy)).toEqual(["origin", "tactical"]);
    const manifest = mapLegacyToolToSkillManifest(legacy);
    expect(manifest.safetyPolicy?.requiresOriginApproval).toBe(true);
  });
});

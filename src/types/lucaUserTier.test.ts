import { describe, expect, it } from "vitest";
import {
  canTierAccessCapability,
  getDefaultTierContext,
  normalizeLucaUserTier,
} from "./lucaUserTier";

describe("lucaUserTier contract", () => {
  it("normalizes origin/tactical/normal aliases and falls back to unknown", () => {
    expect(normalizeLucaUserTier("origin")).toBe("origin");
    expect(normalizeLucaUserTier("Creator Tier")).toBe("origin");
    expect(normalizeLucaUserTier("tactical")).toBe("tactical");
    expect(normalizeLucaUserTier("advanced")).toBe("tactical");
    expect(normalizeLucaUserTier("normal")).toBe("normal");
    expect(normalizeLucaUserTier("core")).toBe("normal");
    expect(normalizeLucaUserTier("something-else")).toBe("unknown");
  });

  it("origin can view origin dashboard and import external artifacts", () => {
    expect(canTierAccessCapability("origin", "view_origin_evolution_dashboard")).toBe(true);
    expect(canTierAccessCapability("origin", "import_external_evolution_artifact")).toBe(true);
  });

  it("tactical can submit request but cannot approve/promote/rollback/import", () => {
    expect(canTierAccessCapability("tactical", "submit_evolution_request")).toBe(true);
    expect(canTierAccessCapability("tactical", "approve_evolution_proposal")).toBe(false);
    expect(canTierAccessCapability("tactical", "promote_evolution_candidate")).toBe(false);
    expect(canTierAccessCapability("tactical", "rollback_evolution_candidate")).toBe(false);
    expect(canTierAccessCapability("tactical", "import_external_evolution_artifact")).toBe(false);
  });

  it("normal cannot submit raw request/import/review", () => {
    expect(canTierAccessCapability("normal", "submit_evolution_request")).toBe(false);
    expect(canTierAccessCapability("normal", "import_external_evolution_artifact")).toBe(false);
    expect(canTierAccessCapability("normal", "review_evolution_proposal")).toBe(false);
  });

  it("unknown has no privileged capabilities", () => {
    expect(canTierAccessCapability("unknown", "provide_feedback_evidence")).toBe(true);
    expect(canTierAccessCapability("unknown", "submit_evolution_request")).toBe(false);
    expect(canTierAccessCapability("unknown", "view_origin_evolution_dashboard")).toBe(false);
  });

  it("default context keeps safety metadata false", () => {
    const context = getDefaultTierContext({ tier: "normal", source: "migration_placeholder" });

    expect(context.runtimeBehaviorChanged).toBe(false);
    expect(context.uiWiringChanged).toBe(false);
    expect(context.metadata?.runtimeBehaviorChanged).toBe(false);
    expect(context.metadata?.uiWiringChanged).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import {
  createIdentityProfilePreview,
  createIntegrationTarget,
  createMemoryPreview,
  createPersonalIntelligencePreview,
  listPersonalIntelligenceWarnings,
  summarizePersonalIntelligencePreview,
  validateIdentityProfilePreview,
} from "../index";

const now = () => new Date("2026-06-06T12:00:00.000Z");

describe("personal intelligence preview composer", () => {
  it("composes defensive previews and summarizes readiness warnings", () => {
    const identityProfile = createIdentityProfilePreview({
      userId: "user-1", displayName: "Alex", preferredName: "Alex", communicationStyle: "balanced",
      lucaPersonality: { tone: "calm", traits: [], boundaries: [] }, activeProjects: [], preferredModels: [],
      devicePreferences: [], privacyDefaults: {},
    }, now);
    const memoryItems = [createMemoryPreview({
      id: "memory-1", kind: "learning", title: "Health preference", content: "Sensitive preview", source: "preview",
      confidence: 0.7, privacyZone: "health", tags: [],
    }, now)];
    const target = createIntegrationTarget({
      id: "memory_panel", title: "Memory panel", description: "Future panel", runtimeRisk: "medium", touchesRuntime: true,
      touchesPersistence: true, touchesNetwork: false, touchesExecution: false, privacyZones: ["health"], futurePrRecommendation: "PR #208",
    });
    const preview = createPersonalIntelligencePreview({ identityProfile, memoryItems, integrationTargets: [target] });
    identityProfile.displayName = "mutated";
    memoryItems[0].tags.push("mutated");

    expect(preview.identityProfile?.displayName).toBe("Alex");
    expect(preview.memoryItems[0].tags).toEqual([]);
    expect(preview.readinessSummary.blocked).toBe(1);
    expect(listPersonalIntelligenceWarnings(preview)).toContain("Sensitive memory previews require an explicit governed approval policy before persistence or runtime use.");
    expect(summarizePersonalIntelligencePreview(preview)).toMatchObject({ identityProfiles: 1, memoryItems: 1, warningCount: preview.warnings.length });
  });

  it("exports integration helpers through the Personal Intelligence barrel", () => {
    expect(typeof createPersonalIntelligencePreview).toBe("function");
    expect(typeof validateIdentityProfilePreview).toBe("function");
  });
});

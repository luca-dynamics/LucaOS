import { describe, expect, it } from "vitest";
import type { OperatorProfile } from "../../types/operatorProfile";
import { buildIdentityCoreInputFromOperatorProfile } from "./identityCoreBridge";

function profile(overrides: Partial<OperatorProfile> = {}): OperatorProfile {
  return {
    identity: { name: "Ada" },
    personality: {
      communicationStyle: "direct",
      tone: "professional",
      traits: ["precise", "curious"],
    },
    assistantPreferences: {},
    workContext: { currentProjects: ["LucaOS", "Memoir"] },
    metadata: {
      profileCreated: new Date(0),
      lastUpdated: new Date(0),
      conversationCount: 3,
      privacyLevel: "balanced",
      confidence: 80,
    },
    ...overrides,
  };
}

describe("buildIdentityCoreInputFromOperatorProfile", () => {
  it("returns null without a usable profile name", () => {
    expect(buildIdentityCoreInputFromOperatorProfile(null)).toBeNull();
    expect(
      buildIdentityCoreInputFromOperatorProfile(
        profile({ identity: { name: "  " } }),
      ),
    ).toBeNull();
  });

  it("maps the real name, projects, tone, and traits", () => {
    const input = buildIdentityCoreInputFromOperatorProfile(profile());
    expect(input?.displayName).toBe("Ada");
    expect(input?.activeProjects).toEqual(["LucaOS", "Memoir"]);
    expect(input?.lucaPersonality.tone).toBe("professional");
    expect(input?.lucaPersonality.traits).toEqual(["precise", "curious"]);
  });

  it("translates the operator communication style into PI's vocabulary", () => {
    expect(
      buildIdentityCoreInputFromOperatorProfile(
        profile({ personality: { communicationStyle: "direct" } }),
      )?.communicationStyle,
    ).toBe("concise");
    expect(
      buildIdentityCoreInputFromOperatorProfile(
        profile({ personality: { communicationStyle: "casual" } }),
      )?.communicationStyle,
    ).toBe("conversational");
    expect(
      buildIdentityCoreInputFromOperatorProfile(
        profile({ personality: {} }),
      )?.communicationStyle,
    ).toBe("balanced");
  });

  it("always denies sensitive zones regardless of privacy level", () => {
    for (const privacyLevel of ["minimal", "balanced", "full"] as const) {
      const input = buildIdentityCoreInputFromOperatorProfile(
        profile({
          metadata: {
            profileCreated: new Date(0),
            lastUpdated: new Date(0),
            conversationCount: 0,
            privacyLevel,
            confidence: 0,
          },
        }),
      );
      expect(input?.privacyDefaults.credential).toBe("deny");
      expect(input?.privacyDefaults.financial).toBe("deny");
      expect(input?.privacyDefaults.private).toBe("deny");
    }
  });

  it("opens project/public zones only at higher privacy levels", () => {
    const minimal = buildIdentityCoreInputFromOperatorProfile(
      profile({
        metadata: { profileCreated: new Date(0), lastUpdated: new Date(0), conversationCount: 0, privacyLevel: "minimal", confidence: 0 },
      }),
    );
    const full = buildIdentityCoreInputFromOperatorProfile(
      profile({
        metadata: { profileCreated: new Date(0), lastUpdated: new Date(0), conversationCount: 0, privacyLevel: "full", confidence: 0 },
      }),
    );
    expect(minimal?.privacyDefaults.project).toBeUndefined();
    expect(full?.privacyDefaults.project).toBe("allow");
    expect(full?.privacyDefaults.public).toBe("allow");
  });

  it("keeps PI's safety boundaries, not profile-derived ones", () => {
    const input = buildIdentityCoreInputFromOperatorProfile(profile());
    expect(input?.lucaPersonality.boundaries).toEqual([
      "approval-before-action",
      "privacy-by-default",
    ]);
  });
});

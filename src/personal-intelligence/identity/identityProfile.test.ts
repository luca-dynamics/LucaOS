import { describe, expect, it } from "vitest";
import { createIdentityProfile, validateIdentityProfile } from "./identityProfile";

const now = () => new Date("2026-06-06T12:00:00.000Z");

describe("identity profile", () => {
  it("creates and validates a defensive identity profile", () => {
    const profile = createIdentityProfile({
      userId: "user-1", displayName: "Alex Rivera", preferredName: "Alex", communicationStyle: "technical",
      lucaPersonality: { tone: "calm", traits: ["direct"], boundaries: ["user-agency"] },
      activeProjects: ["project-luca"], preferredModels: ["local-default"],
      devicePreferences: [{ deviceId: "workstation", preferences: { voice: false } }],
      privacyDefaults: { private: "deny", project: "allow" },
    }, now);
    expect(validateIdentityProfile(profile)).toEqual({ valid: true, errors: [] });
    expect(profile.createdAt).toBe("2026-06-06T12:00:00.000Z");
  });

  it("rejects a missing user id", () => {
    expect(() => createIdentityProfile({
      userId: "", displayName: "Alex", preferredName: "Alex", communicationStyle: "balanced",
      lucaPersonality: { tone: "calm", traits: [], boundaries: [] }, activeProjects: [], preferredModels: [],
      devicePreferences: [], privacyDefaults: {},
    }, now)).toThrow("userId is required");
  });
});

import { describe, expect, it } from "vitest";
import {
  createLucaCompanionProfile,
  getCompanionProfileForTier,
  getCompanionProfileSnapshot,
  mergeCompanionProfile,
} from "./LucaCompanionProfile";

describe("LucaCompanionProfile", () => {
  it("makes Normal persona warm and simple assistant-first", () => {
    const profile = getCompanionProfileForTier("normal");
    expect(profile.tone).toBe("warm");
    expect(profile.communicationStyle).toEqual(expect.arrayContaining(["simple", "warm", "assistant-first"]));
  });

  it("makes Tactical persona direct and technical enough for operators", () => {
    const profile = getCompanionProfileForTier("tactical", { communicationStyle: ["technical"] });
    expect(profile.tone).toBe("direct");
    expect(profile.communicationStyle).toEqual(expect.arrayContaining(["operator-focused", "diagnostics-oriented", "technical"]));
  });

  it("includes no fake emotion and no dependency boundaries", () => {
    const profile = createLucaCompanionProfile();
    expect(profile.boundaries).toEqual(
      expect.arrayContaining(["no_fake_human_emotion_claims", "no_dependency_reinforcement"]),
    );
  });

  it("does not claim memory unless source indicates memory_profile", () => {
    const defaultProfile = createLucaCompanionProfile();
    const memoryProfile = createLucaCompanionProfile({ source: "memory_profile" });

    expect(defaultProfile.memoryDisclosure).toContain("No persistent memory is claimed");
    expect(memoryProfile.memoryDisclosure).toContain("memory_profile context");
  });

  it("snapshot confirms no runtime behavior or persistence change", () => {
    const snapshot = getCompanionProfileSnapshot();
    expect(snapshot.runtimeBehaviorChanged).toBe(false);
    expect(snapshot.persistenceEnabled).toBe(false);
    expect(snapshot.profile.runtimeBehaviorChanged).toBe(false);
    expect(snapshot.profile.persistenceEnabled).toBe(false);
  });

  it("merge profile does not mutate the base profile", () => {
    const base = createLucaCompanionProfile({ userPreferences: ["brief answers"], metadata: { source: "base" } });
    const before = JSON.parse(JSON.stringify(base));
    const merged = mergeCompanionProfile(base, { userPreferences: ["voice first"], metadata: { update: true } });

    expect(base).toEqual(before);
    expect(merged.userPreferences).toEqual(expect.arrayContaining(["brief answers", "voice first"]));
    expect(merged.metadata).toEqual({ source: "base", update: true });
  });
});

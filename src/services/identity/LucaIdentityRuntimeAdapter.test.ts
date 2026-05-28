import { describe, expect, it } from "vitest";
import {
  createLucaIdentityRuntimeSnapshot,
  createLucaRuntimeToneGuidance,
  createLucaSystemIdentitySummary,
  getIdentityRuntimeSafetySnapshot,
} from "./LucaIdentityRuntimeAdapter";
import { PERSONA_CONFIG } from "../../config/personaConfig";

describe("LucaIdentityRuntimeAdapter", () => {
  it("creates a safe prompt identity snapshot", () => {
    const snapshot = createLucaIdentityRuntimeSnapshot({ tier: "normal", surface: "chat" });

    expect(snapshot.identity.name).toBe("Luca");
    expect(snapshot.surface).toBe("chat");
    expect(snapshot.safeForPromptUse).toBe(true);
    expect(snapshot.persistenceEnabled).toBe(false);
    expect(snapshot.runtimeBehaviorChanged).toBe(true);
    expect(snapshot.systemIdentitySummary).toContain("Canonical Luca runtime identity");
    expect(snapshot.systemIdentitySummary).toContain("Memory disclosure");
  });

  it("makes Origin tone creator-facing, technical, and candid", () => {
    const tone = createLucaRuntimeToneGuidance({ tier: "origin" });
    expect(tone).toContain("creator-facing");
    expect(tone).toContain("technical");
    expect(tone).toContain("candid");
  });

  it("makes Tactical tone direct and operator diagnostics focused", () => {
    const snapshot = createLucaIdentityRuntimeSnapshot({ tier: "tactical", surface: "system" });
    expect(snapshot.runtimeToneGuidance).toContain("direct");
    expect(snapshot.runtimeToneGuidance).toContain("operator-focused");
    expect(snapshot.runtimeToneGuidance).toContain("diagnostics oriented");
  });

  it("makes Normal tone warm and simple", () => {
    const snapshot = createLucaIdentityRuntimeSnapshot({ tier: "normal", surface: "voice" });
    expect(snapshot.runtimeToneGuidance).toContain("warm");
    expect(snapshot.runtimeToneGuidance).toContain("simple");
    expect(snapshot.runtimeToneGuidance).toContain("assistant-first");
  });

  it("uses Unknown tier as a safe fallback", () => {
    const snapshot = createLucaIdentityRuntimeSnapshot({ tier: "unexpected", surface: "chat" });
    expect(snapshot.tier).toBe("unknown");
    expect(snapshot.runtimeToneGuidance).toContain("safe fallback");
    expect(snapshot.tierPersona.behavior.boundaries).toContain("no tier-specific assumptions");
  });

  it("allows relationship summary disclosure only for memory_profile", () => {
    const memorySnapshot = createLucaIdentityRuntimeSnapshot({
      source: "memory_profile",
      relationshipSummary: "Prefers concise project check-ins.",
    });
    const defaultSnapshot = createLucaIdentityRuntimeSnapshot({
      source: "settings",
      relationshipSummary: "Should not be disclosed as memory.",
    });

    expect(memorySnapshot.identity.relationshipSummary).toBe("Prefers concise project check-ins.");
    expect(memorySnapshot.systemIdentitySummary).toContain("Memory-profile relationship summary");
    expect(defaultSnapshot.identity.relationshipSummary).toBeUndefined();
    expect(defaultSnapshot.systemIdentitySummary).not.toContain("Should not be disclosed as memory");
  });

  it("does not claim persistent memory for non-memory sources", () => {
    const summary = createLucaSystemIdentitySummary({ source: "onboarding", relationshipSummary: "Old memory text" });
    expect(summary).toContain("must not claim persistent memory");
    expect(summary).not.toContain("Old memory text");
  });

  it("includes forbidden claims in runtime and safety snapshots", () => {
    const snapshot = createLucaIdentityRuntimeSnapshot();
    const safety = getIdentityRuntimeSafetySnapshot();

    expect(snapshot.forbiddenClaims.join(" ")).toContain("human feelings");
    expect(snapshot.forbiddenClaims.join(" ")).toContain("persistent memory");
    expect(safety.forbiddenClaims).toEqual(expect.arrayContaining(snapshot.forbiddenClaims));
    expect(safety.memoryClaimAllowed).toBe(false);
  });

  it("is compatible with the existing persona prompt helper", () => {
    const prompt = PERSONA_CONFIG.ASSISTANT.instruction("Known preference: concise replies", "No active tasks", undefined, {
      name: "Mac",
      tier: "normal",
    });

    expect(prompt).toContain("Canonical Luca runtime identity");
    expect(prompt).toContain("Memory disclosure");
    expect(prompt).toContain("Mode: ASSISTANT");
    expect(prompt).toContain("human feelings");
  });
});

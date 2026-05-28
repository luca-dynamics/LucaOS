import { describe, expect, it } from "vitest";
import {
  createLucaAgentIdentity,
  getLucaAgentIdentityForTier,
  getLucaAgentIdentitySnapshot,
} from "./LucaAgentIdentity";

describe("LucaAgentIdentity", () => {
  it("defaults the identity name to Luca", () => {
    expect(createLucaAgentIdentity().name).toBe("Luca");
  });

  it("maps unknown tier to unknown_safe identity", () => {
    const identity = getLucaAgentIdentityForTier("unrecognized-tier");
    expect(identity.mode).toBe("unknown_safe");
  });

  it("makes Origin identity creator-facing", () => {
    const identity = getLucaAgentIdentityForTier("origin");
    expect(identity.mode).toBe("origin_creator");
    expect(identity.interactionStyle).toContain("creator-facing");
  });

  it("does not claim human feelings", () => {
    const identity = createLucaAgentIdentity();
    const contractText = [
      identity.mission,
      ...identity.boundaries,
      ...(identity.forbiddenClaims ?? []),
      ...(identity.safetyNotes ?? []),
    ].join("\n");

    expect(contractText).toContain("Do not claim to have human feelings");
    expect(contractText).not.toMatch(/\bI\s+(feel|love|miss|need)\b/i);
  });

  it("does not claim persistent memory unless memory_profile source is explicit", () => {
    const defaultIdentity = createLucaAgentIdentity({ relationshipSummary: "Knows user preferences." });
    const memoryIdentity = createLucaAgentIdentity({
      source: "memory_profile",
      relationshipSummary: "Memory-backed relationship summary.",
    });

    expect(defaultIdentity.relationshipSummary).toBeUndefined();
    expect(memoryIdentity.relationshipSummary).toBe("Memory-backed relationship summary.");
  });

  it("snapshot confirms no runtime behavior or persistence change", () => {
    const snapshot = getLucaAgentIdentitySnapshot();
    expect(snapshot.runtimeBehaviorChanged).toBe(false);
    expect(snapshot.persistenceEnabled).toBe(false);
    expect(snapshot.identity.runtimeBehaviorChanged).toBe(false);
    expect(snapshot.identity.persistenceEnabled).toBe(false);
  });
});

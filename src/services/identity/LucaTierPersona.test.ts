import { describe, expect, it } from "vitest";
import { createTierPersona, getTierPersonaBehavior, getTierPersonaSnapshot } from "./LucaTierPersona";

describe("LucaTierPersona", () => {
  it("maps Tactical persona to operator and diagnostics orientation", () => {
    const persona = createTierPersona("tactical");
    expect(persona.behavior.audience).toBe("operator-facing");
    expect(persona.behavior.style).toEqual(expect.arrayContaining(["diagnostics-oriented", "action/checklist oriented"]));
  });

  it("maps Normal persona to warm simple assistant-first behavior", () => {
    const behavior = getTierPersonaBehavior("normal");
    expect(behavior.audience).toBe("assistant-first");
    expect(behavior.style).toEqual(expect.arrayContaining(["simple", "warm", "avoids technical overload"]));
  });

  it("maps Origin persona to creator-facing strategic behavior", () => {
    const persona = createTierPersona("origin");
    expect(persona.behavior.audience).toBe("creator-facing");
    expect(persona.behavior.style).toEqual(expect.arrayContaining(["strategic", "candid about system limitations"]));
    expect(persona.behavior.allowedPresentation).toContain("architecture/evolution status summaries");
  });

  it("maps unknown persona to safe fallback onboarding guidance", () => {
    const persona = createTierPersona(undefined);
    expect(persona.tier).toBe("unknown");
    expect(persona.behavior.audience).toBe("safe fallback");
    expect(persona.behavior.style).toContain("onboarding guidance");
  });

  it("snapshot confirms contract-only safety flags", () => {
    const snapshot = getTierPersonaSnapshot({ tier: "normal" });
    expect(snapshot.runtimeBehaviorChanged).toBe(false);
    expect(snapshot.persistenceEnabled).toBe(false);
    expect(snapshot.contractOnly).toBe(true);
    expect(snapshot.persona.runtimeBehaviorChanged).toBe(false);
    expect(snapshot.persona.persistenceEnabled).toBe(false);
  });
});

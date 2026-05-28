import { describe, expect, it } from "vitest";
import {
  canMountOriginEvolutionDashboard,
  getTierRoutingSafetySnapshot,
  resolveLucaTierShellMode,
} from "./lucaTierRouting";

describe("lucaTierRouting contract", () => {
  it("origin resolves to origin_creator_shell", () => {
    const decision = resolveLucaTierShellMode({ userTier: "origin", source: "onboarding" });
    expect(decision.shellMode).toBe("origin_creator_shell");
  });

  it("tactical resolves to tactical_shell", () => {
    const decision = resolveLucaTierShellMode({ userTier: "tactical", source: "settings" });
    expect(decision.shellMode).toBe("tactical_shell");
  });

  it("normal resolves to normal_shell", () => {
    const decision = resolveLucaTierShellMode({ userTier: "normal", source: "settings" });
    expect(decision.shellMode).toBe("normal_shell");
  });

  it("unknown resolves to unknown_safe_shell", () => {
    const decision = resolveLucaTierShellMode({ userTier: "unknown", source: "unknown" });
    expect(decision.shellMode).toBe("unknown_safe_shell");
  });

  it("only origin decision can mount origin evolution dashboard", () => {
    const decision = resolveLucaTierShellMode({ userTier: "origin", source: "creator_override" });

    expect(canMountOriginEvolutionDashboard(decision)).toBe(true);
    expect(decision.evolutionDashboardMountAllowed).toBe(true);
  });

  it("tactical/normal/unknown cannot mount origin dashboard", () => {
    const tactical = resolveLucaTierShellMode({ userTier: "tactical", source: "settings" });
    const normal = resolveLucaTierShellMode({ userTier: "normal", source: "settings" });
    const unknown = resolveLucaTierShellMode({ userTier: "unknown", source: "unknown" });

    expect(canMountOriginEvolutionDashboard(tactical)).toBe(false);
    expect(canMountOriginEvolutionDashboard(normal)).toBe(false);
    expect(canMountOriginEvolutionDashboard(unknown)).toBe(false);
  });

  it("safety snapshot confirms no runtime/UI wiring changes", () => {
    const snapshot = getTierRoutingSafetySnapshot({
      userTier: "origin",
      source: "private_macbook_migration",
    });

    expect(snapshot.runtimeBehaviorChanged).toBe(false);
    expect(snapshot.uiWiringChanged).toBe(false);
    expect(snapshot.decision.runtimeBehaviorChanged).toBe(false);
    expect(snapshot.decision.uiWiringChanged).toBe(false);
  });
});

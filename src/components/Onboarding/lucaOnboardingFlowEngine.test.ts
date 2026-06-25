import { describe, expect, it } from "vitest";
import {
  canLucaOnboardingFlowGoBack,
  canLucaOnboardingFlowSkip,
  createLucaOnboardingFlowState,
  getLucaOnboardingFlowIndex,
  getLucaOnboardingFlowTotal,
  isLucaOnboardingFlowComplete,
  isLucaOnboardingFlowFirstScreen,
  isLucaOnboardingFlowLastScreen,
  lucaOnboardingFlowComplete,
  lucaOnboardingFlowGoBack,
  lucaOnboardingFlowGoNext,
  lucaOnboardingFlowRequiresConsent,
  lucaOnboardingFlowSetOption,
  lucaOnboardingFlowSkip,
} from "./lucaOnboardingFlowEngine";
import { getPremiumOnboardingDefaultSelections } from "./onboardingPremiumScreenMap";

describe("lucaOnboardingFlowEngine", () => {
  it("starts on welcome with the recommended defaults seeded", () => {
    const state = createLucaOnboardingFlowState();
    expect(state.currentScreenId).toBe("welcome");
    expect(state.complete).toBe(false);
    expect(state.audienceMode).toBe("basic");
    expect(state.selectedOptions).toEqual(getPremiumOnboardingDefaultSelections());
    expect(isLucaOnboardingFlowFirstScreen(state)).toBe(true);
    expect(getLucaOnboardingFlowTotal()).toBe(8);
  });

  it("can start without seeding defaults and merges only valid initial selections", () => {
    const state = createLucaOnboardingFlowState({
      seedDefaults: false,
      initialSelections: { environment: "carbon", presence: "not-real" },
    });
    expect(state.selectedOptions.environment).toBe("carbon");
    // invalid option ignored
    expect(state.selectedOptions.presence).toBeUndefined();
  });

  it("advances welcome -> finish through the full map order with goNext", () => {
    let state = createLucaOnboardingFlowState();
    const visited = [state.currentScreenId];
    for (let i = 0; i < 20 && !isLucaOnboardingFlowLastScreen(state); i += 1) {
      state = lucaOnboardingFlowGoNext(state);
      visited.push(state.currentScreenId);
    }
    expect(visited).toEqual([
      "welcome",
      "environment",
      "presence",
      "permission_style",
      "memory_boundaries",
      "connect_tools",
      "intelligence_route",
      "finish",
    ]);
    expect(isLucaOnboardingFlowLastScreen(state)).toBe(true);
  });

  it("goNext on the finish screen is a no-op (same reference)", () => {
    const finish = createLucaOnboardingFlowState({ startScreenId: "finish" });
    expect(lucaOnboardingFlowGoNext(finish)).toBe(finish);
  });

  it("goBack is blocked on welcome (map canGoBack:false) and works elsewhere", () => {
    const welcome = createLucaOnboardingFlowState();
    expect(canLucaOnboardingFlowGoBack(welcome)).toBe(false);
    expect(lucaOnboardingFlowGoBack(welcome)).toBe(welcome);

    const env = createLucaOnboardingFlowState({ startScreenId: "environment" });
    expect(canLucaOnboardingFlowGoBack(env)).toBe(true);
    expect(lucaOnboardingFlowGoBack(env).currentScreenId).toBe("welcome");
  });

  it("skip advances only where the map marks the screen skippable", () => {
    // welcome is skippable -> moves to environment
    const welcome = createLucaOnboardingFlowState();
    expect(canLucaOnboardingFlowSkip(welcome)).toBe(true);
    expect(lucaOnboardingFlowSkip(welcome).currentScreenId).toBe("environment");

    // permission_style is NOT skippable -> no-op
    const perm = createLucaOnboardingFlowState({ startScreenId: "permission_style" });
    expect(canLucaOnboardingFlowSkip(perm)).toBe(false);
    expect(lucaOnboardingFlowSkip(perm)).toBe(perm);
  });

  it("surfaces the map's explicit-consent gate without enforcing it", () => {
    const welcome = createLucaOnboardingFlowState();
    expect(lucaOnboardingFlowRequiresConsent(welcome)).toBe(false);
    const perm = createLucaOnboardingFlowState({ startScreenId: "permission_style" });
    expect(lucaOnboardingFlowRequiresConsent(perm)).toBe(true);
  });

  it("setOption records valid options immutably and ignores invalid ones", () => {
    const state = createLucaOnboardingFlowState();
    const next = lucaOnboardingFlowSetOption(state, "environment", "flow");
    expect(next).not.toBe(state);
    expect(next.selectedOptions.environment).toBe("flow");
    // original untouched (immutability)
    expect(state.selectedOptions.environment).toBe("pearl");

    // invalid option -> same reference
    expect(lucaOnboardingFlowSetOption(state, "environment", "nope")).toBe(state);
    // re-selecting the same value -> same reference
    const same = lucaOnboardingFlowSetOption(next, "environment", "flow");
    expect(same).toBe(next);
  });

  it("only the finish screen can complete the flow", () => {
    const env = createLucaOnboardingFlowState({ startScreenId: "environment" });
    expect(lucaOnboardingFlowComplete(env)).toBe(env);
    expect(isLucaOnboardingFlowComplete(env)).toBe(false);

    const finish = createLucaOnboardingFlowState({ startScreenId: "finish" });
    const completed = lucaOnboardingFlowComplete(finish);
    expect(isLucaOnboardingFlowComplete(completed)).toBe(true);
    // idempotent
    expect(lucaOnboardingFlowComplete(completed)).toBe(completed);
  });

  it("index/last-screen selectors track the pointer", () => {
    const welcome = createLucaOnboardingFlowState();
    expect(getLucaOnboardingFlowIndex(welcome)).toBe(0);
    const finish = createLucaOnboardingFlowState({ startScreenId: "finish" });
    expect(getLucaOnboardingFlowIndex(finish)).toBe(7);
    expect(isLucaOnboardingFlowLastScreen(finish)).toBe(true);
  });
});

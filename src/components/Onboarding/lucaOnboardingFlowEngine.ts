import {
  getPremiumOnboardingCopy,
  type PremiumOnboardingAudienceMode,
  type PremiumOnboardingScreenId,
} from "./onboardingPremiumCopy";
import {
  getPremiumOnboardingDefaultSelections,
  getPremiumOnboardingNextScreen,
  getPremiumOnboardingPreviousScreen,
  getPremiumOnboardingScreenEntry,
  premiumOnboardingScreenMapOrder,
} from "./onboardingPremiumScreenMap";

/**
 * lucaOnboardingFlowEngine — the PURE onboarding flow controller (a state
 * machine), per docs/luca-onboarding-presence-visual-language-spec.md and the
 * staged onboarding plan.
 *
 * This is a flow ENGINE, not a flow container. It owns *when* the flow moves,
 * never *what it looks like*:
 *
 *   - owns the current screen pointer
 *   - owns the in-memory option selections
 *   - owns the completion flag
 *   - derives every transition ONLY from onboardingPremiumScreenMap
 *
 * Purity / boundary discipline (deliberately strict so it cannot couple to UI):
 * - Plain TypeScript. It imports NO React, NO UI/shell/presence/skin/renderer
 *   module, and renders nothing.
 * - Every function is pure: it returns a new state value and never mutates the
 *   input. When nothing changes it returns the same state reference.
 * - It performs NO side effects — no routing, no persistence/storage, no
 *   provider/memory/tool/governance activation. Selections live only in memory.
 * - It carries no status/safety semantics. It surfaces the map's consent/skip/
 *   back gates as selectors for a future UI to honor; it does not enforce or
 *   bypass them.
 *
 * A later wiring step feeds this state + selectors as props into
 * LucaOnboardingScreen / LucaOnboardingShell. The engine stays unaware of that.
 */

export type LucaOnboardingFlowSelections = Readonly<
  Partial<Record<PremiumOnboardingScreenId, string>>
>;

export interface LucaOnboardingFlowState {
  readonly audienceMode: PremiumOnboardingAudienceMode;
  readonly currentScreenId: PremiumOnboardingScreenId;
  readonly selectedOptions: LucaOnboardingFlowSelections;
  readonly complete: boolean;
}

export interface CreateLucaOnboardingFlowStateOptions {
  audienceMode?: PremiumOnboardingAudienceMode;
  startScreenId?: PremiumOnboardingScreenId;
  /** Selections to merge over the map defaults. */
  initialSelections?: Partial<Record<PremiumOnboardingScreenId, string>>;
  /** Seed the recommended map defaults (default true). */
  seedDefaults?: boolean;
}

const FIRST_SCREEN_ID: PremiumOnboardingScreenId = premiumOnboardingScreenMapOrder[0];

/** True only when `optionId` is a real option for `screenId` in this tier's copy. */
const isValidOption = (
  audienceMode: PremiumOnboardingAudienceMode,
  screenId: PremiumOnboardingScreenId,
  optionId: string,
): boolean => {
  const options = getPremiumOnboardingCopy(audienceMode).screens[screenId].options;
  return Boolean(options?.some((option) => option.id === optionId));
};

/** Build the initial flow state, seeding the recommended defaults by default. */
export const createLucaOnboardingFlowState = (
  options: CreateLucaOnboardingFlowStateOptions = {},
): LucaOnboardingFlowState => {
  const audienceMode = options.audienceMode ?? "basic";
  const seedDefaults = options.seedDefaults ?? true;

  const seeded: Partial<Record<PremiumOnboardingScreenId, string>> = seedDefaults
    ? { ...(getPremiumOnboardingDefaultSelections() as Record<string, string>) }
    : {};

  const selectedOptions: Partial<Record<PremiumOnboardingScreenId, string>> = {
    ...seeded,
  };

  // Merge only valid initial selections over the defaults.
  if (options.initialSelections) {
    for (const [screenId, optionId] of Object.entries(options.initialSelections)) {
      if (
        optionId !== undefined &&
        isValidOption(audienceMode, screenId as PremiumOnboardingScreenId, optionId)
      ) {
        selectedOptions[screenId as PremiumOnboardingScreenId] = optionId;
      }
    }
  }

  return {
    audienceMode,
    currentScreenId: options.startScreenId ?? FIRST_SCREEN_ID,
    selectedOptions,
    complete: false,
  };
};

// ── Selectors (pure derivations from the screen map) ────────────────────────

export const getLucaOnboardingFlowIndex = (state: LucaOnboardingFlowState): number =>
  premiumOnboardingScreenMapOrder.indexOf(state.currentScreenId);

export const getLucaOnboardingFlowTotal = (): number =>
  premiumOnboardingScreenMapOrder.length;

export const isLucaOnboardingFlowFirstScreen = (
  state: LucaOnboardingFlowState,
): boolean => getLucaOnboardingFlowIndex(state) <= 0;

export const isLucaOnboardingFlowLastScreen = (
  state: LucaOnboardingFlowState,
): boolean =>
  getLucaOnboardingFlowIndex(state) === premiumOnboardingScreenMapOrder.length - 1;

export const canLucaOnboardingFlowGoBack = (
  state: LucaOnboardingFlowState,
): boolean =>
  getPremiumOnboardingScreenEntry(state.currentScreenId).canGoBack &&
  getPremiumOnboardingPreviousScreen(state.currentScreenId) !== undefined;

export const canLucaOnboardingFlowSkip = (
  state: LucaOnboardingFlowState,
): boolean =>
  getPremiumOnboardingScreenEntry(state.currentScreenId).canSkip &&
  getPremiumOnboardingNextScreen(state.currentScreenId) !== undefined;

/** Whether the map marks the current screen as needing explicit consent. */
export const lucaOnboardingFlowRequiresConsent = (
  state: LucaOnboardingFlowState,
): boolean => getPremiumOnboardingScreenEntry(state.currentScreenId).requiresExplicitConsent;

export const getLucaOnboardingFlowSelection = (
  state: LucaOnboardingFlowState,
  screenId: PremiumOnboardingScreenId,
): string | undefined => state.selectedOptions[screenId];

export const isLucaOnboardingFlowComplete = (
  state: LucaOnboardingFlowState,
): boolean => state.complete;

// ── Transitions (pure; return the same reference when nothing changes) ───────

/** Advance to the next screen in map order. No-op on the last screen. */
export const lucaOnboardingFlowGoNext = (
  state: LucaOnboardingFlowState,
): LucaOnboardingFlowState => {
  const next = getPremiumOnboardingNextScreen(state.currentScreenId);
  if (next === undefined) return state;
  return { ...state, currentScreenId: next };
};

/** Step back to the previous screen, only where the map allows it. */
export const lucaOnboardingFlowGoBack = (
  state: LucaOnboardingFlowState,
): LucaOnboardingFlowState => {
  if (!canLucaOnboardingFlowGoBack(state)) return state;
  const previous = getPremiumOnboardingPreviousScreen(state.currentScreenId);
  if (previous === undefined) return state;
  return { ...state, currentScreenId: previous };
};

/** Skip forward, only where the map marks the current screen skippable. */
export const lucaOnboardingFlowSkip = (
  state: LucaOnboardingFlowState,
): LucaOnboardingFlowState => {
  if (!canLucaOnboardingFlowSkip(state)) return state;
  const next = getPremiumOnboardingNextScreen(state.currentScreenId);
  if (next === undefined) return state;
  return { ...state, currentScreenId: next };
};

/** Record an option selection for a screen. Ignores options not in the copy. */
export const lucaOnboardingFlowSetOption = (
  state: LucaOnboardingFlowState,
  screenId: PremiumOnboardingScreenId,
  optionId: string,
): LucaOnboardingFlowState => {
  if (!isValidOption(state.audienceMode, screenId, optionId)) return state;
  if (state.selectedOptions[screenId] === optionId) return state;
  return {
    ...state,
    selectedOptions: { ...state.selectedOptions, [screenId]: optionId },
  };
};

/**
 * Completion trigger. Only the finish screen can complete the flow; everywhere
 * else this is a no-op. Completion is purely a state flag — it activates nothing.
 */
export const lucaOnboardingFlowComplete = (
  state: LucaOnboardingFlowState,
): LucaOnboardingFlowState => {
  if (state.currentScreenId !== "finish") return state;
  if (state.complete) return state;
  return { ...state, complete: true };
};

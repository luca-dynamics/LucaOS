import {
  resolveOnboardingFunctionalTail,
  type LucaOnboardingFunctionalStep,
  type LucaOnboardingFunctionalTailInput,
} from "./lucaOnboardingFunctionalTail";

/**
 * lucaOnboardingTailController — the PURE controller that sequences the
 * onboarding functional tail (per docs/luca-premium-onboarding-functional-handoff-map.md).
 *
 * After the calm premium choices, the resolved tail steps (face-recognition,
 * local-intelligence-setup — see lucaOnboardingFunctionalTail) run in order.
 * This controller owns only *which* tail step is active and advancing through
 * them; the step UIs (LucaFaceRecognitionMoment, LucaLocalIntelligenceMoment)
 * and the engine completion stay elsewhere.
 *
 * Pure and dormant: inputs in, new state out; no React/UI imports, no state,
 * no side effects, returns the same reference when nothing changes. A single
 * `advance` covers both "finished this step" and "skipped this step" — every
 * tail step is optional, so both simply move to the next. Wired nowhere yet
 * (the preview/flow assembly consumes it).
 */

export interface LucaOnboardingTailState {
  readonly steps: readonly LucaOnboardingFunctionalStep[];
  /** Index of the active step; equal to steps.length once the tail is done. */
  readonly index: number;
}

export function createOnboardingTailState(
  input: LucaOnboardingFunctionalTailInput,
): LucaOnboardingTailState {
  return { steps: resolveOnboardingFunctionalTail(input), index: 0 };
}

export function currentOnboardingTailStep(
  state: LucaOnboardingTailState,
): LucaOnboardingFunctionalStep | undefined {
  return state.steps[state.index];
}

export function isOnboardingTailComplete(
  state: LucaOnboardingTailState,
): boolean {
  return state.index >= state.steps.length;
}

export function isOnboardingTailEmpty(state: LucaOnboardingTailState): boolean {
  return state.steps.length === 0;
}

export interface LucaOnboardingTailProgress {
  index: number;
  total: number;
  complete: boolean;
}

export function getOnboardingTailProgress(
  state: LucaOnboardingTailState,
): LucaOnboardingTailProgress {
  return {
    index: Math.min(state.index, state.steps.length),
    total: state.steps.length,
    complete: isOnboardingTailComplete(state),
  };
}

/** Advance past the active step (finished or skipped — both optional). No-op at the end. */
export function advanceOnboardingTail(
  state: LucaOnboardingTailState,
): LucaOnboardingTailState {
  if (isOnboardingTailComplete(state)) return state;
  return { ...state, index: state.index + 1 };
}

/**
 * lucaOnboardingFunctionalTail — the PURE resolver for the premium onboarding
 * "functional tail" (per docs/luca-premium-onboarding-functional-handoff-map.md,
 * P5a, with docs/luca-onboarding-local-intelligence-setup-spec.md and
 * docs/luca-onboarding-face-recognition-experience-spec.md).
 *
 * After the calm premium choices, only the functional steps a user's choices +
 * host capabilities actually require should run. This helper turns those inputs
 * into the ordered list of steps; everything it returns is optional and
 * skippable at the UI level, and an empty list means the user goes straight to
 * completion (the common Basic/cloud/web path).
 *
 * Pure and dormant: inputs in, ordered step list out. It imports no React/UI,
 * reads no state, performs no side effects, and is wired nowhere yet.
 */

export type LucaOnboardingFunctionalStep =
  | "face-recognition"
  | "local-intelligence-setup";

/**
 * Deterministic order: identity (the being learning its owner) settles before
 * the heavier local-intelligence infrastructure.
 */
const FUNCTIONAL_STEP_ORDER: readonly LucaOnboardingFunctionalStep[] = [
  "face-recognition",
  "local-intelligence-setup",
];

export interface LucaOnboardingFunctionalTailInput {
  /** The premium intelligence_route selection (e.g. "luca_prime", "local_model"). */
  intelligenceRoute?: string;
  /** Adapter capability: can this host provision local models at all? */
  supportsLocalProvisioning: boolean;
  /** Host capability: is a camera available for the optional recognition moment? */
  cameraAvailable?: boolean;
  /** Whether to offer the optional face-recognition moment at all (default true). */
  offerFaceRecognition?: boolean;
}

/** Local setup runs only for a local route on a host that can provision it. */
function needsLocalIntelligenceSetup(
  input: LucaOnboardingFunctionalTailInput,
): boolean {
  return (
    input.intelligenceRoute === "local_model" && input.supportsLocalProvisioning
  );
}

/** Face recognition is offered (still opt-in in-flow) when a camera is available. */
function offersFaceRecognition(
  input: LucaOnboardingFunctionalTailInput,
): boolean {
  return input.offerFaceRecognition !== false && input.cameraAvailable !== false;
}

/**
 * Resolve the ordered functional-tail steps for the given choices + capabilities.
 * Returns an empty list when no functional step is required.
 */
export function resolveOnboardingFunctionalTail(
  input: LucaOnboardingFunctionalTailInput,
): LucaOnboardingFunctionalStep[] {
  const included: Record<LucaOnboardingFunctionalStep, boolean> = {
    "face-recognition": offersFaceRecognition(input),
    "local-intelligence-setup": needsLocalIntelligenceSetup(input),
  };
  return FUNCTIONAL_STEP_ORDER.filter((step) => included[step]);
}

export function isOnboardingFunctionalTailEmpty(
  input: LucaOnboardingFunctionalTailInput,
): boolean {
  return resolveOnboardingFunctionalTail(input).length === 0;
}

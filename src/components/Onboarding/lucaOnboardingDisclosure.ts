import type {
  PremiumOnboardingAudienceMode,
  PremiumOnboardingOptionCopy,
} from "./onboardingPremiumCopy";

/**
 * lucaOnboardingDisclosure — the pure rule for Basic / Pro / Creator
 * progressive disclosure of onboarding options (per
 * docs/luca-premium-onboarding-postboot-design.md section 6).
 *
 * The merged copy model already marks deeper options with `advanced`
 * (e.g. Custom permission rules, Local models, Bring-your-own provider access).
 * This helper turns the chosen audience tier into a partition of an option set:
 *
 *   - Basic keeps the calm spine — advanced options are collapsed behind a
 *     disclosure and never add mandatory steps.
 *   - Pro / Creator are "powerful but not overwhelming" — the same advanced
 *     options are shown by default, no extra clicks.
 *
 * It is pure and presentational-data only: options in, partition out. It reads
 * no state, performs no side effects, and mutates nothing. Option order within
 * each group is preserved from the copy model.
 */

export interface LucaOnboardingDisclosure {
  primaryOptions: PremiumOnboardingOptionCopy[];
  advancedOptions: PremiumOnboardingOptionCopy[];
  /** Whether advanced options should render expanded (Pro / Creator) rather than collapsed. */
  advancedShownByDefault: boolean;
}

/** Tiers that reveal advanced options by default. */
export const isLucaOnboardingAdvancedTier = (
  audienceMode: PremiumOnboardingAudienceMode,
): boolean => audienceMode === "pro" || audienceMode === "creator";

export const getLucaOnboardingDisclosure = (
  audienceMode: PremiumOnboardingAudienceMode,
  options: readonly PremiumOnboardingOptionCopy[] | undefined,
): LucaOnboardingDisclosure => {
  const all = options ?? [];
  return {
    primaryOptions: all.filter((option) => !option.advanced),
    advancedOptions: all.filter((option) => option.advanced),
    advancedShownByDefault: isLucaOnboardingAdvancedTier(audienceMode),
  };
};

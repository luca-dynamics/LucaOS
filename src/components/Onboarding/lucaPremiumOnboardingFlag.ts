/**
 * lucaPremiumOnboardingFlag — the opt-in gate for the premium onboarding live
 * mount (per docs/luca-premium-onboarding-productionization-plan.md, P4).
 *
 * The premium flow stays OFF by default; the legacy onboarding remains the
 * default path until a later rollout step flips it. This reads a single query
 * flag (`?premiumOnboarding=1`), mirroring the existing `?bootDebug=1` pattern.
 *
 * Pure and SSR-safe: it reads only the provided search string (or
 * `window.location.search` when available) and performs no side effects.
 */

export const LUCA_PREMIUM_ONBOARDING_QUERY_FLAG = "premiumOnboarding";

export function isPremiumOnboardingEnabled(search?: string): boolean {
  let query = search;
  if (query === undefined) {
    if (typeof window === "undefined") return false;
    query = window.location.search;
  }
  try {
    return (
      new URLSearchParams(query).get(LUCA_PREMIUM_ONBOARDING_QUERY_FLAG) === "1"
    );
  } catch {
    return false;
  }
}

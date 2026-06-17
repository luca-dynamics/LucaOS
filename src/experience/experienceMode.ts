/**
 * LucaOS Experience Modes — foundation module.
 *
 * This is the official, product-facing mode system: Basic / Pro / Creator.
 * It replaces the previous conceptual language (Normal / Tactical / Origin)
 * and aligns with the existing build-layer vocabulary in `layerBoundary.ts`
 * (`LucaAudienceTier`: public_standard / public_tactical / origin).
 *
 * IMPORTANT: everything here is intentionally **pure and non-runtime**.
 *   - No side effects, no I/O, no reads of `import.meta.env` or build config.
 *   - No UI gating, no settings/onboarding behavior, no authority changes.
 * It is a typed source of truth + helpers that later PRs build on (onboarding
 * recommendation, settings switch, dashboard gating, Creator access).
 *
 * See docs/product/lucaos-experience-modes.md for the full design contract.
 */

import type { UIThemeId } from "../types/lucaPersonality";
import type {
  Accent,
  AppearanceMode,
  MotionStyle,
  ProductTheme,
} from "../config/lucaAppearanceTokens";
import type { LucaAudienceTier } from "../config/layerBoundary";

/** The three official experience modes. Lowercase is the canonical form. */
export type LucaExperienceMode = "basic" | "pro" | "creator";

/** Ordered, least → most capability/disclosure. */
export const LUCA_EXPERIENCE_MODES: readonly LucaExperienceMode[] = [
  "basic",
  "pro",
  "creator",
] as const;

/**
 * The `tier` prop shape consumed by `Header` (added in PR #235). It uses an
 * uppercase form, so we bridge to/from it explicitly rather than leaking the
 * casing mismatch across the codebase.
 */
export type HeaderTier = "BASIC" | "PRO" | "CREATOR";

/** Disclosure/density level a mode implies. Tier changes density, not loudness. */
export type ExperienceDensity = "comfortable" | "standard" | "dense";

export interface ExperienceModeInfo {
  mode: LucaExperienceMode;
  /** Product-facing label, e.g. "Basic". */
  label: string;
  /** One-line positioning statement. */
  tagline: string;
  /** Who the mode is for / what it unlocks. */
  description: string;
  /** Whether this mode is offered as a normal onboarding card. */
  selectableInOnboarding: boolean;
}

export const EXPERIENCE_MODE_INFO: Record<
  LucaExperienceMode,
  ExperienceModeInfo
> = {
  basic: {
    mode: "basic",
    label: "Basic",
    tagline: "A calm, friendly personal AI.",
    description:
      "Everyday mode: simple chat and voice, friendly memory, easy device " +
      "linking, and minimal diagnostics. No tactical surfaces by default.",
    selectableInOnboarding: true,
  },
  pro: {
    mode: "pro",
    label: "Pro",
    tagline: "Capable and clean — built for power users.",
    description:
      "Advanced mode for builders, developers, and analysts: local/cloud/BYOK " +
      "model controls, developer and workspace tools, VisualCore and LucaLink " +
      "controls, and runtime diagnostics — still premium and uncluttered.",
    selectableInOnboarding: true,
  },
  creator: {
    mode: "creator",
    label: "Creator",
    tagline: "Source authority for LucaOS builders.",
    description:
      "Source-authority mode for LucaOS builders/maintainers. Exposes full " +
      "diagnostics, runtime graph, model-router internals, memory audit, " +
      "LucaLink mesh, governed sessions, and approval queues. Not a normal " +
      "onboarding option; Luca still proposes and the Creator approves.",
    selectableInOnboarding: false,
  },
};

/** Visual defaults per mode, aligned to the PR #233 design system. */
export interface ExperienceModeVisualDefaults {
  /** Canonical engine theme id (see `UIThemeId`). */
  canonicalThemeId: UIThemeId;
  /** Product-facing theme name (see `ProductTheme`). */
  productTheme: ProductTheme;
  appearanceMode: AppearanceMode;
  accent: Accent;
  motionStyle: MotionStyle;
  /** Whether cyber/expressive effects are reachable at all in this mode. */
  cyberEffectsAvailable: boolean;
  /** Whether cyber/expressive effects are ON by default (always false today). */
  cyberEffectsDefaultOn: boolean;
  density: ExperienceDensity;
}

const EXPERIENCE_MODE_VISUAL_DEFAULTS: Record<
  LucaExperienceMode,
  ExperienceModeVisualDefaults
> = {
  basic: {
    canonicalThemeId: "PROFESSIONAL", // Luca Silver
    productTheme: "luca-silver",
    appearanceMode: "system",
    accent: "neutral",
    motionStyle: "calm",
    cyberEffectsAvailable: false,
    cyberEffectsDefaultOn: false,
    density: "comfortable",
  },
  pro: {
    canonicalThemeId: "MASTER_SYSTEM", // Luca Graphite
    productTheme: "luca-graphite",
    appearanceMode: "dark",
    accent: "blue",
    motionStyle: "calm",
    cyberEffectsAvailable: false,
    cyberEffectsDefaultOn: false,
    density: "standard",
  },
  creator: {
    canonicalThemeId: "MASTER_SYSTEM", // Luca Graphite
    productTheme: "luca-graphite",
    appearanceMode: "dark",
    accent: "violet",
    motionStyle: "calm",
    cyberEffectsAvailable: true, // available, but still off by default
    cyberEffectsDefaultOn: false,
    density: "dense",
  },
};

/** Type guard for the canonical lowercase mode string. */
export function isExperienceMode(value: unknown): value is LucaExperienceMode {
  return (
    typeof value === "string" &&
    (LUCA_EXPERIENCE_MODES as readonly string[]).includes(value)
  );
}

/** Product-facing label, e.g. `"Basic"`. */
export function getExperienceModeLabel(mode: LucaExperienceMode): string {
  return EXPERIENCE_MODE_INFO[mode].label;
}

/** Full descriptor for a mode. */
export function getExperienceModeInfo(
  mode: LucaExperienceMode,
): ExperienceModeInfo {
  return EXPERIENCE_MODE_INFO[mode];
}

/** Visual defaults for a mode (theme/appearance/accent/density). */
export function getDefaultThemeForExperienceMode(
  mode: LucaExperienceMode,
): ExperienceModeVisualDefaults {
  return EXPERIENCE_MODE_VISUAL_DEFAULTS[mode];
}

/** Modes offered as normal onboarding cards (Creator is intentionally excluded). */
export function getOnboardingSelectableModes(): LucaExperienceMode[] {
  return LUCA_EXPERIENCE_MODES.filter(
    (mode) => EXPERIENCE_MODE_INFO[mode].selectableInOnboarding,
  );
}

/**
 * Map a legacy / internal tier label to an experience mode.
 *
 * Accepts both the conceptual names (Normal / Tactical / Origin) and the
 * existing `LucaAudienceTier` values (public_standard / public_tactical /
 * origin). Unknown input falls back to the calm default, "basic".
 */
export function mapLegacyTierToExperienceMode(
  legacy: string | null | undefined,
): LucaExperienceMode {
  if (!legacy) return "basic";
  switch (legacy.trim().toLowerCase()) {
    case "normal":
    case "public_standard":
    case "standard":
    case "basic":
      return "basic";
    case "tactical":
    case "public_tactical":
    case "pro":
      return "pro";
    case "origin":
    case "creator":
      return "creator";
    default:
      return "basic";
  }
}

/** Experience mode → existing build-layer audience tier. */
export function experienceModeToAudienceTier(
  mode: LucaExperienceMode,
): LucaAudienceTier {
  switch (mode) {
    case "pro":
      return "public_tactical";
    case "creator":
      return "origin";
    case "basic":
    default:
      return "public_standard";
  }
}

/** Existing build-layer audience tier → experience mode. */
export function audienceTierToExperienceMode(
  tier: LucaAudienceTier,
): LucaExperienceMode {
  switch (tier) {
    case "public_tactical":
      return "pro";
    case "origin":
      return "creator";
    case "public_standard":
    default:
      return "basic";
  }
}

/** Bridge an experience mode to the uppercase `Header` `tier` prop (PR #235). */
export function toHeaderTier(mode: LucaExperienceMode): HeaderTier {
  return mode.toUpperCase() as HeaderTier;
}

/** Bridge the uppercase `Header` `tier` prop back to an experience mode. */
export function fromHeaderTier(tier: HeaderTier): LucaExperienceMode {
  return tier.toLowerCase() as LucaExperienceMode;
}

/**
 * Creator-access design contract.
 *
 * Creator must only unlock in trusted source/dev contexts. This describes the
 * signals; computing them from the environment (e.g. `IS_ORIGIN`,
 * `LUCA_AUDIENCE_TIER`, repo markers, creator config/key) is intentionally NOT
 * done here — that wiring, plus any security-sensitive key infrastructure, is
 * deferred to a later PR. `eligible` is the single field UI should gate on.
 */
export interface CreatorAccessState {
  /** Final decision: may Creator mode be shown/selected at all? */
  eligible: boolean;
  /** Running from a source/dev build (e.g. ORIGIN build type). */
  sourceBuild: boolean;
  /** Repository root detected (dev checkout). */
  repoRootDetected: boolean;
  /** A creator config file is present. */
  creatorConfigPresent: boolean;
  /** A trusted creator key/profile is present and validated. */
  trustedCreatorKey: boolean;
  /** Internal/dev build flag set. */
  internalBuild: boolean;
  /** Human-readable explanation of the decision. */
  reason: string;
}

/** Signals used to evaluate Creator eligibility. All optional; default false. */
export type CreatorAccessSignals = Partial<
  Omit<CreatorAccessState, "eligible" | "reason">
>;

/**
 * Pure evaluation of Creator eligibility from trusted signals.
 *
 * A context is eligible when ANY trusted source-authority signal is present.
 * This is deliberately permissive across signal *sources* but still requires
 * at least one genuine trust marker — a normal Basic/Pro user has none.
 */
export function evaluateCreatorAccess(
  signals: CreatorAccessSignals,
): CreatorAccessState {
  const sourceBuild = signals.sourceBuild ?? false;
  const repoRootDetected = signals.repoRootDetected ?? false;
  const creatorConfigPresent = signals.creatorConfigPresent ?? false;
  const trustedCreatorKey = signals.trustedCreatorKey ?? false;
  const internalBuild = signals.internalBuild ?? false;

  const trustMarkers: Array<[boolean, string]> = [
    [sourceBuild, "source build"],
    [internalBuild, "internal build"],
    [trustedCreatorKey, "trusted creator key"],
    [creatorConfigPresent, "creator config present"],
    [repoRootDetected, "repository root detected"],
  ];

  const present = trustMarkers.filter(([on]) => on).map(([, name]) => name);
  const eligible = present.length > 0;

  return {
    eligible,
    sourceBuild,
    repoRootDetected,
    creatorConfigPresent,
    trustedCreatorKey,
    internalBuild,
    reason: eligible
      ? `Creator access granted: ${present.join(", ")}.`
      : "Creator access hidden: no trusted source-authority signals detected.",
  };
}

/**
 * Derive a `CreatorAccessState` from the existing build-layer vocabulary.
 *
 * This is the documented (but not yet auto-wired) bridge to `buildConfig`:
 * a later PR can call this with `{ audienceTier: LUCA_AUDIENCE_TIER,
 * surfaceLayer: LUCA_SURFACE_LAYER }`. Kept pure by taking inputs rather than
 * reading build config directly.
 */
export function deriveCreatorAccessFromBuild(input: {
  audienceTier: LucaAudienceTier;
  surfaceLayer: "origin" | "public";
}): CreatorAccessState {
  const isOrigin =
    input.audienceTier === "origin" || input.surfaceLayer === "origin";
  return evaluateCreatorAccess({
    sourceBuild: isOrigin,
    internalBuild: isOrigin,
  });
}

/** Whether Creator mode should be shown. UI gates on this. */
export function canShowCreatorMode(state: CreatorAccessState): boolean {
  return state.eligible;
}

/**
 * The set of modes a given context may select.
 *
 * Basic and Pro are always available; Creator only when eligible. This is the
 * intended source of truth for both onboarding cards and the Settings switch.
 */
export function getAvailableExperienceModes(
  creatorAccess: CreatorAccessState,
): LucaExperienceMode[] {
  const base: LucaExperienceMode[] = ["basic", "pro"];
  return canShowCreatorMode(creatorAccess) ? [...base, "creator"] : base;
}

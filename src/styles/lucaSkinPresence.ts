import {
  DEFAULT_LUCA_SKIN_ID,
  getLucaSkinDefinition,
  type LucaSkinHostKind,
} from "../config/lucaSkins";

/**
 * Pure presence-token resolver for the LucaOS onboarding "three-state presence"
 * system (ambient blurred face · sharp identity face · voice orb), per
 * `docs/luca-onboarding-presence-visual-language-spec.md`.
 *
 * This layer is intentionally pure and inert: options in, CSS variable map out.
 * It does not import React, write to the DOM, call `setProperty`, mutate
 * `:root`/element styles, or apply any variables. A future presence component
 * scopes these locally; nothing here applies them.
 *
 * Safety/status colors are deliberately excluded. Presence variables only carry
 * ambient/material/accent-glow/orb appearance — never danger, warning, success,
 * info, approval, permission, blocked, voice-live, vision, or stop semantics.
 */

export const LUCA_SKIN_PRESENCE_VARIABLE_NAMES = [
  "--luca-skin-presence-ambient-opacity",
  "--luca-skin-presence-ambient-blend",
  "--luca-skin-presence-ambient-blur",
  "--luca-skin-presence-bloom",
  "--luca-skin-presence-orb",
  "--luca-skin-presence-face-filter",
] as const;

export type LucaSkinPresenceVariableName =
  (typeof LUCA_SKIN_PRESENCE_VARIABLE_NAMES)[number];

export type LucaSkinPresenceVariableMap = Record<
  LucaSkinPresenceVariableName,
  string
>;

export interface LucaSkinPresenceOptions {
  skinId?: unknown;
  hostKind?: LucaSkinHostKind;
  /**
   * Accepted for API symmetry with the other resolvers. Presence variables are
   * static (motion is applied later at the component level under its own
   * reduced-motion gate), so this flag does not change the returned values.
   */
  reducedMotion?: boolean;
  /** When true, glass-like presence depth collapses to solid/matte, zero-blur. */
  reducedTransparency?: boolean;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function toPx(value: number): string {
  const safe = Number.isFinite(value) ? Math.max(0, value) : 0;
  return `${safe}px`;
}

function capBlurPx(value: number, maxBlurPx?: number): number {
  if (!Number.isFinite(value)) return 0;
  const safe = Math.max(0, value);
  return typeof maxBlurPx === "number" && Number.isFinite(maxBlurPx)
    ? Math.min(safe, Math.max(0, maxBlurPx))
    : safe;
}

/**
 * Resolves the selected skin's presence appearance into a local CSS variable
 * map for a future presence component to spread onto its own subtree.
 */
export function getLucaSkinPresenceVariables(
  options: LucaSkinPresenceOptions = {},
): LucaSkinPresenceVariableMap {
  const skin = getLucaSkinDefinition(options.skinId);
  const presence = skin.presenceProfile;
  const hostPolicy = options.hostKind
    ? skin.hostPolicyHints?.[options.hostKind]
    : undefined;

  let ambientBlurPx = capBlurPx(presence.ambientBlurPx, hostPolicy?.maxBlurPx);
  let ambientOpacity = clamp01(presence.ambientOpacity);
  let ambientBlend = presence.ambientBlend;

  // On hosts that prefer solid fallbacks (e.g. mobile-web), keep the ambient
  // presence lighter so it never muddies content or costs performance.
  if (hostPolicy?.preferSolidFallback) {
    ambientBlurPx = Math.min(ambientBlurPx, 12);
    ambientOpacity = Math.min(ambientOpacity, 0.4);
  }

  // Reduced transparency removes blur entirely and softens the ambient layer,
  // and forces a normal (non-screen) blend so the face cannot light-bleed.
  if (options.reducedTransparency) {
    ambientBlurPx = 0;
    ambientOpacity = Math.min(ambientOpacity, 0.3);
    ambientBlend = "normal";
  }

  return {
    "--luca-skin-presence-ambient-opacity": String(ambientOpacity),
    "--luca-skin-presence-ambient-blend": ambientBlend,
    "--luca-skin-presence-ambient-blur": toPx(ambientBlurPx),
    "--luca-skin-presence-bloom": String(clamp01(presence.bloomIntensity)),
    "--luca-skin-presence-orb": presence.orbGradient,
    "--luca-skin-presence-face-filter": presence.faceSharpFilter,
  };
}

export function getDefaultLucaSkinPresenceVariables(): LucaSkinPresenceVariableMap {
  return getLucaSkinPresenceVariables({ skinId: DEFAULT_LUCA_SKIN_ID });
}

export function getLucaSkinPresenceVariableEntries(
  options?: LucaSkinPresenceOptions,
): Array<[LucaSkinPresenceVariableName, string]> {
  const variables = getLucaSkinPresenceVariables(options);
  return LUCA_SKIN_PRESENCE_VARIABLE_NAMES.map((name) => [name, variables[name]]);
}

/** Whether the selected skin's edge bloom should be iridescent (Flow only). */
export function isLucaSkinBloomIridescent(skinId?: unknown): boolean {
  return getLucaSkinDefinition(skinId).presenceProfile.bloomIridescent;
}

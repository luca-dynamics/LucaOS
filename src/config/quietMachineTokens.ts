// Quiet Machine — presence design tokens.
//
// This layers on top of lucaAppearanceTokens.ts (the appearance/theme/accent
// resolver). It does NOT introduce new color theory: presence color is the
// resolved accent, attention borrows the semantic warning token, and dormant is
// a single muted neutral. The job here is to translate an appearance + a
// PresenceIntent into the motion, glow, and scale values the Presence orb and
// edge-light render with — all reduced-motion / high-contrast aware.
//
// North star (docs/design/lucaos-visual-design-system.md): calm by default,
// restraint over decoration, effects invisible until needed.

import type { PresenceIntent } from "../components/presence/presenceIntent";

export interface PresenceMotionTokens {
  /** Resting breathe of the core, ms. */
  breatheMs: number;
  /** Attention pulse, ms. */
  pulseMs: number;
  /** Sparkle rotation (thinking / working), ms. */
  sparkSpinMs: number;
  /** Orbiting accent dot (working only), ms. */
  orbitMs: number;
  /** Concentric ripple cadence (listening), ms. */
  rippleMs: number;
  /** Waveform bar cadence (speaking), ms. */
  waveMs: number;
}

export interface PresenceEdgeTokens {
  /** Edge-light color (matches presence color). */
  color: string;
  /** Outer glow blur in px. */
  blurPx: number;
  /** Resting edge opacity for this intent. */
  opacity: number;
}

export interface PresenceTokens {
  intent: PresenceIntent;
  /** The fill/stroke color for the orb and edge. */
  color: string;
  /** Soft halo color (usually a translucent form of color). */
  glowColor: string;
  /** Idle core scale multiplier (working/speaking sit slightly larger). */
  coreScale: number;
  /** Null when motion is suppressed (reduced motion). */
  motion: PresenceMotionTokens | null;
  edge: PresenceEdgeTokens;
}

export interface ResolvePresenceTokensInput {
  intent: PresenceIntent;
  /** Resolved accent — defaults to the --luca-accent-primary CSS variable. */
  accentPrimary?: string;
  /** Translucent accent halo — defaults to --luca-accent-soft. */
  accentSoft?: string;
  /** Semantic warning color for attention — defaults to --luca-warning. */
  warning?: string;
  /** Muted neutral for a dormant body. */
  dormant?: string;
  reducedMotion?: boolean;
  highContrast?: boolean;
}

export const BASE_MOTION: PresenceMotionTokens = {
  breatheMs: 4500,
  pulseMs: 1200,
  sparkSpinMs: 4000,
  orbitMs: 1300,
  rippleMs: 2100,
  waveMs: 1000,
};

// Per-intent resting edge opacity. Active intents read brighter, dormant nearly
// vanishes. These are resting values; the CSS animation modulates around them.
const EDGE_OPACITY: Record<PresenceIntent, number> = {
  idle: 0.28,
  listening: 0.5,
  thinking: 0.55,
  working: 0.65,
  speaking: 0.55,
  attention: 0.6,
  dormant: 0.12,
};

const CORE_SCALE: Record<PresenceIntent, number> = {
  idle: 1,
  listening: 1,
  thinking: 1,
  working: 1.06,
  speaking: 1.04,
  attention: 1,
  dormant: 0.9,
};

const resolveColor = (
  intent: PresenceIntent,
  input: ResolvePresenceTokensInput,
): string => {
  if (intent === "attention") return input.warning ?? "var(--luca-warning)";
  if (intent === "dormant") {
    return input.dormant ?? "var(--luca-text-tertiary)";
  }
  return input.accentPrimary ?? "var(--luca-accent-primary)";
};

const resolveMotion = (
  intent: PresenceIntent,
  reducedMotion: boolean,
): PresenceMotionTokens | null => {
  if (reducedMotion || intent === "dormant") return null;
  return {
    ...BASE_MOTION,
    // Working spins meaningfully faster than thinking so "acting" reads as
    // busier than "reasoning" at a glance.
    sparkSpinMs: intent === "working" ? 1800 : BASE_MOTION.sparkSpinMs,
  };
};

/**
 * Translate an appearance + intent into the values the Presence renders with.
 * Pure and deterministic — safe to unit test and to call on every render.
 */
export const resolvePresenceTokens = (
  input: ResolvePresenceTokensInput,
): PresenceTokens => {
  const { intent, highContrast = false, reducedMotion = false } = input;
  const color = resolveColor(intent, input);

  // High contrast trades ambient glow for a tighter, more opaque edge so the
  // presence never relies on a soft halo to be perceived.
  const blurPx = highContrast ? 8 : 18;
  const edgeOpacity = highContrast
    ? Math.min(1, EDGE_OPACITY[intent] + 0.2)
    : EDGE_OPACITY[intent];

  return {
    intent,
    color,
    glowColor: input.accentSoft ?? "var(--luca-accent-soft)",
    coreScale: CORE_SCALE[intent],
    motion: resolveMotion(intent, reducedMotion),
    edge: { color, blurPx, opacity: edgeOpacity },
  };
};

/**
 * Inline CSS custom properties for the Presence SVG. Durations are omitted when
 * motion is suppressed so the stylesheet's `prefers-reduced-motion` fallbacks
 * (and the `.lp-static` class) fully take over.
 */
export const presenceCssVariables = (
  tokens: PresenceTokens,
): Record<string, string> => {
  const vars: Record<string, string> = {
    "--pm-color": tokens.color,
    "--pm-glow": tokens.glowColor,
    "--pm-core-scale": tokens.coreScale.toString(),
    "--pm-edge-opacity": tokens.edge.opacity.toString(),
    "--pm-edge-blur": `${tokens.edge.blurPx}px`,
  };
  if (tokens.motion) {
    vars["--pm-breathe"] = `${tokens.motion.breatheMs}ms`;
    vars["--pm-pulse"] = `${tokens.motion.pulseMs}ms`;
    vars["--pm-spark"] = `${tokens.motion.sparkSpinMs}ms`;
    vars["--pm-orbit"] = `${tokens.motion.orbitMs}ms`;
    vars["--pm-ripple"] = `${tokens.motion.rippleMs}ms`;
    vars["--pm-wave"] = `${tokens.motion.waveMs}ms`;
  }
  return vars;
};

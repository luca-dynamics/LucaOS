import type { CSSProperties } from "react";
import { BASE_MOTION } from "../config/quietMachineTokens";

/**
 * The brand-face material role — the "Continuous Dawn" treatment for the
 * official Luca face (public/hologram.png) wherever it appears at focus 1.0
 * (boot + onboarding hero).
 *
 * Centralizing it here closes two audit gaps:
 *  - the face filter was inlined in LucaBootVisualShell with a one-off 6.4s
 *    breath that drifted out of phase with the Presence orb and edge-light;
 *  - there was no named brand-face role, so the treatment couldn't be reused.
 *
 * The face now breathes on the OS-wide cadence (BASE_MOTION.breatheMs) so the
 * face, orb, and edge-light inhale together — one organism, one heartbeat.
 */

/** Single source of truth for the resting breath, shared with the Presence
 *  orb and edge-light. */
export const LUCA_FACE_BREATHE_MS = BASE_MOTION.breatheMs;

/**
 * Neutralize the asset's legacy teal cast to luminous silver and apply a soft,
 * theme-overridable shadow. No cyber glow ring — the dawn light lives behind
 * the face (key light) and at the window edge (EdgePresence), not on the pixels.
 * Override `--luca-face-shadow` per theme if needed.
 */
export const LUCA_FACE_DAWN_FILTER =
  "grayscale(1) brightness(1.12) contrast(1.04) drop-shadow(0 22px 55px var(--luca-face-shadow, rgba(0, 0, 0, 0.55)))";

/** Fade the asset's baked-in smoke/base so the face emerges from darkness. */
export const LUCA_FACE_BASE_FADE =
  "linear-gradient(to bottom, #000 0%, #000 64%, transparent 90%)";

/**
 * Brand-face style for the resolved (focus 1.0) face. Drives the dawn filter,
 * the base-fade mask, and the unified breath from one place.
 *
 * @param markOpacity launch vs supporting emphasis (from the boot identity model)
 */
export const lucaBrandFaceStyle = (markOpacity: number): CSSProperties => ({
  opacity: markOpacity,
  filter: LUCA_FACE_DAWN_FILTER,
  WebkitMaskImage: LUCA_FACE_BASE_FADE,
  maskImage: LUCA_FACE_BASE_FADE,
  transformOrigin: "50% 38%",
  animation: `luca-hologram-breathe ${LUCA_FACE_BREATHE_MS}ms ease-in-out infinite`,
});

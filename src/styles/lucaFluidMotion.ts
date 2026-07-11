import type { Transition } from "framer-motion";

/**
 * Luca's interaction physics for directly manipulated UI.
 *
 * Presence has its own cadence in `lucaPresenceMotion`. This module covers
 * surfaces a user can press, drag, open, close, or redirect. Values are kept
 * here so LucaOS feels like one physical system rather than a collection of
 * unrelated animations.
 */
export const LUCA_FLUID_SPRING = {
  /** Calm, critically damped arrival for panels and sheets. */
  surface: { type: "spring", stiffness: 420, damping: 38, mass: 1 },
  /** Faster response for small controls and anchored popovers. */
  control: { type: "spring", stiffness: 560, damping: 42, mass: 0.72 },
  /** A restrained release response for user-driven movement. */
  gesture: { type: "spring", stiffness: 460, damping: 34, mass: 0.9 },
} as const satisfies Record<string, Transition>;

export const LUCA_PRESS_SCALE = 0.97;

export const LUCA_DRAG_INERTIA = {
  power: 0.18,
  timeConstant: 240,
  bounceStiffness: 460,
  bounceDamping: 38,
} as const;

export interface LucaDragConstraints {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/**
 * Keeps a detached surface inside the visible workspace. Constraint values are
 * relative to the panel's starting transform, matching Framer Motion's drag
 * constraint contract.
 */
export function resolveLucaViewportDragConstraints({
  viewportWidth,
  viewportHeight,
  panelWidth,
  panelHeight,
  originX,
  originY,
  margin = 16,
}: {
  viewportWidth: number;
  viewportHeight: number;
  panelWidth: number;
  panelHeight: number;
  originX: number;
  originY: number;
  margin?: number;
}): LucaDragConstraints {
  const left = margin - originX;
  const top = margin - originY;

  return {
    left,
    right: Math.max(left, viewportWidth - originX - panelWidth - margin),
    top,
    bottom: Math.max(top, viewportHeight - originY - panelHeight - margin),
  };
}

export interface LucaSurfaceMotionState {
  opacity: number;
  scale: number;
  y: number;
}

export type LucaSheetEdge = "bottom" | "top" | "left" | "right";

export function resolveLucaSheetMotion(
  edge: LucaSheetEdge,
  reducedMotion: boolean,
) {
  const offset = reducedMotion ? 0 : 18;
  const axis = edge === "left" || edge === "right" ? "x" : "y";
  const direction = edge === "top" || edge === "left" ? -1 : 1;
  const displaced = { opacity: 0, x: 0, y: 0, [axis]: offset * direction };

  return {
    initial: displaced,
    animate: { opacity: 1, x: 0, y: 0 },
    exit: displaced,
    transition: reducedMotion
      ? ({ duration: 0.12, ease: "easeOut" } as Transition)
      : LUCA_FLUID_SPRING.surface,
  };
}

export function resolveLucaPopoverMotion({
  originX = 0.5,
  originY = 0,
  reducedMotion,
}: {
  originX?: number;
  originY?: number;
  reducedMotion: boolean;
}) {
  return {
    initial: { opacity: 0, scale: reducedMotion ? 1 : 0.96, y: reducedMotion ? 0 : 4 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: reducedMotion ? 1 : 0.97, y: reducedMotion ? 0 : 4 },
    transition: reducedMotion
      ? ({ duration: 0.1, ease: "easeOut" } as Transition)
      : LUCA_FLUID_SPRING.control,
    style: { transformOrigin: `${originX * 100}% ${originY * 100}%` },
  };
}

export function resolveLucaSurfaceMotion(reducedMotion: boolean): {
  initial: LucaSurfaceMotionState;
  animate: LucaSurfaceMotionState;
  exit: LucaSurfaceMotionState;
  transition: Transition;
} {
  if (reducedMotion) {
    return {
      initial: { opacity: 0, scale: 1, y: 0 },
      animate: { opacity: 1, scale: 1, y: 0 },
      exit: { opacity: 0, scale: 1, y: 0 },
      transition: { duration: 0.12, ease: "easeOut" },
    };
  }

  return {
    initial: { opacity: 0, scale: 0.96, y: 10 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.97, y: 8 },
    transition: LUCA_FLUID_SPRING.surface,
  };
}

/** Framer Motion props for instant, reversible press feedback. */
export function resolveLucaPressMotion(reducedMotion: boolean) {
  return reducedMotion
    ? { whileTap: undefined, transition: { duration: 0 } }
    : {
        whileTap: { scale: LUCA_PRESS_SCALE },
        transition: LUCA_FLUID_SPRING.control,
      };
}

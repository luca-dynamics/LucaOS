import React, { useEffect, useState } from "react";

/**
 * LucaOnboardingMotion — calm entrance motion for onboarding presence/screens,
 * per docs/luca-onboarding-presence-visual-language-spec.md ("calm motion,
 * nothing pulses/scans/loops, Flow stays static, reduced motion always wins").
 *
 * It is a single, gentle opacity/translate settle on mount — no loops, no
 * pulsing, no timers beyond one rAF, no parallax. Reduced motion (and Flow,
 * which the caller resolves as reduced) short-circuits to the final, static
 * state with no transition at all.
 *
 * Presentational and inert: a single local mount flag drives a CSS transition
 * on its own wrapper element. It mounts no provider and does not write to
 * document / body / html or call style.setProperty.
 */

export const LUCA_ONBOARDING_MOTION_DURATION_MS = 420;

export interface LucaOnboardingMotionStyleOptions {
  reducedMotion?: boolean;
  /** True once the element has entered (post-mount). */
  active: boolean;
}

export function getLucaOnboardingMotionStyle({
  reducedMotion,
  active,
}: LucaOnboardingMotionStyleOptions): React.CSSProperties {
  if (reducedMotion) {
    // Static: fully visible, no transform, no transition.
    return { opacity: 1 };
  }
  return {
    opacity: active ? 1 : 0,
    transform: active ? "translateY(0)" : "translateY(8px)",
    transition: `opacity ${LUCA_ONBOARDING_MOTION_DURATION_MS}ms ease, transform ${LUCA_ONBOARDING_MOTION_DURATION_MS}ms ease`,
    willChange: "opacity, transform",
  };
}

export interface LucaOnboardingMotionProps {
  reducedMotion?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export const LucaOnboardingMotion: React.FC<LucaOnboardingMotionProps> = ({
  reducedMotion,
  className,
  style,
  children,
}) => {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (reducedMotion) return;
    const id = requestAnimationFrame(() => setActive(true));
    return () => cancelAnimationFrame(id);
  }, [reducedMotion]);

  const motionStyle = getLucaOnboardingMotionStyle({
    reducedMotion,
    active: reducedMotion ? true : active,
  });

  return (
    <div
      data-luca-onboarding-motion={reducedMotion ? "static" : "enter"}
      className={className}
      style={{ ...motionStyle, ...style }}
    >
      {children}
    </div>
  );
};

export default LucaOnboardingMotion;

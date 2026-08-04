export interface OrbAccessibility {
  reducedMotion?: boolean;
  highContrast?: boolean;
  reducedTransparency?: boolean;
  increaseContrast?: boolean;
}

export interface AccessibilityProfile {
  breathingScale: number;
  flowScale: number;
  particleScale: number;
  rippleScale: number;
  contrastBoost: number;
  opacityBoost: number;
}

export function createAccessibilityProfile(options?: OrbAccessibility): AccessibilityProfile {
  const reducedMotion = Boolean(options?.reducedMotion);
  const highContrast = Boolean(options?.highContrast || options?.increaseContrast);
  const reducedTransparency = Boolean(options?.reducedTransparency);

  return {
    breathingScale: reducedMotion ? 0.2 : 1.0,
    flowScale: reducedMotion ? 0.15 : 1.0,
    particleScale: reducedMotion ? 0.0 : 1.0,
    rippleScale: reducedMotion ? 0.0 : 1.0,
    contrastBoost: highContrast ? 1.4 : 1.0,
    opacityBoost: reducedTransparency ? 0.35 : 0.0,
  };
}

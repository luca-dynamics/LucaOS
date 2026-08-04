/**
 * OrbIdentityDNA — The foundational identity specification for Luca's embodiments.
 *
 * Every embodiment of Luca (Living Orb, Hologram Face, Minimal Dot) shares
 * the same underlying DNA traits. Rather than raw magic numbers per profile,
 * visual profiles act upon an active OrbIdentityDNA instance.
 */

export interface ShapeDNA {
  /** Asymmetry ratio 0 (perfect sphere) to 1 (highly organic) */
  organicAsymmetry: number;
  /** Surface tension / elasticity factor */
  surfaceTension: number;
  /** Base scale modifier */
  baseScale: number;
}

export interface MotionDNA {
  /** Natural breathing period in seconds */
  breathingPeriod: number;
  /** Vertical floating float range in CSS pixels */
  floatAmplitude: number;
  /** Surface micro-jitter frequency */
  microJitterFrequency: number;
  /** Lag / damping factor for motion response */
  responsivenessLag: number;
}

export interface HighlightDNA {
  /** Primary hero highlight drift period in seconds */
  driftPeriod: number;
  /** Specular sharpness (exponent factor) */
  specularSharpness: number;
  /** Highlight count */
  highlightCount: number;
}

export interface TimingDNA {
  /** Anticipation overshoot duration in seconds */
  anticipationDuration: number;
  /** Transition settling duration in seconds */
  settleDuration: number;
}

export interface BreathingDNA {
  /** Inhale vs exhale speed ratio (e.g. 1.2 = inhale slightly faster) */
  inhaleRatio: number;
  /** Deep breath amplitude scaling */
  deepBreathScale: number;
}

export interface OrbIdentityDNA {
  id: string;
  name: string;
  shape: ShapeDNA;
  motion: MotionDNA;
  highlight: HighlightDNA;
  timing: TimingDNA;
  breathing: BreathingDNA;
}

/** Standard Luca Default Identity DNA */
export const DEFAULT_LUCA_IDENTITY_DNA: OrbIdentityDNA = {
  id: 'luca-prime',
  name: 'Luca Prime',
  shape: {
    organicAsymmetry: 0.25,
    surfaceTension: 0.85,
    baseScale: 1.0,
  },
  motion: {
    breathingPeriod: 4.2,
    floatAmplitude: 4.0,
    microJitterFrequency: 3.7,
    responsivenessLag: 0.12,
  },
  highlight: {
    driftPeriod: 18.0,
    specularSharpness: 1.0,
    highlightCount: 2,
  },
  timing: {
    anticipationDuration: 0.18,
    settleDuration: 0.45,
  },
  breathing: {
    inhaleRatio: 1.15,
    deepBreathScale: 1.04,
  },
};

/**
 * Industrial Design Tokens — Measurable Physical Optics & Geometry Specification.
 *
 * Rather than generic magic numbers or shader terminology, every physical property
 * of the Living Orb has a formal industrial token name and range.
 */

export interface GeometryDesignTokens {
  /** Upper shoulder curvature radius */
  shoulderRadius: number;
  /** Teardrop bottom gravitational sag */
  gravitySag: number;
  /** Organic shape asymmetry factor */
  organicAsymmetry: number;
  /** Lower base taper ratio */
  baseTaper: number;
  /** Waist width ratio */
  waistRatio: number;
  /** Centroid vertical offset relative to geometric center */
  centerOfMassY: number;
  /** Outer boundary anti-aliasing softness width */
  silhouetteSoftness: number;
  /** Surface normal gradient smoothness */
  normalContinuity: number;
}

export interface OpticalDesignTokens {
  /** Index of Refraction (glass IOR 1.30 – 1.65) */
  ior: number;
  /** Light transmission / transmittance factor */
  transmission: number;
  /** Surface roughness factor */
  roughness: number;
  /** Fresnel reflection strength */
  fresnelPower: number;
  /** Fresnel rim edge thickness width */
  edgeThickness: number;
  /** Subsurface volumetric micro-scattering depth */
  microScattering: number;
  /** Contact shadow softness factor */
  shadowSoftness: number;
  /** Specular falloff profile (0: hard, 1: painterly soft) */
  specularProfile: number;
  /** Volumetric internal light diffusion */
  lightDiffusion: number;
  /** Chromatic dispersion edge tint factor */
  edgeTint: number;
}

export interface LightingDesignTokens {
  /** Key hero light intensity */
  keyIntensity: number;
  /** Key light size ratio */
  keySize: number;
  /** Asymmetrical rim light softness */
  rimSoftness: number;
  /** Environmental bloom radius */
  bloomRadius: number;
  /** Environmental bloom intensity */
  bloomIntensity: number;
  /** Ambient fill light power */
  fillPower: number;
}

export interface CoreDesignTokens {
  /** Inner luminance brightness */
  coreBrightness: number;
  /** Core light radius ratio */
  coreRadius: number;
  /** Vertical suspension depth inside liquid mass */
  suspensionDepth: number;
  /** Volumetric core diffusion radius */
  coreDiffusion: number;
}

export interface BackgroundDesignTokens {
  /** Environmental ripple opacity */
  rippleOpacity: number;
  /** Environmental ripple radius scale */
  rippleRadius: number;
  /** Environmental ripple ring count */
  rippleRingCount: number;
}

export interface MotionDesignTokens {
  /** Natural breathing period in seconds */
  breathingPeriod: number;
  /** Inhale to exhale speed ratio */
  breathingInhaleRatio: number;
  /** Vertical float amplitude in pixels */
  floatAmplitude: number;
  /** Lateral float drift amplitude */
  floatLateralDrift: number;
  /** Subconscious surface micro-tremor frequency (Hz) */
  microTremorFreq: number;
  /** Hero highlight wander rotation speed */
  highlightWanderSpeed: number;
  /** Transition inertia / lag factor */
  motionInertia: number;
}

export interface PerceptionDesignTokens {
  /** Perceived physical mass & weight (1 – 10) */
  perceivedMass: number;
  /** Serene composure & quietness (1 – 10) */
  calmness: number;
  /** Gentle organic warmth (1 – 10) */
  warmth: number;
  /** Delicate liquid surface tension (1 – 10) */
  fragility: number;
  /** Volumetric internal depth (1 – 10) */
  depth: number;
  /** Grounded physical presence (1 – 10) */
  presence: number;
  /** Receptive cognitive focus (1 – 10) */
  attention: number;
  /** Understated quiet confidence (1 – 10) */
  confidence: number;
  /** Non-distracting visual quietness (1 – 10) */
  visualQuietness: number;
  /** Peripheral vision recognition (1 – 10) */
  peripheralVisibility: number;
  /** Inviting human approachability (1 – 10) */
  approachability: number;
}

export interface IndustrialDesignSystem {
  geometry: GeometryDesignTokens;
  optics: OpticalDesignTokens;
  lighting: LightingDesignTokens;
  core: CoreDesignTokens;
  background: BackgroundDesignTokens;
  motion: MotionDesignTokens;
  perception: PerceptionDesignTokens;
}

/** Canonical Production Baseline Industrial Tokens */
export const LUCA_PRODUCTION_INDUSTRIAL_TOKENS: IndustrialDesignSystem = {
  geometry: {
    shoulderRadius: 0.85,
    gravitySag: 0.08,
    organicAsymmetry: 0.25,
    baseTaper: 0.92,
    waistRatio: 0.98,
    centerOfMassY: -0.04,
    silhouetteSoftness: 0.003,
    normalContinuity: 0.95,
  },
  optics: {
    ior: 1.45,
    transmission: 0.92,
    roughness: 0.05,
    fresnelPower: 0.72,
    edgeThickness: 0.12,
    microScattering: 0.60,
    shadowSoftness: 0.25,
    specularProfile: 0.85,
    lightDiffusion: 0.75,
    edgeTint: 0.015,
  },
  lighting: {
    keyIntensity: 0.95,
    keySize: 0.35,
    rimSoftness: 0.65,
    bloomRadius: 0.60,
    bloomIntensity: 0.35,
    fillPower: 0.30,
  },
  core: {
    coreBrightness: 0.85,
    coreRadius: 0.45,
    suspensionDepth: 0.60,
    coreDiffusion: 0.70,
  },
  background: {
    rippleOpacity: 0.25,
    rippleRadius: 1.0,
    rippleRingCount: 3,
  },
  motion: {
    breathingPeriod: 4.2,
    breathingInhaleRatio: 1.15,
    floatAmplitude: 4.0,
    floatLateralDrift: 0.08,
    microTremorFreq: 3.7,
    highlightWanderSpeed: 18.0,
    motionInertia: 0.12,
  },
  perception: {
    perceivedMass: 8.5,
    calmness: 9.4,
    warmth: 8.8,
    fragility: 8.2,
    depth: 9.2,
    presence: 9.5,
    attention: 9.0,
    confidence: 9.2,
    visualQuietness: 9.6,
    peripheralVisibility: 8.9,
    approachability: 9.1,
  },
};

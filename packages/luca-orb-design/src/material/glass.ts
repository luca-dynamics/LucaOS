/**
 * MaterialPhysics & MaterialAppearance — Splitting physics simulation from optical rendering.
 *
 * Physics:
 *   - Elasticity, viscosity, surface tension, density
 * Appearance:
 *   - IOR (Index of Refraction), roughness, metallicity, fresnel, dispersion, transparency, caustics, subsurface
 */

export interface MaterialPhysics {
  /** Surface restoring force 0..1 */
  surfaceTension: number;
  /** Internal resistance to motion deformation 0..1 */
  viscosity: number;
  /** Springiness under displacement 0..1 */
  elasticity: number;
  /** Mass density affecting oscillation frequency */
  density: number;
}

export interface MaterialAppearance {
  /** Index of Refraction (e.g. 1.45 for glass) */
  ior: number;
  /** Surface roughness 0 (smooth mirror) to 1 (frosted) */
  roughness: number;
  /** Metallic sheen factor */
  metallicity: number;
  /** Fresnel reflection strength */
  fresnelStrength: number;
  /** Fresnel power exponent */
  fresnelExponent: number;
  /** Chromatic dispersion / aberration strength */
  dispersion: number;
  /** Overall glass body transparency [0, 1] */
  transparency: number;
  /** Caustic internal reflection brightness */
  caustics: number;
  /** Volumetric subsurface light scattering depth */
  subsurfaceDepth: number;
  /** Edge anti-aliasing softness width */
  edgeSoftness: number;
  /** Specular highlight exponent */
  specularExponent: number;
  /** Specular highlight intensity */
  specularIntensity: number;
}

export const BaseMaterialPhysics: MaterialPhysics = {
  surfaceTension: 0.85,
  viscosity: 0.65,
  elasticity: 0.75,
  density: 1.0,
};

export const BaseMaterialAppearance: MaterialAppearance = {
  ior: 1.45,
  roughness: 0.05,
  metallicity: 0.0,
  fresnelStrength: 0.72,
  fresnelExponent: 3.5,
  dispersion: 0.015,
  transparency: 0.92,
  caustics: 0.40,
  subsurfaceDepth: 0.60,
  edgeSoftness: 0.003,
  specularExponent: 48.0,
  specularIntensity: 0.90,
};

export interface OpticalVolumeMaterial {
  /** Beer-Lambert absorption coefficients; larger values remove more light. */
  absorption: readonly [number, number, number];
  /** Effective path-length multiplier through the volume. */
  opticalDensity: number;
  /** Cool particulate scatter suspended inside the glass. */
  scattering: number;
  /** Strength of the internal thickness caustic. */
  causticStrength: number;
  /** Portion of the host scene visible through the volume. */
  sceneTransmission: number;
  /** Density of the large smoky pearl body suspended inside the shell. */
  pearlDensity: number;
  /** Diffuse silver-blue response of the inner body. */
  pearlScatter: number;
  /** Restrained view-dependent cool/warm colour travel. */
  pearlIridescence: number;
  /** Broad suspended silver haze behind the authored pearl. */
  smokeDensity: number;
  /** Soft vertical light column that gives the pearl its living depth. */
  internalBloom: number;
  /** Strength of the nested silver reflection bands at the glass wall. */
  shellReflectivity: number;
}

/** Optical target derived from the smoky silver-blue master material. */
export const LucaOpticalVolumeMaterial: OpticalVolumeMaterial = {
  absorption: [0.55, 0.34, 0.18],
  opticalDensity: 1.12,
  scattering: 0.42,
  causticStrength: 0.50,
  sceneTransmission: 0.70,
  pearlDensity: 0.80,
  pearlScatter: 0.70,
  pearlIridescence: 0.16,
  smokeDensity: 0.50,
  internalBloom: 0.42,
  shellReflectivity: 0.96,
};

/** Backward-compatible legacy GlassMaterial for shader parameter calculation */
export const GlassMaterial = {
  refractionStrength:  0.08,
  refractionIndex:     1.45,
  fresnelExponent:     3.5,
  fresnelStrength:     0.72,
  transparency:        0.92,
  specularExponent:    48.0,
  specularIntensity:   0.90,
  subsurfaceDepth:     0.60,
  edgeSoftness:        0.003,
  chromaticAberration: 0.015,
};

/** Profile material overrides relative to baseline appearance */
export const GLASS_PROFILE_DELTAS: Record<string, Partial<MaterialAppearance & typeof GlassMaterial>> = {
  idle: {},
  listening: {
    transparency: +0.03,
    specularIntensity: +0.10,
    fresnelStrength: +0.05,
  },
  thinking: {
    transparency: -0.08,
    ior: +0.08,
    refractionIndex: +0.08,
    specularExponent: +16.0,
  },
  speaking: {
    specularIntensity: +0.20,
    fresnelStrength: +0.10,
    subsurfaceDepth: +0.15,
  },
  success: {
    transparency: +0.02,
    specularIntensity: +0.05,
  },
  error: {
    ior: -0.05,
    transparency: -0.10,
  },
  sleeping: {
    transparency: -0.20,
    specularIntensity: -0.40,
    fresnelStrength: -0.25,
  },
};

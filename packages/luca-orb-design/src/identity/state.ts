/**
 * EmbodimentState — Low-level graphic parameters evaluated by OrbDirector for OrbRenderer.
 *
 * The OrbRenderer should be "stupid": it knows nothing about high-level AI states,
 * profiles, or identity concepts. It simply receives an EmbodimentState struct containing
 * raw numerical values (radii, displacements, colors, lighting positions, opacities).
 */
export type OrbProfileName = 'idle' | 'listening' | 'thinking' | 'speaking' | 'success' | 'error' | 'sleeping';
import { PROFILE_COLORS } from '../tokens/colors';
import { GlassMaterial, GLASS_PROFILE_DELTAS } from '../material/glass';
import { LIGHTING_RIGS } from '../material/lighting';
import { OrbDimensions, OrbBlobShape } from '../tokens/dimensions';

export interface EmbodimentState {
  // Geometry & Surface
  orbRadius: number;
  lowFreqAmp: number;
  midFreqAmp: number;
  highFreqAmp: number;
  
  // Material Optics
  refractionStrength: number;
  fresnelExponent: number;
  fresnelStrength: number;
  transparency: number;
  specularExponent: number;
  specularIntensity: number;
  subsurfaceDepth: number;
  edgeSoftness: number;
  chromaticAberration: number;
  
  // Colors (RGB tuples 0..1)
  glassColor: readonly [number, number, number];
  rimColor: readonly [number, number, number];
  coreColor: readonly [number, number, number];
  specularColor: readonly [number, number, number];
  bloomColor: readonly [number, number, number];
  rippleColor: readonly [number, number, number];
  
  // Lighting Rig
  keyLightPos: readonly [number, number];
  keyLightIntensity: number;
  fillLightPos: readonly [number, number];
  fillLightIntensity: number;
  bloomIntensity: number;
  bloomRadius: number;
  
  // Core Glow
  coreIntensity: number;
  coreRadius: number;
  coronaIntensity: number;
  coronaRadius: number;
  
  // Highlights
  keyHighlightSize: number;
  secondaryHighlightSize: number;
  secondaryHighlightIntensity: number;
  
  // Background & Shadow
  shadowOffsetY: number;
  shadowSpreadX: number;
  shadowSpreadY: number;
  shadowOpacity: number;
  rippleOpacity: number;
  rippleCount: number;
  rippleSpacing: number;
}

/** Evaluate high-level profile into pure low-level EmbodimentState */
export function evaluateEmbodimentState(
  profile: OrbProfileName = 'idle',
  radius: number = 0.42,
  blendProgress: number = 1.0
): EmbodimentState {
  const colors = PROFILE_COLORS[profile] ?? PROFILE_COLORS.idle;
  const delta  = GLASS_PROFILE_DELTAS[profile] ?? {};
  const rig    = LIGHTING_RIGS[profile] ?? LIGHTING_RIGS.idle;

  return {
    orbRadius: radius,
    lowFreqAmp: OrbBlobShape.lowFreqAmplitude,
    midFreqAmp: OrbBlobShape.midFreqAmplitude,
    highFreqAmp: OrbBlobShape.highFreqAmplitude,

    refractionStrength: GlassMaterial.refractionStrength + (delta.refractionStrength ?? 0),
    fresnelExponent: GlassMaterial.fresnelExponent + (delta.refractionIndex ?? 0) * 2,
    fresnelStrength: GlassMaterial.fresnelStrength + (delta.fresnelStrength ?? 0),
    transparency: GlassMaterial.transparency + (delta.transparency ?? 0),
    specularExponent: GlassMaterial.specularExponent + (delta.specularExponent ?? 0),
    specularIntensity: GlassMaterial.specularIntensity + (delta.specularIntensity ?? 0),
    subsurfaceDepth: GlassMaterial.subsurfaceDepth + (delta.subsurfaceDepth ?? 0),
    edgeSoftness: GlassMaterial.edgeSoftness,
    chromaticAberration: GlassMaterial.chromaticAberration,

    glassColor: colors.glassColor,
    rimColor: colors.rimColor,
    coreColor: colors.coreColor,
    specularColor: colors.specularColor,
    bloomColor: colors.bloomColor,
    rippleColor: colors.rippleColor,

    keyLightPos: rig.key.position,
    keyLightIntensity: rig.key.intensity,
    fillLightPos: rig.fill.position,
    fillLightIntensity: rig.fill.intensity,
    bloomIntensity: rig.bloom,
    bloomRadius: rig.bloomRadius * OrbDimensions.bloomRadius,

    coreIntensity: 0.58,
    coreRadius: OrbDimensions.coreGlowRatio,
    coronaIntensity: 0.20,
    coronaRadius: OrbDimensions.coreGlowRatio * 1.8,

    keyHighlightSize: OrbDimensions.keyHighlightRatio * 1.1,
    secondaryHighlightSize: OrbDimensions.secondaryHighlightRatio,
    secondaryHighlightIntensity: rig.key.intensity * 0.25,

    shadowOffsetY: OrbDimensions.shadowOffsetY,
    shadowSpreadX: OrbDimensions.shadowSpread * 1.2,
    shadowSpreadY: 0.25,
    shadowOpacity: 0.30,
    rippleOpacity: 0.25,
    rippleCount: OrbDimensions.rippleRingCount,
    rippleSpacing: OrbDimensions.rippleRingSpacing,
  };
}

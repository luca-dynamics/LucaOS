import { NOISE_GLSL } from './noise';
import { CANONICAL_VOLUME_GLSL } from './canonical-volume.glsl';

/** Shared authored shape field used by every geometry-dependent pass. */
export const ORB_SHAPE_GLSL = /* glsl */`
${NOISE_GLSL}
${CANONICAL_VOLUME_GLSL}

float lucaAnimatedVolumeField(
  vec2 p,
  float noiseTime,
  float time,
  float lowFreqAmp,
  float midFreqAmp,
  float highFreqAmp,
  float microJitter,
  float audioEnergy,
  float audioOnset
) {
  float authoredField = lucaCanonicalVolumeField(p);
  vec2 noisePos = p * 1.8 + vec2(noiseTime * 0.7, noiseTime * 0.5);
  float n1 = noise2(noisePos * lowFreqAmp * 28.0) * 2.0 - 1.0;
  vec2 noisePos2 = p * 2.8 + vec2(noiseTime * 1.1, noiseTime * 0.8 + 2.3);
  float n2 = noise2(noisePos2 * midFreqAmp * 120.0 + vec2(3.3, 1.7)) * 2.0 - 1.0;
  float n3 = noise2(p * 8.0 + time * 3.7 + vec2(1.1, 2.2)) * 2.0 - 1.0;
  float identitySafeDeform =
      n1 * lowFreqAmp * 0.22
    + n2 * midFreqAmp * 0.18
    + n3 * highFreqAmp * 0.20
    + audioEnergy * 0.018
    + audioOnset * 0.028
    + microJitter * 0.30 * (noise2(p * 12.0 + time * 4.2) * 2.0 - 1.0);
  return authoredField - identitySafeDeform;
}
`;

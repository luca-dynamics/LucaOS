import { describe, expect, it } from 'vitest';
import {
  CANONICAL_LUCA_VOLUME_V2,
  sampleOrbContour,
  sampleOrbHalfDepth,
  validateCanonicalOrbVolume,
} from '../src/geometry/canonical-volume';

describe('canonical Luca volume V2', () => {
  it('is structurally valid and tied to the product master', () => {
    expect(validateCanonicalOrbVolume(CANONICAL_LUCA_VOLUME_V2)).toEqual([]);
    expect(CANONICAL_LUCA_VOLUME_V2.sourceSha256).toBe(
      '4841901ECD4222760D8E532671DA493066A82CE2CCEE4AC0CA35054AF0CA074A',
    );
  });

  it('preserves the master silhouette proportions', () => {
    const contour = CANONICAL_LUCA_VOLUME_V2.outer;
    const width = sampleOrbContour(contour, 0) + sampleOrbContour(contour, Math.PI);
    const height = sampleOrbContour(contour, Math.PI / 2) + sampleOrbContour(contour, Math.PI * 1.5);

    expect(width / height).toBeGreaterThan(1.12);
    expect(width / height).toBeLessThan(1.3);
  });

  it('keeps the pearlescent lobe inside the outer volume', () => {
    const { innerLobe } = CANONICAL_LUCA_VOLUME_V2;
    expect(Math.max(...innerLobe.axes)).toBeLessThanOrEqual(0.8);
    expect(Math.hypot(...innerLobe.center)).toBeLessThan(0.2);
  });

  it('defines distinct closed front and rear surfaces', () => {
    const { depth } = CANONICAL_LUCA_VOLUME_V2;
    const centerDepth = sampleOrbHalfDepth(depth, 0, [0, 0]);
    const rimDepth = sampleOrbHalfDepth(depth, 1, [1, 0]);

    expect(centerDepth).toBeGreaterThan(0.8);
    expect(rimDepth).toBe(0);
    expect(depth.frontScale).not.toBe(depth.rearScale);
  });
});

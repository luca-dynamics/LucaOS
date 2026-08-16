import { describe, expect, it } from 'vitest';
import {
  CANONICAL_LUCA_VOLUME_V2,
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

  /*
   * Deleted: "preserves the master silhouette proportions", which asserted
   * width / height in 1.12..1.30.
   *
   * It could not discriminate. The authored contour scores 1.184 and the master's
   * actual traced silhouette scores 1.138 — both inside the window — so the test
   * passed for a shape that is RMS 10.8 px away from the reference at its own
   * best-fit rotation, against a stated gate of 2 px. A green check that a wrong
   * shape satisfies is worse than no check, because it reads as coverage.
   *
   * The silhouette is now measured in `src/trace/hero-contour.v1.ts` and tested in
   * `tests/master-contour.test.ts`. The likeness gate belongs on the SDF form,
   * which is authored in the same frozen frame as the trace and can therefore be
   * compared without a fitted placement.
   */

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

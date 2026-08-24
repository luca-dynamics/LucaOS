import { describe, expect, it } from 'vitest';
import {
  LUCA_HERO_ASSEMBLY_V3,
  validateHeroAssembly,
} from '../src/geometry/hero-assembly';

describe('canonical Luca hero assembly V3', () => {
  it('locks one pixel-matched reference frame to the product master', () => {
    const assembly = LUCA_HERO_ASSEMBLY_V3;

    expect(validateHeroAssembly(assembly)).toEqual([]);
    expect(assembly.reference.sourceSize).toEqual([1536, 1024]);
    expect(assembly.reference.cropPixels).toEqual([400, 86, 360, 360]);
    expect(assembly.sourceSha256).toBe(assembly.outerShell.sourceSha256);
  });

  it('authors the three visible overlapping structures independently', () => {
    const surfaces = LUCA_HERO_ASSEMBLY_V3.surfaces;

    expect(surfaces.map(({ kind }) => kind)).toEqual([
      'crown-sheet',
      'lower-fold',
      'reflection-ribbon',
    ]);
    expect(new Set(surfaces.map(({ id }) => id)).size).toBe(surfaces.length);
    expect(surfaces.every(({ controlPoints, widthSamples }) => (
      controlPoints.length === widthSamples.length
    ))).toBe(true);
    expect(surfaces.every(({ material }) => (
      material.thickness > 0
      && material.curvature > 0
      && material.roughness > 0
    ))).toBe(true);
  });

  it('gives the inner pearl independent depth while keeping it suspended', () => {
    const { innerPearl, outerShell } = LUCA_HERO_ASSEMBLY_V3;

    expect(innerPearl.contour).not.toBe(outerShell.innerLobe);
    expect(innerPearl.contour.radiusSamples).not.toEqual(outerShell.innerLobe.radiusSamples);
    expect(innerPearl.depth.maxHalfDepth).toBeLessThan(outerShell.depth.maxHalfDepth);
    expect(innerPearl.depth.frontScale).not.toBe(innerPearl.depth.rearScale);
    expect(innerPearl.contour.center[0]).toBeLessThan(outerShell.innerLobe.center[0]);
    const radii = innerPearl.contour.radiusSamples;
    expect(Math.max(...radii) - Math.min(...radii)).toBeGreaterThan(0.24);
    expect(innerPearl.contour.axes[0]).toBeGreaterThan(innerPearl.contour.axes[1]);
  });

  it('locks the upper-left to lower-right diagonal anatomy', () => {
    const { landmarks } = LUCA_HERO_ASSEMBLY_V3;
    const top = landmarks.find(({ id }) => id === 'silhouette-top')!;
    const bottom = landmarks.find(({ id }) => id === 'silhouette-bottom')!;

    expect(top.point[0]).toBeLessThan(0);
    expect(bottom.point[0]).toBeGreaterThan(0);
    expect(top.point[0]).toBeLessThan(bottom.point[0]);
  });

  it('records pixel tolerances for geometry review without self-certifying', () => {
    const landmarks = LUCA_HERO_ASSEMBLY_V3.landmarks;

    expect(landmarks.filter(({ id }) => id.startsWith('silhouette')).every(({ tolerancePixels }) => (
      tolerancePixels === 2
    ))).toBe(true);
    expect(landmarks.filter(({ id }) => !id.startsWith('silhouette')).every(({ tolerancePixels }) => (
      tolerancePixels === 3
    ))).toBe(true);
  });
});

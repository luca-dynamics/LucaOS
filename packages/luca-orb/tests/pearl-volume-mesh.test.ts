import { describe, expect, it } from 'vitest';
import { LUCA_HERO_ASSEMBLY_V3 } from '@luca/orb-design';
import { buildPearlVolumeMesh } from '../src/living-orb/WebGLPearlDepthPass';

describe('authored pearl volume mesh', () => {
  it('builds independent asymmetric front and rear surfaces', () => {
    const radialRings = 4;
    const angleSegments = 12;
    const mesh = buildPearlVolumeMesh(undefined, radialRings, angleSegments);
    const verticesPerSurface = 1 + radialRings * angleSegments;

    expect(mesh.vertexCount).toBe(verticesPerSurface * 2);
    expect(mesh.vertices[2]).toBeGreaterThan(0);
    expect(mesh.vertices[verticesPerSurface * 4 + 2]).toBeLessThan(0);
  });

  it('uses the dedicated pearl contour instead of the outer shell', () => {
    const mesh = buildPearlVolumeMesh(undefined, 2, 12);
    const pearl = LUCA_HERO_ASSEMBLY_V3.innerPearl;
    const firstRimVertex = 1 + 12;
    const x = mesh.vertices[firstRimVertex * 4];

    expect(x).toBeCloseTo(
      pearl.contour.center[0]
      + pearl.contour.radiusSamples[0] * pearl.contour.axes[0],
      1,
    );
    expect(Math.abs(x)).toBeLessThan(0.9);
  });

  it('closes pearl depth at its authored rim', () => {
    const mesh = buildPearlVolumeMesh(undefined, 3, 12);
    const frontRimStart = 1 + 2 * 12;
    for (let segment = 0; segment < 12; segment += 1) {
      expect(Math.abs(mesh.vertices[(frontRimStart + segment) * 4 + 2])).toBeLessThan(1e-6);
    }
  });
});

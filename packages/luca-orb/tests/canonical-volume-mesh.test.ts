import { describe, expect, it } from 'vitest';
import { buildCanonicalVolumeMesh } from '../src/living-orb/WebGLVolumeDepthPass';
import { buildLoftedVolumeMesh } from '../src/living-orb/WebGLStructureTurntablePass';
import { CANONICAL_LUCA_VOLUME_V2 } from '@luca/orb-design';

describe('canonical hero volume mesh', () => {
  it('builds independent closed front and rear surfaces', () => {
    const radialRings = 4;
    const angleSegments = 12;
    const mesh = buildCanonicalVolumeMesh(undefined, radialRings, angleSegments);
    const verticesPerSurface = 1 + radialRings * angleSegments;
    const trianglesPerSurface = angleSegments + (radialRings - 1) * angleSegments * 2;

    expect(mesh.vertexCount).toBe(verticesPerSurface * 2);
    expect(mesh.triangleCount).toBe(trianglesPerSurface * 2);

    const rearCenterOffset = verticesPerSurface * 4;
    expect(mesh.vertices[2]).toBeGreaterThan(0);
    expect(mesh.vertices[rearCenterOffset + 2]).toBeLessThan(0);
    expect(mesh.vertices[3]).toBe(1);
    expect(mesh.vertices[rearCenterOffset + 3]).toBe(-1);
  });

  it('closes both surfaces to zero depth at the authored rim', () => {
    const radialRings = 3;
    const angleSegments = 12;
    const mesh = buildCanonicalVolumeMesh(undefined, radialRings, angleSegments);
    const verticesPerSurface = 1 + radialRings * angleSegments;
    const frontRimStart = 1 + (radialRings - 1) * angleSegments;
    const rearRimStart = verticesPerSurface + frontRimStart;

    for (let segment = 0; segment < angleSegments; segment += 1) {
      expect(Math.abs(mesh.vertices[(frontRimStart + segment) * 4 + 2])).toBeLessThan(1e-6);
      expect(Math.abs(mesh.vertices[(rearRimStart + segment) * 4 + 2])).toBeLessThan(1e-6);
    }
  });
});

describe('continuous structure turntable mesh', () => {
  it('lofts one shared surface from rear pole through the silhouette to the front pole', () => {
    const latitudeSegments = 12;
    const angleSegments = 24;
    const mesh = buildLoftedVolumeMesh(
      CANONICAL_LUCA_VOLUME_V2.outer,
      CANONICAL_LUCA_VOLUME_V2.depth,
      [1, 1],
      latitudeSegments,
      angleSegments,
    );

    expect(mesh.vertices.length / 3).toBe(2 + (latitudeSegments - 1) * angleSegments);
    expect(mesh.indices.length / 3).toBe((latitudeSegments - 1) * angleSegments * 2);
    expect(Array.from(mesh.vertices).every(Number.isFinite)).toBe(true);
  });
});

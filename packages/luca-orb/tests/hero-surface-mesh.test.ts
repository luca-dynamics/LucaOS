import { describe, expect, it } from 'vitest';
import { LUCA_HERO_ASSEMBLY_V3 } from '@luca/orb-design';
import { buildHeroSurfaceMesh } from '../src/living-orb/WebGLHeroSurfacePass';

describe('authored hero surface mesh', () => {
  it('tessellates every identity surface into one indexed mesh', () => {
    const curveSegments = 8;
    const crossSegments = 6;
    const mesh = buildHeroSurfaceMesh(undefined, curveSegments, crossSegments);
    const surfaceCount = LUCA_HERO_ASSEMBLY_V3.surfaces.length;

    expect(mesh.ranges).toHaveLength(surfaceCount);
    expect(mesh.vertexCount).toBe(surfaceCount * (curveSegments + 1) * (crossSegments + 1));
    expect(mesh.triangleCount).toBe(surfaceCount * curveSegments * crossSegments * 2);
    expect(mesh.ranges.map(({ id }) => id)).toEqual(
      LUCA_HERO_ASSEMBLY_V3.surfaces.map(({ id }) => id),
    );
  });

  it('keeps authored material data in the mesh instead of renderer props', () => {
    const mesh = buildHeroSurfaceMesh(undefined, 4, 4);
    const firstMaterialOffset = 6;
    const firstSurface = LUCA_HERO_ASSEMBLY_V3.surfaces[0];

    expect(Array.from(mesh.vertices.slice(firstMaterialOffset, firstMaterialOffset + 3)))
      .toEqual(firstSurface.material.color.map((value) => expect.closeTo(value, 5)));
    expect(mesh.vertices[firstMaterialOffset + 3]).toBeCloseTo(firstSurface.material.opacity);
    expect(mesh.vertices[12 + 2]).toBeGreaterThan(0.7);
    expect(mesh.vertices[firstMaterialOffset + 9]).toBeCloseTo(firstSurface.material.thickness);
    expect(mesh.vertices.length % 18).toBe(0);
  });

  it('rejects an under-tessellated surface', () => {
    expect(() => buildHeroSurfaceMesh(undefined, 3)).toThrow(/four curve segments/i);
    expect(() => buildHeroSurfaceMesh(undefined, 4, 3)).toThrow(/even cross-section/i);
  });
});

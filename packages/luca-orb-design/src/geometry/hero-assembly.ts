import {
  CANONICAL_LUCA_VOLUME_V2,
  type CanonicalOrbVolume,
  type OrbVolumePoint,
} from './canonical-volume';

export type HeroSurfacePoint = readonly [x: number, y: number, z: number];
export type HeroSurfaceKind = 'crown-sheet' | 'lower-fold' | 'reflection-ribbon';

export interface HeroReferenceFrame {
  readonly sourceSize: readonly [width: number, height: number];
  /** Square source crop containing the canonical hero orb and its aura. */
  readonly cropPixels: readonly [x: number, y: number, width: number, height: number];
  readonly outputSize: number;
  readonly exposure: number;
  readonly focalPointPixels: readonly [x: number, y: number];
}

export interface HeroPearlVolume {
  readonly contour: CanonicalOrbVolume['innerLobe'];
  readonly depth: CanonicalOrbVolume['depth'];
}

export interface HeroSurfaceMaterial {
  readonly color: readonly [red: number, green: number, blue: number];
  readonly opacity: number;
  readonly edgeGain: number;
  readonly centerShade: number;
  /** Optical thickness at the crown of the cross-section, in orb-local units. */
  readonly thickness: number;
  /** Cross-section bow. Zero is planar; one uses the full authored thickness. */
  readonly curvature: number;
  /** Microfacet spread used by the specular response. */
  readonly roughness: number;
}

export interface HeroRibbonSurface {
  readonly id: string;
  readonly kind: HeroSurfaceKind;
  /** Open centerline in normalized orb-local space; positive Y points upward. */
  readonly controlPoints: readonly HeroSurfacePoint[];
  /** Full ribbon width at each control point. */
  readonly widthSamples: readonly number[];
  readonly material: HeroSurfaceMaterial;
}

export interface HeroLandmark {
  readonly id: string;
  readonly point: OrbVolumePoint;
  readonly tolerancePixels: number;
}

export interface LucaHeroAssembly {
  readonly id: string;
  readonly version: 3;
  readonly sourceSha256: string;
  readonly reference: HeroReferenceFrame;
  readonly outerShell: CanonicalOrbVolume;
  readonly innerPearl: HeroPearlVolume;
  readonly surfaces: readonly HeroRibbonSurface[];
  readonly landmarks: readonly HeroLandmark[];
}

const surface = (
  id: string,
  kind: HeroSurfaceKind,
  controlPoints: readonly HeroSurfacePoint[],
  widthSamples: readonly number[],
  material: HeroSurfaceMaterial,
): HeroRibbonSurface => Object.freeze({
  id,
  kind,
  controlPoints: Object.freeze(controlPoints.map((point) => Object.freeze(point))),
  widthSamples: Object.freeze([...widthSamples]),
  material: Object.freeze(material),
});

/**
 * First authored multi-surface assembly traced from the product master.
 *
 * V2 remains the watertight optical shell. V3 adds independent visible
 * structures whose overlap creates the crown, folded lower lip and internal
 * reflection seen in the reference. They are identity geometry, not state FX.
 */
export const LUCA_HERO_ASSEMBLY_V3: LucaHeroAssembly = Object.freeze({
  id: 'luca-living-orb/hero-assembly',
  version: 3,
  sourceSha256: CANONICAL_LUCA_VOLUME_V2.sourceSha256,
  reference: Object.freeze({
    sourceSize: Object.freeze([1536, 1024] as const),
    cropPixels: Object.freeze([400, 86, 360, 360] as const),
    outputSize: 360,
    exposure: 1,
    focalPointPixels: Object.freeze([580, 266] as const),
  }),
  outerShell: CANONICAL_LUCA_VOLUME_V2,
  innerPearl: Object.freeze({
    contour: Object.freeze({
      radiusSamples: Object.freeze([
        0.800, 0.825, 0.885, 0.985,
        1.105, 1.205, 1.240, 1.205,
        1.135, 1.080, 1.105, 1.165,
        1.185, 1.130, 1.030, 0.925,
        0.850, 0.800, 0.770, 0.770,
      ]),
      rotation: -0.18,
      center: Object.freeze([-0.075, -0.025] as const),
      axes: Object.freeze([0.73, 0.62] as const),
    }),
    depth: Object.freeze({
      maxHalfDepth: 0.70,
      radialExponent: 1.46,
      shoulderExponent: 0.68,
      frontScale: 0.88,
      rearScale: 0.62,
      tilt: Object.freeze([-0.13, 0.11] as const),
    }),
  }),
  surfaces: Object.freeze([
    surface(
      'crown-upper-left',
      'crown-sheet',
      [
        [-0.84, 0.29, 0.58],
        [-0.69, 0.61, 0.70],
        [-0.40, 0.86, 0.79],
        [-0.05, 0.82, 0.82],
        [0.29, 0.67, 0.77],
        [0.53, 0.49, 0.67],
        [0.68, 0.29, 0.57],
      ],
      [0.045, 0.085, 0.125, 0.120, 0.090, 0.055, 0.020],
      {
        color: [0.82, 0.88, 0.96],
        opacity: 0.22,
        edgeGain: 0.72,
        centerShade: 0.58,
        thickness: 0.055,
        curvature: 0.64,
        roughness: 0.28,
      },
    ),
    surface(
      'fold-lower-left',
      'lower-fold',
      [
        [-0.70, -0.28, 0.68],
        [-0.58, -0.49, 0.76],
        [-0.36, -0.67, 0.83],
        [-0.04, -0.79, 0.85],
        [0.28, -0.75, 0.80],
        [0.50, -0.58, 0.69],
        [0.60, -0.40, 0.59],
      ],
      [0.022, 0.055, 0.095, 0.115, 0.085, 0.045, 0.018],
      {
        color: [0.68, 0.77, 0.89],
        opacity: 0.29,
        edgeGain: 0.92,
        centerShade: 0.52,
        thickness: 0.078,
        curvature: 0.82,
        roughness: 0.34,
      },
    ),
    surface(
      'ribbon-right-return',
      'reflection-ribbon',
      [
        [0.28, 0.65, 0.88],
        [0.50, 0.52, 0.91],
        [0.68, 0.33, 0.89],
        [0.75, 0.09, 0.85],
        [0.69, -0.13, 0.80],
        [0.57, -0.30, 0.73],
      ],
      [0.008, 0.017, 0.026, 0.024, 0.016, 0.007],
      {
        color: [0.78, 0.88, 1.0],
        opacity: 0.18,
        edgeGain: 1.12,
        centerShade: 0.76,
        thickness: 0.032,
        curvature: 0.54,
        roughness: 0.18,
      },
    ),
  ]),
  landmarks: Object.freeze([
    Object.freeze({ id: 'silhouette-top', point: Object.freeze([-0.31, 0.94] as const), tolerancePixels: 2 }),
    Object.freeze({ id: 'silhouette-right', point: Object.freeze([1.10, 0.05] as const), tolerancePixels: 2 }),
    Object.freeze({ id: 'silhouette-bottom', point: Object.freeze([0.16, -1.05] as const), tolerancePixels: 2 }),
    Object.freeze({ id: 'crown-apex', point: Object.freeze([-0.40, 0.86] as const), tolerancePixels: 3 }),
    Object.freeze({ id: 'fold-apex', point: Object.freeze([-0.10, -0.78] as const), tolerancePixels: 3 }),
    Object.freeze({ id: 'ribbon-turn', point: Object.freeze([0.75, 0.09] as const), tolerancePixels: 3 }),
  ]),
});

/** Structural validation only; visual certification still requires a capture. */
export function validateHeroAssembly(assembly: LucaHeroAssembly): string[] {
  const issues: string[] = [];
  const { reference } = assembly;
  const [sourceWidth, sourceHeight] = reference.sourceSize;
  const [cropX, cropY, cropWidth, cropHeight] = reference.cropPixels;

  if (assembly.sourceSha256 !== assembly.outerShell.sourceSha256) {
    issues.push('assembly and shell must share one canonical source');
  }
  if (cropWidth !== cropHeight || reference.outputSize !== cropWidth) {
    issues.push('hero reference frame must stay pixel-matched and square');
  }
  if (cropX < 0 || cropY < 0 || cropX + cropWidth > sourceWidth || cropY + cropHeight > sourceHeight) {
    issues.push('hero reference crop falls outside the canonical source');
  }

  const kinds = new Set<HeroSurfaceKind>();
  for (const authoredSurface of assembly.surfaces) {
    kinds.add(authoredSurface.kind);
    if (authoredSurface.controlPoints.length < 4) {
      issues.push(`${authoredSurface.id} needs at least four control points`);
    }
    if (authoredSurface.controlPoints.length !== authoredSurface.widthSamples.length) {
      issues.push(`${authoredSurface.id} widths must match its control points`);
    }
    if (authoredSurface.widthSamples.some((width) => width <= 0 || width > 0.3)) {
      issues.push(`${authoredSurface.id} contains an invalid width`);
    }
    if (authoredSurface.controlPoints.some(([x, y, z]) => Math.hypot(x, y) > 1.12 || z < 0 || z > 1)) {
      issues.push(`${authoredSurface.id} falls outside the front shell envelope`);
    }
    const { material } = authoredSurface;
    if (material.opacity <= 0 || material.opacity > 0.65 || material.centerShade < 0 || material.centerShade > 1) {
      issues.push(`${authoredSurface.id} contains an invalid optical material`);
    }
    if (material.thickness <= 0 || material.thickness > 0.16) {
      issues.push(`${authoredSurface.id} contains an invalid optical thickness`);
    }
    if (material.curvature < 0 || material.curvature > 1 || material.roughness < 0.08 || material.roughness > 0.6) {
      issues.push(`${authoredSurface.id} contains an invalid surface response`);
    }
  }

  for (const requiredKind of ['crown-sheet', 'lower-fold', 'reflection-ribbon'] as const) {
    if (!kinds.has(requiredKind)) issues.push(`missing ${requiredKind}`);
  }
  if (assembly.innerPearl.depth.maxHalfDepth <= 0 || assembly.innerPearl.depth.maxHalfDepth >= assembly.outerShell.depth.maxHalfDepth) {
    issues.push('inner pearl must remain shallower than the shell');
  }
  if (assembly.innerPearl.contour.axes.some((axis) => axis <= 0 || axis >= 0.88)) {
    issues.push('inner pearl axes must remain suspended inside the shell');
  }

  return issues;
}

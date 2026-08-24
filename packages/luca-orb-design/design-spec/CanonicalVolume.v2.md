# Luca Living Orb Canonical Volume v2

## Status

**Implementation candidate. Human visual review pending. Not a Golden Master.**

This volume is traced from `references/luca-living-orb-master.png` and supplies stable identity geometry to renderer implementations.

## Geometry

- Outer contour: 32 counter-clockwise radial samples with closed Catmull-Rom interpolation.
- Intended hero proportion: between `1.12` and `1.30` times wider than tall.
- Character: compressed crown, broad right shoulder, and weighted lower lobe.
- Inner lobe: independent 16-sample contour, offset left and down inside an elliptical basis.
- Depth: authored asymmetric front/rear profile, tessellated into 48 radial rings and 128 angular segments for the hero renderer.
- Animation rule: state motion may perturb the sampled contour slightly but must settle back to it.

The TypeScript source of truth is `src/geometry/canonical-volume.ts`. Shader implementations consume a generated compile-time representation; they must not maintain copied contour values.

## What this establishes

- One versioned silhouette across glass, core masking, and highlight masking.
- A distinct structural seam for the pearlescent inner volume.
- Deterministic geometry that can be measured and tested without WebGL.

## What remains

- Human refinement of the contour using split-wipe evidence.
- Human refinement of the front/rear profile using split-wipe evidence.
- Human material review of the optical candidate.
- Tier-specific compact and micro representations.

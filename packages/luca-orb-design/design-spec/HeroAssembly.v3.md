# Luca Living Orb Hero Assembly V3

Status: engineering candidate, not a Golden Master.

## Frozen reference frame

- Source: `references/luca-living-orb-master.png`
- SHA-256: `4841901ECD4222760D8E532671DA493066A82CE2CCEE4AC0CA35054AF0CA074A`
- Source dimensions: 1536 x 1024 px
- Hero evaluation crop: x 400, y 86, width 360, height 360 px
- Evaluation output: 360 x 360 px at exposure 1.0

Changing this frame requires a new assembly version. It must not be adjusted to make a renderer candidate appear closer.

## Authored anatomy

The hero is an assembly, not one smooth blob shader:

1. The V2 watertight outer shell owns silhouette, refraction and optical path length.
2. The suspended pearl owns the broad interior mass, a wider upper-left shoulder, lower-left weight and independent front/rear depth. It is not an alias of the shell's legacy inner-lobe field.
3. The upper-left crown is a wide translucent sheet in front of the pearl.
4. The lower-left fold is a deeper, darker sheet that turns back toward the viewer.
5. The right return is a narrow silver reflection ribbon.

The product-master anatomy runs from an upper-left crown toward a lower-right
fold. Shell landmarks, pearl contour, internal light and overlapping optical
surfaces preserve that diagonal; it is identity geometry, not a state effect.

The three open surfaces are identity geometry. State animation may modulate their energy, but must not change their landmarks or substitute procedural noise for their form.

Each surface also owns its optical thickness, cross-section curvature and microfacet roughness. These values are part of the authored assembly rather than renderer props. The renderer tessellates the open paths across their width so their normals and transmission follow real curved geometry.

## Acceptance gate

- Outer silhouette landmarks: within 2 px at the frozen 360 px frame.
- Crown, fold and ribbon landmarks: within 3 px.
- Material review: human approval against the canonical crop.
- Performance review: actual Electron GPU capture; deterministic SwiftShader is diagnostic only.

Structural validation does not imply visual certification.

## Current implementation evidence

The web renderer now tessellates each open surface into a curved cross-section, derives its front-facing normal field from that profile, computes thickness-dependent transmission and rejects fragments outside the rasterized shell. The shell and independent pearl now share the authored upper-left to lower-right anatomy. This establishes the intended geometry/material seam. The V3 result remains uncertified pending final perceptual matching and human approval.

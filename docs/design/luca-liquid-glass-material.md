# Luca Liquid Glass Material

Liquid glass is Luca's optical finish, not a generic translucent panel. It is
composed over a chromatic substrate so the same intelligence can inhabit an
orb, a face, and a small set of high-value controls without losing its skin.

## Composition contract

1. **Substrate** owns colour, identity, state, and geometry. Examples are the
   liquid presence renderer and the face plasma material.
2. **Optics** add a thin rim, moving glint, restrained dispersion, and—only
   when a matching background texture exists—real WebGL refraction.
3. **Content and interaction** remain above the optics. The glass layer is
   `aria-hidden`, cannot receive pointer events, and never carries safety or
   status meaning.

## Rendering tiers

- **Flagship WebGL:** `LucaWebGLLiquidGlass` accepts a texture that matches the
  pixels behind the surface. It resizes without rebuilding its context, caps
  DPR, pauses while the document is hidden, and disposes all GPU resources.
- **Shared optical layer:** `LucaLiquidGlassLayer` is the inexpensive tier for
  repeated controls and for presence surfaces whose substrate already uses a
  GPU renderer. It reads existing Luca skin and material variables.
- **Fallback:** unsupported WebGL and missing background capture reduce to the
  shared optical layer. Reduced transparency removes blur and uses the solid
  skin surface; reduced motion freezes the glint.

## Adoption rules

- Use `hero` depth for the primary presence body, `standard` for premium
  controls, and `quiet` when the substrate is already visually active.
- Do not apply WebGL per button. A real lens needs a governed matching capture;
  independent canvases would be expensive and optically false.
- Keep focus rings outside the optical layer. Keep danger, warning, approval,
  listening, vision, and stop semantics on their governed status tokens.
- Preserve the host policy: desktop may use full material depth, while web and
  mobile retain capped blur and solid fallbacks through existing variables.

## Current promotion

- The presence orb layers the `hero` optical tier over its chromatic renderer.
- The avatar face uses `lucaFacePlasmaMaterial` and a quiet glass finish; the
  obsolete scanline/grid/glitch hologram material has been retired.
- Voice settings, vision, and termination controls use the shared optical tier
  while keeping their existing semantic colours and actions.

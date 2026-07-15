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
- The avatar face uses `lucaFacePlasmaMaterial` directly on its mesh, with no
  glass lens or circular overlay. The obsolete scanline/grid/glitch hologram
  material has been retired.
- Shared material roles now carry texture without extra component markup:
  panels, cards, rails, and dialogs use the `quiet` optical texture; controls,
  floating panels, popovers, and HUDs use the clearer `standard` texture.
- Dense metrics, tabs, workspace backgrounds, overlays, semantic status colour,
  and the face remain untextured so hierarchy and legibility stay calm.
- Pressable shell and Voice controls use a 140ms `scale(0.97)` response with a
  strong ease-out curve. Hover glint is limited to fine pointers and all
  movement collapses under reduced motion.
- Glass highlights, rims, shadows, and sheens are skin-owned tokens. Light
  skins use accent/graphite edge definition so white surfaces retain depth;
  dark skins retain bright specular highlights and neutral black edge shade.
- Optical polarity is explicit (`materialTone`) rather than inferred from mode
  affinity, so adaptive Flow receives light-surface optics without losing its
  adaptive behavior.
- Detached panels own one backdrop capture; nested composers, headers, and
  cards use textured solid roles so blur is never stacked through the same
  hierarchy.
- The Electron native splash reads a non-sensitive persisted appearance
  snapshot, so the chosen skin is present before React mounts. VisualCore,
  Mini Chat, the phone manager, VoiceHUD, VisionHUD, transient overlays, and
  failure states now join the same role system.
- Legacy shaped `glass-blur` foregrounds receive the skin substrate and
  optical texture through a compatibility bridge. Full-screen scrims, real
  media canvases, and semantic status surfaces are deliberately excluded.

## Whole-interface coverage contract

`src/styles/lucaInterfaceMaterialCoverage.ts` is the product-wide guardrail for
material adoption. It covers the native boot splash, browser post-boot states,
all onboarding screens, desktop and mobile shells, Settings, VoiceHUD, Mini
Chat, the presence widgets, overlays, shared dialogs, and loading/error/empty
states. Each area names its owning files, semantic material roles, optical tier,
skin boundary, and reduced-transparency behavior.

Coverage does not mean equal visual weight. Large structural regions use quiet
texture, small premium controls may use the standard optical tier, mobile keeps
its capped stable material, and semantic status states retain their dedicated
colors. Full matched-background WebGL remains reserved for valid premium
presence optics; it is never multiplied across panels, cards, or buttons.

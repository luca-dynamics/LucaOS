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
- Dense metrics, tabs, workspace backgrounds, overlays, and semantic status
  colour remain optically quiet. The face carries its chrome bands inside the
  mesh shader and never receives a separate texture plate.
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
- The Electron native splash is deliberately fixed to Luca's dark Carbon
  identity. It does not read the saved user skin; skin ownership begins when
  onboarding mounts. VisualCore,
  Mini Chat, the phone manager, VoiceHUD, VisionHUD, transient overlays, and
  failure states now join the same role system. Direct security, profile,
  skills, model, LucaLink, network, remote-control, and agent dialogs use that
  role hierarchy as well instead of fixed dark shells.
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
surfaces; it is never multiplied across panels, cards, or buttons.

## Completed promotion slices

1. **Boot identity boundary:** native boot is fixed to Carbon and never reads
   the saved skin. Skin ownership begins at onboarding.
2. **Light material polarity:** Pearl, Flow, Canvas, and Mist have explicit
   root/elevated/surface separation, graphite/accent rims, grounded shadows,
   and semantic text contrast instead of compounded low-opacity copy.
3. **Optical settings contract:** Light, Refraction, Depth, Dispersion, Frost,
   and Edge falloff are normalized and persisted alongside the metal controls.
4. **Matched-background refraction:** the Appearance material lab displays the
   exact canvas supplied to the lens, so bending and chromatic edges are real,
   not a blur pretending to be refraction.
5. **Renderer governance:** WebGL surfaces measure through `ResizeObserver`,
   cap DPR, render once immediately, pause while hidden/offscreen or under
   reduced motion, log shader failures, recover context, and dispose resources.
6. **Reusable chromatic metal:** a texture-ramp WebGL shader supports orb,
   rounded-rectangle, and capsule masks with sharp chrome bands and RGB split.
7. **Premium composition:** the presence orb layers metal under glass; the face
   integrates metal bands inside its own mesh shader with no circular overlay;
   repeated controls retain the lighter CSS optical tier.
8. **Motion finish and tuning lab:** one flagship Voice control receives the
   slow spectral border flow, frozen under reduced motion. Settings keeps the
   common Refraction/Frost controls visible and the full lab in a disclosure.

SVG turbulence/displacement is not used on product backdrops. Browser support
and backdrop sampling are not reliable enough for Luca's host matrix, and a
turbulence-generated displacement field would not prove that the sampled image
matches the pixels behind a control. The matched WebGL path is the governed
full-refraction tier.
presence optics; it is never multiplied across panels, cards, or buttons.

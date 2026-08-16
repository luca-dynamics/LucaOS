# Luca Living Orb Optical Material v2

## Status

**Implementation candidate. Human visual review pending. Not a Golden Master.**

## Render graph

1. The authored volume is tessellated into independent front and rear hero surfaces and rasterized into an off-screen RGBA16F target, with RGBA8 as the compatibility fallback.
   Half-float linear filtering is enabled only when `OES_texture_float_linear` is present; otherwise the depth target uses nearest sampling.
2. Red and green store front and rear depth; blue and alpha store their respective coverage.
3. The glass pass derives path thickness and the surface normal from those rasterized depths, then samples a pixel-matched host scene.
4. Beer-Lambert absorption removes more red than blue, producing the cool smoky transmission in the master.
5. The broad pearlescent body, vertical living bloom, and silver particulate haze render in a private internal pass, keeping the glass transport program within a conservative hardware shader budget.
6. Suspended scatter, nested shell reflections, an internal caustic band, asymmetrical Fresnel, key light, and fill light are composited with the refracted scene.
7. The authored inner lobe still anchors the additive soul light without defining the material by itself.

## Host interface

`LivingOrb.background?: TexImageSource` is the only new host-facing requirement. The source must represent the pixels directly behind the orb at the same aspect ratio. The renderer does not attempt to capture arbitrary DOM content.

When the source is absent, the module disables scene transmission and renders an honest absorption-and-lighting fallback. It must never label that fallback as refraction.

## Current limitations

- The mesh is an orthographic height-field volume; perspective self-occlusion is not yet required by the frontal product identity.
- Multiple internal scattering is approximated rather than ray marched.
- Environment probes and host-native capture adapters are not implemented.
- Compact and micro representations require separate tuning and evidence.

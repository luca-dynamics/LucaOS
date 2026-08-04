# Rendering Philosophy

The foundational bridge between industrial optical design and GPU graphics engineering for Luca's embodiments.

---

## Core Rendering Principles

1. **Simulating Perception of a Living Optical Object**
   - The renderer does not draw a geometric primitive or particle effect. It simulates human visual perception of a living liquid optical body suspended in physical space.

2. **Refraction Dominates Reflection**
   - Optical refraction of background light through the volume gives the orb its physical weight. Reflection is secondary and subtle.

3. **Depth Before Color**
   - The viewer must perceive volumetric internal depth and light suspension before noticing surface color hue or gradient accents.

4. **Highlights Are Environmental Light**
   - Specular highlights represent real room softbox light sources in a product photography studio, never painted-on 2D decorations or hard Phong dots.

5. **Motion as Cognitive Expression**
   - Animation is not decoration. Every motion shift (breathing, float, micro-tremor, highlight drift) expresses internal cognitive presence and attention.

6. **Physical Plausibility**
   - Every rendered frame must feel physically plausible and tactile, even if shader implementation uses artistic approximations rather than heavy path tracing.

7. **Visual Integrity Over Performance Optimization**
   - Visual quality and optical fidelity are paramount during design freeze. Premature GPU optimizations that sacrifice glass realism are strictly prohibited until after visual freeze approval.

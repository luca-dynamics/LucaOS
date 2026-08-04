# Changelog — Luca Orb Engine (@luca/orb)

All notable changes to the Luca Orb Engine package will be documented in this file.

---

## [1.0.0] - 2026-08-01

### 🎉 Official Initial Release (v1.0.0 Frozen)

The **Luca Orb Engine (`@luca/orb`)** is officially released and frozen as the canonical visual identity subsystem of LucaOS.

#### Highlights
* **GPU-First Rendering Engine**: Hardware-accelerated SkSL & WebGL2 canvas execution driven natively via GPU clock uniforms (`time`). Zero JS-thread animation overhead.
* **Modular Render Graph**: 9 decoupled pass modules (`MaterialEngine`, `NoiseEngine`, `LightingEngine`, `RefractionEngine`, `BloomEngine`, `ParticleEngine`, `RippleEngine`, `AudioEngine`, `CompositeRenderer`).
* **Curl Noise Velocity Advection**: Fluid advection field (`vec2 curlField(vec2 p)`) creating continuous fluid flow without mechanical repetition.
* **3-Point Moving Light Engine**: Dynamic Key Light, Fill Light, and Rim Light sources with underwater water caustics.
* **Double-Edge Glass Rim**: Physical double-edge glass thickness shell (`outerRadius` vs `innerRadius`).
* **ACES Tone Mapping**: Narkowicz ACES filmic curve and thresholded bloom pass.
* **Behavioral Motion Profiles**: Distinct fluid dynamics for all assistant states (`Idle`, `Listening`, `Thinking`, `Speaking`, `Executing`, `Success`, `Error`, `Sleeping`).
* **Orb Personality System**: `Luca Default`, `Creative`, and `Developer` profiles.
* **4 Adaptive Quality Tiers**: Presets for `Ultra` (120Hz), `High` (60Hz), `Medium`, and `Low` (Power Saver).
* **Skin System Contract (`OrbTheme`)**: Stable presentation contract (`glowTint`, `ambientTint`, `bloomScale`, `material`) preserving core identity.
* **Accessibility Support**: Built-in `reducedMotion`, `highContrast`, and `reducedTransparency` profiles in core `RenderContext`.
* **Developer Laboratory Inspector**: Interactive 5-tab inspector panel (`LucaOrbInspector.tsx`).
* **Architectural Documentation**: [`ADR-0001`](./docs/adr/0001-orb-identity.md) and [`orb-usage.md`](./docs/design/orb-usage.md).

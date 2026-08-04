# ADR-0001: Core Principles of the Luca Orb Engine (@luca/orb)

**Version:** 1.0.0  
**Owner:** LucaOS Graphics Architecture  
**Package:** `@luca/orb`  
**Status:** Accepted / Frozen v1.0  

---

## Context
The Luca Orb Engine (`@luca/orb`) powers the signature visual identity of LucaOS across VoiceHUD, onboarding, lock screens, floating assistant surfaces, and desktop widgets.

---

## Decision
The Luca Orb Engine is the canonical visual identity of LucaOS. Its behavior, motion language, fluid dynamics, and interaction semantics are treated as part of the platform identity and are versioned independently from the LucaOS Skin System.

---

## Core Principles

### Principle 1 — Motion is Part of Luca's Identity
Flow language, breathing curves, curl velocity advection, and state transitions belong exclusively to Luca's identity. They can never be altered by theme skins or UI styling.

### Principle 2 — Skins Influence Presentation, Never Behavior
Skins provide presentation parameters (`glowTint`, `ambientTint`, `bloomScale`, `material`) via the `OrbTheme` contract. Skins cannot modify `MotionProfile`, `AnimationGraph`, or flow physics.

### Principle 3 — The Orb Engine Is Unaware of the Skin System
The engine does not query global skin singletons or `SkinManager`. It receives configuration strictly via immutable props (`<LucaOrb theme={orbTheme} />`).

### Principle 4 — Rendering is GPU-Driven
The rendering pipeline is designed to execute on the GPU whenever possible. The JavaScript thread coordinates state changes but does not perform per-frame animation or visual simulation.

### Principle 5 — Accessibility is Part of Rendering
Accessibility (`reducedMotion`, `highContrast`, `reducedTransparency`) is built into the core `RenderContext` and `OrbUniforms`, ensuring graceful degradation across all platforms.

### Principle 6 — State Drives Rendering
Everything flows from assistant state (`Assistant State -> MotionProfile -> AnimationGraph -> RenderContext -> GPU Uniforms -> Shader`). Behavior always dictates how the orb moves.

---

## Frozen Public API (v1.0)
The following public engine APIs are frozen for v1.0:
* `OrbState`
* `OrbMaterial` & `ORB_MATERIALS`
* `OrbTheme` & `validateOrbTheme`
* `MotionProfile` & `MOTION_PROFILES`
* `OrbPersonality` & `ORB_PERSONALITIES`
* `AdaptiveQuality` & `QUALITY_PRESETS`
* `OrbAccessibility` & `createAccessibilityProfile`
* `AnimationGraph`

---

## Consequences

### Benefits
* **Stable Public API**: Immune to unintended breaking changes.
* **Consistent Assistant Identity**: Instantly recognizable as Luca across all skins and devices.
* **Interchangeable Skins**: Designers can build new OS themes without risking engine instability.
* **Platform Portability**: Engine runs identically across Mobile (React Native Skia) and Web/Desktop (WebGL2).

### Trade-offs
* Skins cannot redefine Luca's motion physics or deformation behavior.
* Fundamental motion changes require a new major engine version.
* Identity changes are deliberate platform decisions requiring architectural review.

---

## Future Evolution
Future rendering improvements (v1.1+) should preserve these principles. Changes that alter assistant identity require a new architectural review and constitute a major engine version.

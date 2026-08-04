# Embodiment Principles

Governs the relationship between Luca's cognitive intelligence runtime and presentational avatar embodiments.

---

## Core Principles

1. **Decoupled Identity**
   - Personality, character, and traits are defined in `OrbIdentityDNA`.
   - The conversation engine emits `PresenceVector` and `IntentFrame`.

2. **Multi-Embodiment Support**
   - The top-level `OrbController` routes presence to the active presentational embodiment (`Living Orb`, `Hologram Face`, `Minimal Dot`).
   - The embodiment changes; Luca's identity remains consistent.

3. **Graphic State Decoupling**
   - `OrbDirector` translates presence and DNA into `EmbodimentState`.
   - Renderers (`OrbRenderer`) consume low-level numerical parameters without AI concept leakage.

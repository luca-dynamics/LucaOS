# Technical Specification: Presence Engine Invariants

**Status:** Accepted / Invariant Specification  
**Version:** 1.0.0  
**Owner:** LucaOS Design & Presence Architecture  
**Target Package:** `packages/presence-engine`  

---

## Presence Invariants
1. **State-Derived Presence:** Presence parameters are derived solely from interaction state, cognitive context, and surface profiles.
2. **Read-Only Invariant:** Presence never mutates conversation state, turn lifecycle, or event store.
3. **Deterministic Output:** Presence projections are deterministic for identical input channels.
4. **Appearance Independence:** Theme skins influence rendering appearance only; presence cognitive parameters remain identical across skins.
5. **Timeline Interpolation:** Visual changes are smoothed through time-based lerp interpolation (`PresenceTimeline`).
6. **Complete State Coverage:** Every `InteractionState` maps to a valid `ExpressiveOrbParameters` projection.

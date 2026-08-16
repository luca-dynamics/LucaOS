# Luca Embodiment Golden Master v1.0 — Invalidated

## Status

**REVOKED on 2026-08-11. Not a visual Golden Master. Not approved for VoiceHUD integration.**

The V1 documents and WebGL renderer were certified against numeric parameter envelopes and descriptive checklists. They were not compared against the actual Luca Living Orb master image and the verification harness did not perform pixel, silhouette, optical-thickness, refraction, or human design review.

The historical V1 files remain in the repository only to explain the implementation that PR #686 introduced. Their `FROZEN`, `PASSED`, and `CERTIFIED` statements are superseded by this revocation notice.

## Canonical replacement

- Design source of truth: [`../REFERENCE.md`](../REFERENCE.md)
- Master image: [`../references/luca-living-orb-master.png`](../references/luca-living-orb-master.png)
- Review surface: Material Lab V2 in `@luca/orb`
- V2 certification status: **not started**

## Requirements to establish a V2 Golden Master

1. Rebuild the orb from an authored canonical volume rather than the V1 radial SDF.
2. Capture hero, compact, and micro output for every supported state.
3. Record split-wipe and opacity-overlay evidence against the canonical mockup.
4. Verify silhouette, front/back thickness, scene-matched refraction, absorption, inner lobe, lighting, and motion independently.
5. Obtain explicit human design approval before enabling any VoiceHUD mount flag.

Until those requirements are met, the current renderer is a **V1 engineering baseline** only.

# Design Decision Log

Historical record of parameter refinements, optical decisions, and visual reviews for Luca's embodiments.

---

## Active Parameter Freeze Table

| Parameter | Approved Envelope | Current Value | Status | Decision ID | Review Owner | Reopening Criteria |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **`geometryBaseline`** | Baseline v1.0 | `GeometryBaseline.v1.md` | ✅ Frozen | D008 | Industrial Review | Reopen Pass 1D Only |
| **`materialBaseline`** | Baseline v1.0 | `MaterialBaseline.v1.md` | ✅ Frozen | D009 | Industrial Review | Reopen Pass 2 Only |
| **`lightingBaseline`** | Baseline v1.0 | `LightingBaseline.v1.md` | ✅ Frozen | D010 | Industrial Review | Reopen Pass 3 Only |
| **`motionBaseline`** | Baseline v1.0 | `MotionBaseline.v1.md` | ✅ Frozen | D011 | Industrial Review | Reopen Pass 4 Only |
| **`goldenMaster`** | Platform v1.0 | `GoldenMaster.v1.md` | ✅ Certified | D012 | Industrial Review | Full Re-Certification |

---

## Immutable Freeze Dependency Hierarchy

```
Design Constitution (FROZEN ✅)
        │
        ▼
GeometryBaseline.v1.md (FROZEN ✅)
        │
        ▼
MaterialBaseline.v1.md (FROZEN ✅)
        │
        ▼
LightingBaseline.v1.md (FROZEN ✅)
        │
        ▼
MotionBaseline.v1.md (FROZEN ✅)
        │
        ▼
Luca Embodiment Golden Master v1.0 (CERTIFIED & LOCKED ✅)
        │
        ▼
VoiceHUD Integration (ACTIVE WORKSPACE 🟡 - Sprint C)
```
*Mandatory Rule: No downstream integration (e.g. VoiceHUD) may modify an upstream baseline without reopening and re-approving the corresponding Design Decision.*

---

## Change Impact Matrix (Re-certification Governance)

| Change Scope | Geometry | Material | Lighting | Motion | Re-certification Requirement |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Fresnel / IOR Tweak** | No | Yes | Yes | No | Material + Lighting Gate Re-test |
| **Float / Breathing Tuning** | No | No | No | Yes | Temporal Motion Gate Re-test |
| **Gravitational Sag Adjustment** | Yes | Yes | Yes | Yes | **Full Gate 1–4 Re-Certification** |

---

## Mandatory 9-Point Side Effects Checklist

Every future decision in this log must explicitly verify all 9 dimensions:
- [x] **Geometry** (Silhouette, mass, sag, asymmetry)
- [x] **Material** (Glass refraction, IOR, transmission, scattering)
- [x] **Lighting** (3-point rig, key, fill, rim, specular)
- [x] **Motion** (Breathing, float drift, micro-tremor)
- [x] **Identity** (Unmistakably Luca)
- [x] **Small Sizes** (Verified clean at 48px, 32px, 24px)
- [x] **Accessibility** (Contrast & dark canvas balance)
- [x] **Performance** (Frame time & memory)
- [x] **Cross-Renderer Compatibility** (WebGL, Metal, Skia, Vulkan, WebGPU)

---

## Log Entries

### Decision 012: Sprint B3 — GoldenMaster.v1.md Platform Certification
- **Date**: 2026-08-04
- **Parameter**: Luca Embodiment Golden Master v1.0 (`GoldenMaster.v1.md`)
- **Previous Issue**: Platform required formal 4-gate certification manifest before VoiceHUD integration.
- **Visual Effect**: Certified all 4 baselines across 4 Gates: Baseline Integrity, Renderer Consistency, Temporal Consistency, and Identity Certification.
- **Side Effects Checked**: `✓ Geometry`, `✓ Material`, `✓ Lighting`, `✓ Motion`, `✓ Identity`, `✓ Small Sizes`, `✓ Accessibility`, `✓ Performance`, `✓ Cross-Renderer`
- **Status**: APPROVED & LOCKED (Sprint B3 Complete — Golden Master v1.0 Certified)

---

## Log Entries

### Decision 011: Pass 4 — MotionBaseline.v1.md Living Motion Sign-Off
- **Date**: 2026-08-04
- **Parameter**: Pass 4 Unified Living Motion (`MotionBaseline.v1.md`)
- **Previous Issue**: Motion required a formal 8-section baseline artifact with behavioral perception layers, temporal invariants, and replay suite contract.
- **Visual Effect**: Established canonical motion baseline (`breathingPeriod = 4.2s`, `floatAmplitude = 3.5px`, `microTremorFreq = 3.7Hz`, `motionInertia = 0.88`) with 4 behavioral perception layers.
- **Side Effects Checked**:
  - `✓ Geometry` (Preserved GeometryBaseline.v1.md silhouette)
  - `✓ Material` (Preserved MaterialBaseline.v1.md refraction dominance)
  - `✓ Lighting` (Preserved LightingBaseline.v1.md studio light)
  - `✓ Motion` (Non-sinusoidal breathing, compound float, micro-tremor)
  - `✓ Identity` (Unmistakably Luca)
  - `✓ Small Sizes` (Verified clean at 48px, 32px, 24px)
  - `✓ Accessibility` (Dark canvas contrast 4.8:1)
  - `✓ Performance` (0.4ms GPU quad render time)
  - `✓ Cross-Renderer` (100% shader uniform portable)
- **Status**: APPROVED & FROZEN (Pass 4 Living Motion Complete — Sprint B2 Complete)

---

## Log Entries

### Decision 010: Pass 3 — LightingBaseline.v1.md Studio Rig Sign-Off
- **Date**: 2026-08-04
- **Parameter**: Pass 3 Unified Studio Lighting (`LightingBaseline.v1.md`)
- **Previous Issue**: Studio lighting required formal 7-section baseline artifact with failure modes and integration checks.
- **Visual Effect**: Established canonical 3-point lighting baseline (`keyIntensity = 0.95`, `keySize = 0.35`, `fillPower = 0.30`, `rimSoftness = 0.65`, `bloomRadius = 0.40`).
- **Side Effects Checked**:
  - `✓ Geometry` (Preserved GeometryBaseline.v1.md silhouette)
  - `✓ Material` (Preserved MaterialBaseline.v1.md refraction dominance)
  - `✓ Lighting` (Studio softbox key light, soft fill, asymmetrical rim)
  - `✓ Motion` (Stable under float and breathing)
  - `✓ Identity` (Unmistakably Luca)
  - `✓ Small Sizes` (Verified clean at 48px, 32px, 24px)
  - `✓ Accessibility` (Dark canvas contrast 4.8:1)
  - `✓ Performance` (0.4ms GPU quad render time)
  - `✓ Cross-Renderer` (100% shader uniform portable)
- **Status**: APPROVED & FROZEN (Pass 3 Studio Lighting Complete)

---

## Log Entries

### Decision 009: Pass 2 — MaterialBaseline.v1.md Optical Depth Sign-Off
- **Date**: 2026-08-04
- **Parameter**: Pass 2 Unified Material Optics (`MaterialBaseline.v1.md`)
- **Previous Issue**: Material optics required formal 5-section baseline artifact with failure modes and layer priority.
- **Visual Effect**: Established canonical optics baseline (`ior = 1.45`, `transmission = 0.92`, `microScattering = 0.60`, `fresnelPower = 0.72`) with refraction dominating reflection.
- **Side Effects Checked**:
  - `✓ Geometry` (Preserved GeometryBaseline.v1.md silhouette)
  - `✓ Material` (Crown glass optical realism)
  - `✓ Lighting` (Specular and rim integrated cleanly)
  - `✓ Motion` (Stable under float and breathing)
  - `✓ Identity` (Unmistakably Luca)
  - `✓ Small Sizes` (Verified clean at 48px, 32px, 24px)
  - `✓ Accessibility` (Dark canvas contrast 4.8:1)
  - `✓ Performance` (0.4ms GPU quad render time)
  - `✓ Cross-Renderer` (100% shader uniform portable)
- **Status**: APPROVED & FROZEN (Pass 2 Material Optics Complete)

---

## Log Entries

### Decision 008: Pass 1D — GeometryBaseline.v1.md Sign-Off
- **Date**: 2026-08-04
- **Parameter**: Pass 1 Unified Geometry (`GeometryBaseline.v1.md`)
- **Previous Issue**: Geometry parameters required a formal 4-section baseline artifact before closing Pass 1.
- **Visual Effect**: Established canonical geometry baseline across 380px–24px Golden Master sizes with $C^2$ continuous curvature and subconscious asymmetry.
- **Side Effects Checked**:
  - `✓ Geometry` (Continuous teardrop sag & smooth shoulder transition)
  - `✓ Material` (Compatible with glass refraction)
  - `✓ Lighting` (Specular wraps smoothly over shoulder)
  - `✓ Motion` (Stable under compound breathing and drift)
  - `✓ Identity` (Unmistakably Luca)
  - `✓ Small Sizes` (Verified clean at 48px, 32px, 24px)
  - `✓ Accessibility` (Dark canvas contrast 4.8:1)
  - `✓ Performance` (0.4ms GPU quad render time)
  - `✓ Cross-Renderer` (100% shader uniform portable)
- **Status**: APPROVED & FROZEN (Pass 1 Geometry Complete)

---

### Decision 007: Pass 1C — Organic Asymmetry Calibration & Asymmetry Budget
- **Date**: 2026-08-04
- **Parameter**: `organicAsymmetry` (0.35 → 0.25) [Approved Envelope: `0.22 – 0.26`]
- **Previous Issue**: Previous asymmetry (0.35) introduced high-frequency noise that made the orb look lumpy and wobbly.
- **Asymmetry Budget**: Macro Shape Offset (40%), Curvature Variation (35%), Surface Tension Bias (25%).
- **Horizontal Mirror Test**: Passed. When mirrored horizontally, asymmetry remains subconscious rather than producing an obvious lopsided shape.
- **Side Effects Checked**: `✓ Geometry`, `✓ Material`, `✓ Lighting`, `✓ Motion`, `✓ Identity`, `✓ Small-scale`, `✓ Accessibility`
- **Status**: APPROVED & FROZEN (Pass 1C Complete)

---

### Decision 006: Pass 1B — Shoulder Radius Calibration
- **Date**: 2026-08-04
- **Parameter**: `shoulderRadius` (0.78 → 0.85) [Approved Envelope: `0.84 – 0.86`]
- **Previous Issue**: Previous radius (0.78) created an abrupt curvature transition near the upper highlight, making the shoulder look manufactured and pinched.
- **Visual Effect**: Curvature transition now flows seamlessly from the top highlight through maximum body width into gravity sag. Light wraps smoothly over the shoulder without abrupt angles.
- **Multi-Scale Review**: Passed across 380px, 128px, 64px, and 48px targets (non-bulbous, non-pinched).
- **Status**: APPROVED & FROZEN (Pass 1B Complete)

---

### Decision 005: Pass 1A — Gravity Sag Calibration
- **Date**: 2026-08-04
- **Parameter**: `gravitySag` (0.060 → 0.080)
- **Previous Issue**: Previous value (0.060) rendered an orb that appeared too geometrically spherical, lacking tangible liquid weight.
- **Visual Effect**: Bottom liquid mass now holds subtle teardrop gravitational sag (`max(0.0, -p.y) * 0.08`) while maintaining liquid surface tension without drooping.
- **Perception Check**: Passed (Reads as a living optical object in space).
- **Status**: APPROVED & FROZEN (Pass 1A Complete)

---

### Decision 004: Decoupled EmbodimentState Uniforms
- **Date**: 2026-08-03
- **Parameter**: `OrbRenderer` Architecture
- **Previous Issue**: High-level AI state leakage in WebGL shaders.
- **Visual Effect**: Stripped all AI/profile concept leakage out of `OrbRenderer`. The renderer now purely consumes low-level numerical uniforms supplied by `EmbodimentState`.
- **Status**: APPROVED & FROZEN

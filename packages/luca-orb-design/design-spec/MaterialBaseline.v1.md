# Material Baseline v1.0

The canonical optical material specification artifact for all Luca embodiments and renderers.

---

## 1. Frozen Parameters & Operating Envelopes

| Optical Parameter | Baseline Target | Approved Envelope | Decision ID | Status |
| :--- | :---: | :---: | :---: | :---: |
| **`ior`** (Glass Refraction) | `1.450` | `1.430 – 1.470` | D009 | ✅ Frozen |
| **`transmission`** | `0.920` | `0.900 – 0.940` | D009 | ✅ Frozen |
| **`microScattering`** | `0.600` | `0.550 – 0.650` | D009 | ✅ Frozen |
| **`fresnelPower`** | `0.720` | `0.680 – 0.760` | D009 | ✅ Frozen |

---

## 2. Intended Perception Table

| Optical Parameter | Intended Perceptual Effect |
| :--- | :--- |
| **`ior`** | Refracts background light convincingly like thick optical crown glass rather than thin plastic |
| **`transmission`** | Preserves center transparency so internal core glow illuminates the volume from within |
| **`microScattering`** | Softens internal light diffusion without making the glass appear milky or frosted |
| **`fresnelPower`** | Edge reflectivity separates the orb from dark backgrounds with an asymmetrical soft rim |

---

## 3. Perceptual Layer Groupings & Visual Priority Order

The renderer must satisfy optical requirements in this strict visual authority order:

```
1. Optical Depth (IOR, Transmission, Refraction Strength)
      ↓
2. Glass Authenticity (Micro-Scattering, Absorption, Transparency)
      ↓
3. Surface Reflection (Fresnel, Edge Tint, Roughness)
      ↓
4. Internal Energy (Core Brightness, Subsurface Depth, Diffusion)
```
*Rule: Bloom or highlights must never be used to compensate for insufficient optical depth.*

---

## 4. Optical Failure Modes Matrix

| Parameter | Failure if Too Low | Failure if Too High |
| :--- | :--- | :--- |
| **`ior`** | Reads as cheap matte plastic | Reads as artificial heavy crystal or solid marble |
| **`transmission`** | Reads as an opaque painted sphere | Loses physical mass and looks like an empty bubble |
| **`microScattering`** | Artificially sharp interior boundaries | Milky, cloudy, or frosted glass appearance |
| **`fresnelPower`** | Flat edge boundary with zero separation | Chrome-like metallic sheen or uniform neon ring |
| **`refraction`** | Flat interior with zero liquid depth | Unrealistic, distorted, or broken internal optics |

---

## 5. Reference Invariants

- **Glass Thickness**: Glass always reads thicker than plastic.
- **Subsurface Suspension**: Inner core glow always appears suspended deep inside liquid mass.
- **Refraction Dominance**: Refraction dominates over surface reflection.
- **Non-Metallic Sheen**: Rim reflection never becomes chrome or metallic.
- **Environmental Light**: Specular highlights always read as environmental studio lighting.
- **Non-Opaque Mass**: The orb never appears metallic or fully opaque.

---

## 6. Certification Sign-Off

- **Status**: **APPROVED & FROZEN** (Decision D009)
- **Immutable Governance Rule**: No downstream pass (Lighting Baseline, Motion Baseline) may modify this baseline without reopening a formal Design Decision.

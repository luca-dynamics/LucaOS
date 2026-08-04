# Luca Orb Brand & Usage Guidelines

**Version:** 1.0.0  
**Applies to:** `@luca/orb` v1.x  
**Owner:** LucaOS Design & Graphics Architecture  

---

## 1. Purpose
The Luca Orb is the primary visual embodiment of Luca within LucaOS. This document defines where, how, and when it should be used to ensure a consistent assistant identity across the platform.

---

## 2. Usage Contexts

| Surface | Purpose | Recommended Size |
| :--- | :--- | :--- |
| **VoiceHUD Hero** | Primary conversation interface | 280–320 px |
| **Boot Experience** | System awakening | 240 px |
| **Onboarding** | Welcome and setup | 220–240 px |
| **Lock Screen** | Passive presence | 180–200 px |
| **Floating Assistant** | Quick interactions | 120–160 px |
| **Desktop Widget** | Ambient status | 48–64 px |

---

## 3. Motion Guidelines

| Context | Motion Profile | Description |
| :--- | :--- | :--- |
| **Boot** | Cinematic | Slow awakening, gradual luminescence buildup |
| **VoiceHUD** | Full Expression | State-driven motion (`Idle`, `Listening`, `Thinking`, `Speaking`) |
| **Lock Screen** | Calm | Resting pulse, low energy |
| **Floating Assistant** | Expressive Compact | Quick state transitions |
| **Desktop Widget** | Ambient | Minimal fluid flow |

---

## 4. Layout Rules
* **Minimum Safe Margin:** Keep a minimum 16px safe padding around the orb bounding box.
* **No Clipping:** The orb container must never clip Fresnel edge highlights or ambient glows.
* **Negative Space:** Maintain sufficient negative space around the orb; do not place UI buttons directly over the liquid body.
* **Centering:** Keep the orb visually centered within its interaction viewport.

---

## 5. Background Guidelines

### Preferred Backgrounds
* Translucent Frosted Glass (`backdrop-blur-xl`)
* Soft HSL Gradients
* Dark Translucent Surfaces (`rgba(15, 23, 42, 0.95)`)

### Avoid
* High-frequency busy photography directly behind the orb body
* Competing bright UI highlights touching the rim
* High-contrast text rendered over the orb center

---

## 6. Skin Integration

```text
Skin System ──> OrbTheme ──> LucaOrb
```

**Rule:** Skins provide presentation parameters (`glowTint`, `ambientTint`, `bloomScale`, `material`) via `OrbTheme`. Skins **must not** alter motion physics, breathing curves, or interaction semantics.

---

## 7. Accessibility

* **Reduced Motion:** Disables particles & ripples, scales down curl velocity to `0.15x`.
* **High Contrast:** Boosts Fresnel edge definition (`contrastBoost = 1.4`) and sharpens glass boundaries.
* **Reduced Transparency:** Boosts body opacity (`opacityBoost = 0.35`) for high contrast over wallpaper.

---

## 8. Do / Don't Examples

### DO
* ✅ Center the orb in the hero conversation area.
* ✅ Give the orb breathing room and safe padding.
* ✅ Let interaction state drive motion profile transitions.

### DON'T
* ❌ Stretch, distort, or squash the orb aspect ratio.
* ❌ Overlay buttons directly on top of the liquid core.
* ❌ Alter motion speeds to match an OS theme skin.
* ❌ Use the orb as a generic static icon.

---

## 9. Golden Rules

1. **The orb is Luca's visual identity.**
2. **Motion communicates assistant state.**
3. **Skins influence appearance, never behavior.**
4. **Interaction takes priority over visual spectacle.**
5. **No new rendering features unless they enable a new interaction.**

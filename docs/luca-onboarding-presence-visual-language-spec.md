# LucaOS Onboarding Presence Visual Language Spec

**Type:** Visual language / design specification (documentation-only)
**Status:** Approved direction. No source, runtime, UI, service, skin, asset, or behavior changes are made by this document. Implementation stays paused and staged.
**Date:** 2026-06-24
**Audience:** Founder / product owner and implementers (Codex to implement later in scoped PRs).
**Target PR:** `docs(ui): specify LucaOS onboarding presence visual language`

**Read together with (this spec is the *visual layer* for these):**

- `docs/luca-premium-onboarding-postboot-design.md` — the 8-screen flow, copy, mode-aware structure.
- `docs/luca-premium-onboarding-implementation-plan.md` — the staged onboarding implementation plan.
- `docs/luca-postboot-readiness-bridge-implementation-plan.md` — the post-boot bridge plan.
- `docs/luca-skin-system.md`, `docs/luca-skin-token-architecture-plan.md` — the skin tokens.
- `docs/luca-skin-application-boundaries.md`, `docs/luca-skin-boot-onboarding-plan.md` — application boundaries.
- `docs/foundation/LUCA_ORB_AND_POST_BOOT_VISUAL_SOURCE_AUDIT.md` — the real orb/face asset sources.

> Product direction: **"LucaOS should feel like a quiet operating system for intelligence, not a dashboard for controlling intelligence."**

> Skin framing: **"LucaOS skins are not decorations; they are the visual operating environments for an AI-native OS."**

> **Scope guard.** Specification only. It does not implement UI, edit components/services, change onboarding/boot/Web-Safe-Mode logic, add a resolver or boundary, touch `App.tsx`, or add assets/screenshots. It defines the *visual language* the approved direction should be built to, so the existing flow/copy/screen-map plans render with a consistent, premium look.

---

## 1. Executive summary

The flow, copy, and screen map for premium onboarding already exist (see the design + implementation-plan docs). What was missing is the **visual language**: how LucaOS *looks and feels* on those screens. This spec fixes that.

The approved direction is **presence-led liquid glass**: the user does not fill out a setup wizard — they **meet Luca, an intelligence made of light, and watch it settle onto the device.** It borrows the production discipline of the new-Siri / Apple-Intelligence language (edge-light bloom, liquid glass, iridescent light used sparingly, a living presence) but stays Luca-native and calm — no cyberpunk, no terminal, no Jarvis.

The core construct is a **three-state presence system** built from LucaOS's existing identity assets (the hologram face and the Dictation/VoiceHUD orb), plus an **ambient background technique** that keeps Luca *felt* on every screen, and a **smooth per-skin application** model so Pearl/Carbon/Flow/Canvas all render the same layout beautifully.

This is the visual contract for the staged onboarding implementation; it changes nothing on its own.

---

## 2. The three presence states (one being, three expressions)

Luca is **one being** expressed three ways. Components must treat these as states of a single identity, never as three separate mascots.

| State | What it is | Where it appears | Source |
|---|---|---|---|
| **Ambient** | The hologram face, heavily blurred + low-opacity, used as a background light source behind the glass. Repositioned per screen. | Every step screen (presence felt continuously). | `public/hologram.png` (existing boot identity). |
| **Identity** | The hologram face, sharp and luminous, as the hero. | Welcome, Finish, and any "meet Luca" moment only. | `public/hologram.png`. |
| **Voice / orb** | The liquid-plasma presence orb + waveform. | Voice / listening / dictation moments. | The real Dictation/VoiceHUD canvas orb (per the orb source audit — **not** a static PNG, **not** `icon.png`). |

Rules:

- **Identity is rare.** The sharp face is a bookend (welcome/finish). Overusing it makes the flow feel like a screensaver.
- **Ambient is everywhere but quiet.** It is atmosphere, not a subject.
- **The orb owns voice.** Where speech/listening happens, the orb leads; the face does not need to be present too.
- **Continuity:** the same identity carries from Boot Window → post-boot bridge → onboarding → finish → dashboard. The user meets Luca once and recognizes it throughout.

---

## 3. Ambient background technique (the "presence overlay")

This is the move that makes the surface feel alive (the quality seen in premium AI app showcases) — except the ambient field is *Luca*, not a generic gradient.

**Definition.** A single instance of the hologram face, rendered large, heavily blurred, low-opacity, behind the content/glass layer, positioned differently per screen.

**Parameters (targets, to be tuned in implementation):**

- **Opacity:** ~0.25–0.55. Lower on dense screens, higher on sparse ones.
- **Blur:** heavy (≈30–40px desktop), **capped on mobile** (reuse existing mobile blur caps).
- **Blend:** `screen` on dark skins (Carbon/Flow) so the face becomes pure light; `normal` with a soft drop-shadow on light skins (Pearl/Canvas) so it doesn't wash out.
- **Position rhythm:** vary per screen — e.g. top-right, lower-left, off-center — so it never reads as static wallpaper. One ambient layer per screen, never several.
- **Z-order:** strictly **behind** the content/glass. Body text and controls never sit on the bright lobe of the face.

**Why it works:** presence is felt continuously without competing with the decision; it doubles as the screen's light source, giving depth that flat panels can't.

---

## 4. Liquid glass material

Content lives on **liquid-glass** surfaces — the premium translucent panel.

**Recipe (targets):**

- Background: a soft top-down translucent gradient (lighter at top), e.g. `linear-gradient(135deg, rgba(white,.14), rgba(white,.04))` on dark; the skin's glass token on light.
- Border: 1px hairline at low-to-mid alpha.
- **Specular highlight:** a soft bright streak along the top edge (the "wet glass" tell).
- Blur + saturation: `backdrop-filter: blur(~20px) saturate(1.3)` — **capped on mobile**.
- Inner shadows: `inset 0 1px 0 rgba(white,.5)` top highlight + a subtle bottom inner glow.
- Outer shadow: soft, large, low-opacity for float.

**Discipline:** glass is a *budget*, not a default. One primary glass card per screen; avoid card-in-card. Canvas skin is near-matte (minimal blur). All glass must pass contrast (see §8).

---

## 5. Edge-light bloom (the "presence rim")

The signature "Luca is present/awake" cue, used on the **identity** moments (welcome, finish, voice).

**Recipe (targets):**

- A blurred iridescent ring just inside the surface edge (cool teal→blue→violet with a touch of warm), with a solid darker inner panel so content stays readable.
- Used sparingly: welcome, finish, and the voice/listening surface. **Not** on every step (steps use ambient + soft corner glows instead).
- Tinted per skin (see §7): full iridescence only on Flow; a soft monochrome glow on Pearl/Carbon/Canvas.

---

## 6. Screen rhythm (how the states map to the 8 screens)

The flow (from the design doc) is: 1 Welcome · 2 Environment · 3 Presence · 4 Permission · 5 Memory · 6 Tools · 7 Intelligence route · 8 Finish.

| Screen | Presence state | Backdrop | Notes |
|---|---|---|---|
| 1 · Welcome | **Identity** (sharp face) + edge bloom | Deep "meeting" backdrop | The wow. "Hello, I'm Luca." |
| 2–7 · Choices | **Ambient** (blurred face, repositioned) + liquid-glass card | Calm base + soft corner glows | One decision per screen; small Luca presence chip + step dots. |
| (Voice/presence sub-moments) | **Voice orb** + waveform | Calm base or edge bloom | Where the presence/voice step previews speaking. |
| 8 · Finish | **Identity** (sharp face) + edge bloom (warmer) | Deep backdrop resolving toward chosen skin | "I'm ready." Summary + Enter LucaOS. |

**Bookend principle:** the wow lands at the start and end (identity + bloom); the middle is effortless (ambient + glass + one choice). The deep "meeting" backdrop **resolves into the user's chosen skin** by Enter, so the dashboard feels continuous with the selected environment.

**Presence chip:** during steps 2–7, Luca is a small luminous chip (tiny face, screen/soft-blended) with a short context line ("Luca · choosing how I appear"). It is the receded form of the welcome identity — continuity, not decoration.

---

## 7. Per-skin recipes (smooth skin application)

The same layout renders across **Pearl, Carbon, Flow, Canvas**; only skin tokens change. Skins are CSS variables resolved by the existing registry/bridge — components consume tokens, never raw skin definitions. Switching skin is a **crossfade of variables (~400ms ease), never a re-layout** (reduced-motion → instant).

Per-skin intent for the presence visuals (values are direction, to be finalized against `lucaSkins.ts`):

| Skin | Base | Ambient face | Edge bloom | Orb | Feel |
|---|---|---|---|---|---|
| **Pearl** | Near-white, soft cool | `normal` blend + soft shadow, low opacity | Soft cool monochrome glow (minimal) | Soft cool gradient | Calm bright default. No harsh white, no wash-out. |
| **Carbon** | Graphite/charcoal (not pure black) | `screen` blend, restrained | Restrained cool glow | Cool blue-grey gradient | Professional dark. Not cyberpunk/terminal/neon. |
| **Flow** | Deep luminous | `screen` blend, full | **Full iridescent** edge bloom + liquid glass | Full iridescent (teal→violet→warm) | The showcase ceiling. Still static. |
| **Canvas** | Warm cream | `normal` blend + warm soft shadow, matte | Warm amber soft glow (minimal) | Warm amber gradient | Editorial warm. Matte, near-zero blur, readable. |

Rules:

- **Iridescence is Flow-only.** Pearl/Carbon/Canvas tone the bloom to a soft *monochrome* glow in their own palette — never rainbow, never neon.
- **The orb and ambient glow re-tint together** with the skin accent so the whole environment reads as one.
- **Flow stays static** (no liquid timers/keyframes/parallax) — the look is achieved with static gradients + blur.
- **Reduced transparency** forces matte/solid, zero-blur fallbacks on all skins.

---

## 8. Accessibility & safety (non-negotiable)

- **Contrast first.** Body text and controls sit on the glass/inner panel, never on the bright lobe of the ambient face or the edge bloom. Guarantee WCAG-AA in every skin and state.
- **Status/safety colors are never skin-controlled.** Danger, warning, success, info, approval, permission, blocked, mission, voice-live/listening, vision/screen, and stop semantics keep their meaning and prominence regardless of skin or presence treatment.
- **Reduced motion** disables presence breath, bloom motion, and skin-transition animation (instant swap).
- **Reduced transparency** disables heavy blur → solid/matte surfaces.
- **Mobile** caps blur (reuse existing mobile-safety caps), keeps one ambient layer, bottom-safe CTAs, one decision per screen, and never lets the Web Safe Mode pill block the CTA.
- **Degraded/secure states stay honest** — Web Safe Mode, permission-attention, and route-attention remain semantic and clearly distinct from a "ready" state; presence styling must not make a degraded state look complete.

---

## 9. Motion (for production; static in mockups and Flow)

- **Meet → recede → settle:** on welcome the identity face is large; entering step 1 it gently scales down into the presence chip; at finish it returns, warmer. Slow, eased, ≤1 beat.
- **Presence breath:** a very slow, low-amplitude luminance/scale breath on the identity face and orb. Always reduced-motion-gated.
- **Skin transition:** ~400ms variable crossfade.
- **No** pulsing loops, scanlines, radar, parallax, or fake "thinking" theatrics. Flow's ambient motion remains deferred and static for now.

---

## 10. Asset & component guidance for implementation

- **Face:** reuse the existing `public/hologram.png` identity (same asset as Boot Window). Do **not** introduce a new face asset or use `icon.png` as the presence (it is a logo fallback per the orb source audit).
- **Orb:** reuse the **real** Dictation/VoiceHUD liquid-plasma orb (canvas), not a static image and not a second identity orb beside the face (per `docs/foundation/LUCA_ORB_AND_POST_BOOT_VISUAL_SOURCE_AUDIT.md`).
- **Skins:** consume the existing `--luca-*` skin tokens via the registry/bridge (`lucaSkinRegistry.ts`, `lucaSkinMaterialBridge.ts`); add presence-specific tokens (ambient opacity/blend, bloom intensity, orb gradient) to the skin definitions rather than hardcoding per component.
- **Boundary:** onboarding skin application must still wait for the planned local onboarding skin boundary (no new global provider, no `document.documentElement` mutation) — this spec defines the look that boundary will carry, not the boundary itself.
- **Presence component:** a single `LucaPresence` concept with a `state` prop (`ambient` | `identity` | `voice`) and `skin`/`position` inputs would keep the three states coherent and DRY; exact API is an implementation decision.

---

## 11. How this threads into the existing plan

This spec is **additive** and changes no sequencing. It supplies the visual language for steps already planned elsewhere:

1. Post-boot readiness bridge — applies the calm backdrop + (optional) edge bloom + ambient presence per its own plan.
2. Onboarding copy model + screen map (already typed) — unchanged; this spec says how those screens *look*.
3. Local onboarding skin boundary (planned) — carries the per-skin recipes in §7.
4. Basic-mode onboarding build — implements the screen rhythm in §6 with ambient + glass.
5. Pro/Creator disclosure, web/mobile QA, visual polish, regression — apply §8 guardrails.

No phase order changes; this is the look those phases target.

---

## 12. Acceptance criteria (visual)

- First screen reads as **meeting an advanced intelligence**, not opening a settings form, within one glance.
- Luca is **felt on every screen** (ambient) without competing with the decision.
- The **same layout renders premium across all four skins**; switching skins is a smooth crossfade, not a re-layout.
- Voice/listening uses the **orb**; welcome/finish use the **sharp face**; steps use **ambient + glass**.
- **No** cyberpunk/terminal/Jarvis; **no** neon on Pearl/Carbon/Canvas; Flow iridescence stays tasteful and static.
- All text passes **WCAG-AA**; status/safety states stay semantically intact; reduced-motion/transparency respected; mobile blur capped.

---

## 13. Strict rules

This is a **documentation-only** specification.

This PR does **not**: edit source implementation, components, services, or tests; edit `App.tsx`, boot/post-boot/onboarding/settings UI; touch the skin registry, skin boundary helpers, or Web Safe Mode/secureVault code; change runtime/model-routing/browser/voice/LucaLink/governance; apply skins to onboarding; add a resolver, boundary, or provider; add image assets or screenshots; or edit the README.

### Validation

- **`git diff --check`:** run; result recorded in the PR.
- **Build:** not required (documentation-only).
- **Source/runtime impact:** none — adds one Markdown file under `docs/`.
</content>

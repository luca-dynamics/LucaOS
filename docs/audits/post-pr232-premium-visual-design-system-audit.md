# Post‑PR #232 — LucaOS Premium Visual Design System & Interface Polish Audit

**Date:** 2026-06-08 (UTC)
**Type:** Visual design system / interface polish audit (not architecture)
**Status:** Audit + design-system recommendations + safe minimal fixes only. No shell rewrite, no redesign, no new features, no runtime behavior change.
**Builds on:** `docs/audits/post-pr230-apple-level-ui-interface-audit.md`, `docs/audits/post-pr230-lucaos-architecture-audit.md`, `docs/design/lucaos-interface-principles.md`, `docs/lucaos-theme-system-premium-audit.md` (PR #170).

---

## 1. Executive summary

PR #232 already concluded that the **structure** of LucaOS is directionally correct: the 3‑panel layout, boot sequence, right‑panel operational‑truth model, and the semantic theme/token architecture are sound. This audit does **not** revisit those decisions. It asks a different question:

> **Does LucaOS *visually* feel like a premium Apple/OpenAI/Devin/Cursor‑grade AI operating system, or does it still feel like a prototype, a cyber dashboard, or a developer tool wearing an OS costume?**

**Verdict: LucaOS is roughly 60–65% of the way to premium.** The *foundation* is genuinely premium‑grade — the typed appearance‑token resolver (`src/config/lucaAppearanceTokens.ts`), the four restrained product themes (Silver / Graphite / Frost / Cream), and the separation of *appearance mode* / *product theme* / *accent* are exactly what a high‑end product needs. But the **surface layer has not caught up to the foundation.** The actual screens still carry a large amount of "cyberpunk tactical console" DNA — heavy uppercase, wide letter‑spacing, pervasive monospace, scanline/radar/glitch animations, neon Tailwind colors hardcoded outside the token system, and a fragmented set of glass utilities. The result reads, today, as **a beautifully engineered theme engine driving a developer/hacker UI.**

The single highest‑leverage finding: **the premium token system exists but is not yet enforced.** Components bypass `--luca-*` tokens and use raw Tailwind neon utilities (`text-green-400`, `bg-white/10`), which then require a wall of `!important` overrides in `src/index.css` to look acceptable in light mode. Closing the gap between "we have tokens" and "everything uses tokens" is most of the journey to Apple‑grade.

**This is a polish problem, not an architecture problem.** No shell rewrite is required. What is required is *restraint*: fewer fonts, far less uppercase/tracking/monospace, retirement of the cyber animation layer from default surfaces, one radius/shadow/spacing scale, and migration of components onto the semantic tokens that already exist.

---

## 2. Premium visual diagnosis

What "premium AI OS" means for LucaOS, and where it currently lands:

| Premium quality | Target feel | LucaOS today |
|---|---|---|
| **Calm** | Quiet by default, nothing competes for attention | Mixed — strong token foundation, but noisy type + animation defaults |
| **Coherent** | One visual language across every surface | Weak — components look stitched from different eras/personas |
| **Restrained** | Apple‑grade discipline; effects are invisible until needed | Weak — glow, scanlines, glitch, typewriter, radar still present |
| **Trustworthy** | Reads as system software, not a toy or a hacking tool | Mixed — right panel is honest but visually "tactical/technical" |
| **Legible** | Contrast and hierarchy never in doubt | Mixed — light mode patched via `!important`; uppercase hurts scanability |
| **Branded** | A mark and identity you'd recognize instantly | Emerging — boot mark is restrained; identity diluted by persona remnants |

**Diagnosis in one line:** *LucaOS has a premium engine and a prototype skin.* The skin is the work.

---

## 3. Surface scorecard (1–10)

Scores are **visual‑polish / premium‑feel** scores, not functionality scores. 10 = Apple/OpenAI‑grade.

| # | Surface | Score | One‑line judgment |
|---|---|:---:|---|
| 1 | Global visual identity | **6** | Strong token core; identity diluted by cyber remnants + persona aliases |
| 2 | Theme system | **7** | Best part of the product; architecture is premium, labels/exposure need polish |
| 3 | Component consistency | **5** | No shared primitives; 8 radii, many glass variants, competing treatments |
| 4 | Typography | **4** | 5 font families, pervasive uppercase/tracking/monospace — least Apple‑like area |
| 5 | Spacing / density | **6** | Reasonable but ad‑hoc; no enforced spacing scale; panels run dense |
| 6 | Boot | **7** | Restrained mark + readiness model is good; copy is still a bit "BIOS/diagnostic" |
| 7 | Onboarding | **5** | Functional wizard energy; uppercase/italic/mono + opacity sliders shown too early |
| 8 | Dashboard | **6** | 3‑panel skeleton is right; left panel noisy, right panel reads "technical" |
| 9 | VoiceHUD / VoiceHub | **5** | Capable but game‑like (typewriter, tactical stream, orb); not calm by default |
| 10 | Personal Intelligence | **6** | Trust model is right; still shows too much raw/technical memory data |
| 11 | LucaLink | **6** | Good trust concepts; buried in modals, trust states not visually loud enough |
| 12 | VisualCore / Luca Screen | **6** | Clear controls; casting/permission affordances under‑designed |
| 13 | Mobile | **5** | Reads as squeezed desktop in places; density + tap targets need work |
| 14 | Accessibility | **6** | Good hooks (reducedMotion/Transparency/highContrast) under‑used by components |
| | **Weighted overall** | **≈5.7** | Premium foundation, prototype/tactical surface |

---

## 4. What already feels premium (keep & protect)

- **The appearance‑token resolver** (`src/config/lucaAppearanceTokens.ts`). Typed, semantic, with `reducedMotion`, `reducedTransparency`, and `highContrast` first‑class. This is genuinely Apple/Stripe‑grade architecture.
- **The four product themes.** Silver, Graphite, Frost, Cream are restrained, neutral, and tasteful. The hex/alpha palettes are calm (no neon at the theme level).
- **Separation of concerns**: *appearance mode* (light/dark/system) is already separate from *product theme* is already separate from *accent*. Many products never get this right. LucaOS already has it.
- **Sensible defaults**: default theme Luca Silver, neutral accent, `system` appearance mode, with a first‑run rule that picks Graphite on a dark OS and Silver on a light OS (`resolveFirstRunAppearancePreference`). The default is *not* a loud neon theme — correct instinct.
- **Boot mark restraint**: `lucaBootVisualShellModel.ts` explicitly flags `usesHeavyHologramRuntime: false` and drives a calm "readiness items" model rather than a flashy intro. Good.
- **The interface principles doc** (`docs/design/lucaos-interface-principles.md`) already states the right philosophy ("OS‑level calm, not dashboard noise"). The job is to make the pixels obey the principles.

---

## 5. What feels unpolished

- **No shared component primitives.** There is no `Button`, `Card`, `Modal`, `Input`, `Badge` design‑system layer; components are bespoke per‑file. The only shared "system" pieces are scattered chips (`RuntimeStatusChip`, `SuggestionChips`). This is the root cause of component inconsistency.
- **Radius chaos.** Across `src`, Tailwind radius utilities appear as: `rounded-lg` (~541), `rounded-full` (~485), `rounded-xl` (~459), `rounded-2xl` (~120), `rounded-sm` (~70), `rounded-md` (~56), `rounded-none` (~44), `rounded-3xl` (~15). **Eight radii in heavy use** ≠ one design system.
- **Glass utility sprawl.** `src/index.css` defines `.glass-panel`, `.glass-blur`, `.glass-panel-light`, `.glass-card-light`, `.glass-card-stable`, `.glass-card-stable-light`, `.glass-card-premium` — several with hardcoded rgba and `!important`, not driven by `--luca-*` tokens.
- **Two parallel variable systems.** The premium `--luca-*` semantic tokens coexist with the legacy `--app-*` variables (`--app-text-main`, `--app-bg-tint`, etc.) and raw Tailwind neon classes. Components straddle both.
- **`!important` light‑mode patching.** `src/index.css` lines ~22–50 override `text-green-400`, `bg-white/10`, etc. with `!important` for `.light-mode`. This is a symptom: components use neon Tailwind colors directly instead of semantic status tokens, so light mode has to be force‑corrected globally.

---

## 6. What feels too cyber / hacker / developer‑like

This is the biggest threat to "premium AI OS." Concrete evidence:

**Animation / effect layer (in `src/index.css` and components):**
- `scan-vertical`, `scan-radar`, `scan-slow`, `.animate-scan` — scanline/radar sweeps.
- `.glass-noise` fractal‑grain overlay; `.liquid-border` animated rotating neon‑cyan gradient (default `rgba(6,182,212)`).
- `.tech-border` / `.tech-border-light` — "Futuristic Technical Border" / "Hardened Tactical corners."
- 4px scrollbar explicitly styled "for Technical Feel."

**Cyber/tactical components shipped in `src/components/`:**
`HackingTerminal`, `DarkWebScanner`, `OsintDossier`, `GeoTacticalView`, `GlitchShader`, `ChromaticAberration`, `DataRiver` / `DataRiverBackground`, `GhostCursor`, `NetworkMap`, `CryptoTerminal`, `ForexTerminal`, `PredictionTerminal`, `HolographicCore` / `HolographicCore3D`, `HologramMode`, `HolographicFaceIcon`.

**Voice surface:** `VoiceHud.tsx` ships a `TypewriterText` effect (45ms/char) and a `TacticalStream` — both read as sci‑fi/game UI rather than a calm assistant.

**Typography:** see §7 — the uppercase + wide‑tracking + monospace combination is itself a "tactical console" signal.

> None of this needs deleting in this PR. The recommendation is to **gate the cyber layer behind Creator/Origin mode and turn it OFF by default**, and to **strip the tactical typographic defaults** so the standard product reads as calm system software.

---

## 7. Typography findings

**This is the least Apple‑like area of LucaOS and the highest‑leverage polish target.**

- **Five font families imported** in `src/index.css` line 1: Inter, JetBrains Mono, Outfit, Space Mono, Fraunces. A premium OS uses **one** UI typeface (plus at most one mono for genuine code). Outfit + Fraunces + two monos is a moodboard, not a type system.
- **Pervasive uppercase.** `uppercase` appears ~**985** times across `.tsx`. Apple/OpenAI use sentence case almost everywhere; uppercase is reserved for tiny eyebrow labels.
- **Pervasive letter‑spacing.** `tracking-wide|wider|widest` (plus custom `tracking-[0.16em]`, `tracking-[0.22em]`) appears ~**879** times. Wide tracking on body/labels is a tactical/cyber tell and hurts scanability.
- **Pervasive monospace.** `font-mono` appears ~**737** times — far beyond genuine code/IDs. Monospace numerals and labels make the product feel like a terminal.
- **Onboarding is a microcosm:** `ThemeSelectionStep.tsx` headers use `tracking-[0.16em] uppercase italic`, slider values use `font-mono`, the confirm button uses `uppercase tracking-[0.22em]`. That is the opposite of Apple setup restraint.

**Target:** one sans (Inter is fine), one mono used only for code/hashes/IDs, sentence case everywhere except micro eyebrow labels, default tracking, and a 6‑step type scale (see design system doc).

---

## 8. Spacing findings

- Spacing is applied ad‑hoc with raw Tailwind utilities rather than an enforced scale; there is no spacing‑token contract analogous to the color tokens.
- Panels (especially left tool rail and right operational panel) trend **dense** — closer to a developer console than to macOS System Settings, which breathes.
- Recommendation: adopt a **4px base spacing scale** (4/8/12/16/24/32/48) and a small set of density presets keyed to tier (Basic comfortable, Pro standard, Creator dense) rather than per‑component spacing.

---

## 9. Theme system findings

The theme system is the strongest part of LucaOS. Findings are about **polish and exposure**, not architecture.

- **Contrast/readability:** Dark (Graphite) is strong. Light themes are good *at the token level*, but the `!important` light‑mode overrides in `index.css` reveal that many components still rely on raw neon Tailwind colors. Migrate components to `--luca-success/-danger/-warning/-info` and the `!important` block can eventually be deleted.
- **Glass/blur:** Tasteful at low opacity, but the *number* of glass utilities (7) and the noise/liquid‑border effects push toward "noisy." Consolidate to **two** glass surfaces (panel, card) driven by tokens.
- **Should opacity/blur stay user‑facing?** **No, not as prominent onboarding sliders.** Background opacity (`0.3`) and blur (`40`) are power‑user controls. Keep them in Advanced/Appearance settings; remove them from the onboarding theme step. They currently appear too early (`ThemeSelectionStep.tsx`).
- **Should light/dark be separated from accent theme?** **It already is** (`appearanceMode` vs `productTheme` vs `accent`). The remaining work is to make the *UI* express this clearly: a Light/Dark/System segmented control, a product‑theme picker, and an optional accent picker — three distinct controls, not one fused list.
- **Legacy aliases:** `ASSISTANT`, `AGENTIC_SLATE`, `LUCAGENT`, `RUTHLESS`, `TERMINAL`, `HACKER`, `BUILDER`, `ENGINEER`, `DICTATION` are already flagged `visibility: "legacy"` and `VAPORWAVE` as `"experimental"`. **Keep the compatibility mapping (don't break saved settings), but ensure only the four `"normal"` themes are surfaced in pickers.** `NORMAL_LUCA_THEME_OPTIONS` already does this — verify every picker consumes it. Names like `HACKER`/`RUTHLESS`/`TERMINAL` should never appear in user‑facing copy.
- **Accent usage:** accent palette is restrained; `compatibilityMode: "accent-heavy"` (Vaporwave) multiplies glow ×1.6 — keep that confined to the experimental theme only.

### Recommended default themes by mode

The product spec uses **Basic / Pro / Creator**, but the codebase currently models tiers as **Normal / Tactical / Origin** (`docs/luca-tier-persona-behavior.md`). These map cleanly — and the naming mismatch should itself be reconciled (see §17). Recommended visual defaults:

| Product mode | Code tier | Default theme | Default appearance | Default accent | Rationale |
|---|---|---|---|---|---|
| **Basic** | Normal | **Luca Silver** | System (Silver in light / Graphite in dark) | Neutral | Calmest, most "Apple default," least technical |
| **Pro** | Tactical | **Luca Graphite** | Dark | Blue (low‑saturation) | Focused dark workspace for long operator sessions |
| **Creator** | Origin | **Luca Graphite** | Dark | Violet or custom | Dense, technical; cyber/experimental layer *available but off by default* |

> All three should still default with **cyber effects off, monospace minimized, motion = calm**. Tier changes *density and disclosure*, not *visual loudness*.

---

## 10. Component consistency findings

- **Establish primitives.** Introduce a small `src/shared/ui` primitive set — `Button`, `Card`, `Panel`, `Modal`, `Input`, `Badge`, `Toggle`, `Tabs`, `EmptyState` — all token‑driven. Migrate incrementally; do not rewrite the shell.
- **Collapse radii** to a 4‑value scale (see design system doc): `sm 6px / md 10px / lg 14px / pill 9999px`. Map current 8 radii onto these.
- **Collapse glass** to 2 token‑driven surfaces.
- **Status chips** (`RuntimeStatusChip`, etc.) should be *meaningful* (ready/pending/attention map to `--luca-success/-warning/-danger`) — never decorative. Audit each chip for whether it communicates state or just adds color.
- **Cards** are too noisy where they combine glass + noise + tech‑border + glow simultaneously. One elevation treatment per card.
- **Modals** should share one shell (header, body, footer, close affordance, backdrop blur). LucaLink/VisualCore/Settings modals currently differ.

---

## 11. Boot polish findings

- **Premium, not gimmicky** — the model is restrained (`usesHeavyHologramRuntime: false`, opacity‑driven mark, readiness items). Keep it.
- **Copy is still "BIOS/diagnostic."** Terms like BIOS, KERNEL, "Checking memory banks," "Security protocols," "Visual cortex," "Audio receptors" feel like a tactical boot screen. For **Basic** users, soften to plain language ("Starting up," "Loading your memory," "Preparing voice"). Keep technical subsystem copy for **Creator/Origin**. The boot copy model already supports `standardLabel` vs diagnostic copy — drive it by tier.
- **Progress rhythm** (INIT 32 → BIOS 66 → KERNEL 88 → READY) is fine; consider renaming phases for Basic.
- **Mark quality:** uses `/icon.png` at controlled opacity — acceptable. A bespoke vector mark with a subtle "presence" animation would push it to brand‑grade.

---

## 12. Onboarding polish findings

- Currently reads as a **developer wizard**, not Apple setup. The theme step (`ThemeSelectionStep.tsx`) uses uppercase + italic + wide tracking + monospace slider values, and **exposes background opacity & blur sliders inline** — advanced controls shown far too early.
- **Recommendations (safe, incremental):**
  - Remove opacity/blur sliders from onboarding; move to Appearance settings.
  - Drop uppercase/italic/mono from onboarding type; sentence case, generous spacing.
  - Theme cards should be large visual *previews* (a real swatch of the theme), not text chips.
  - Reduce text density; one idea per card.
  - Defer advanced model/hardware/provisioning panels behind "Set up later / Advanced."
  - Emotional attachment to Luca should come from warmth and a calm reveal, not from sci‑fi face/hologram surfaces shown by default.

---

## 13. Dashboard polish findings

- **3‑panel skeleton is correct** (confirmed by PR #232). Center should dominate; it mostly does.
- **Left panel is noisy** — too many tools visible at once for Basic. Honor Principle 4: only "Core" expands by default; advanced/cyber tool groups collapsed or hidden by tier.
- **Right panel reads "technical."** It is honest (good) but visually tactical (mono, uppercase, dense rows). Keep the truth; soften the typography and spacing so it reads as trustworthy system status rather than a debug console. Basic users should see friendly summaries; raw logs are a Creator/Origin disclosure.
- **Header** should anchor identity more strongly (consistent mark + calm system status), not compete with panel chrome.
- **Panel transitions/resizers**: keep restrained; ensure `reducedMotion` disables any non‑essential transition.

---

## 14. VoiceHUD / VoiceHub polish findings

- Capable but **game‑like by default**: `TypewriterText` (45ms/char), `TacticalStream`, `VoiceStatusOrb`, optional hologram/face.
- **Hologram/face should be OFF by default** for all tiers; opt‑in only (likely Creator). It is the strongest "toy/sci‑fi" signal in the product.
- **Voice visualizer**: keep a single calm orb/waveform; drop the typewriter effect for Basic (it reads as a chatbot gimmick) — show transcript directly.
- **Tier behavior:** Basic = minimal full‑screen voice (orb + transcript + stop). Pro = adds live telemetry/model label. Creator = adds tactical stream / advanced visualizers.

---

## 15. Personal Intelligence polish findings

- Trust model is right (source, timestamp, delete per Principle 6). Visually it still leans **raw/technical**.
- Memory should be presented as friendly "What Luca knows about you" cards for Basic, with the **raw graph and approval trails reserved for Creator/Origin**.
- Reduce technical jargon ("intent," "provenance," "sync lane") from Basic surfaces.
- Memory cards: warmer, human, one fact per card with clear source + delete; avoid monospace and dense tables in Basic.

---

## 16. LucaLink polish findings

- Good trust concepts (verified/pending/untrusted), but **buried in modals** and trust states aren't visually loud enough.
- Target the AirDrop/Handoff bar: a calm device list with **unmistakable** trust badges and a clear approve/deny affordance.
- Trust states should use semantic status tokens (success/warning/danger), not decorative neon.
- Tiering: Basic = simple connect/disconnect + trust badge. Pro = sync/connection detail. Creator/Origin = full permission matrix.

---

## 17. VisualCore / Luca Screen polish findings

- Casting/session controls (`CastPicker`, `DesktopStreamModal`, `MobileCastReceiver`) are functional but under‑designed; capture/permission affordances must be **obvious** (a clear "you are sharing your screen" indicator).
- Session status cards should share the standard card primitive and use status tokens.
- Longer term, VisualCore could become a center‑panel workspace *mode* (consistent with Principle 2) rather than a modal — but that is a redesign, out of scope for this PR.

---

## 18. Mobile polish findings

- Reads as **squeezed desktop** in places (`src/styles/lucaMobileShellStyles.ts`, `src/mobile/`). Density and tap targets need native attention.
- Tabs should be thumb‑friendly (≥44px targets); typography readable without zoom; panels less dense than desktop.
- Basic mobile should show fewer surfaces than Pro; Creator on mobile should be deliberately constrained (mobile is not where dense Creator tooling belongs).

---

## 19. Accessibility findings

- **Good foundation, under‑used.** The token system already carries `reducedMotion`, `reducedTransparency`, `highContrast`, and `borderSubtle/Strong` switch under high contrast. The gap is *adoption*: cyber animations and raw neon colors bypass these controls.
- **Contrast:** light mode currently depends on `!important` overrides; migrating to semantic status tokens makes contrast reliable instead of patched.
- **Focus states:** need a single, consistent, visible focus ring primitive (token‑driven) across all interactive elements.
- **Motion:** `scan`, `liquid-rotate`, `glitch`, typewriter, and pulse animations must all respect `reducedMotion`. Audit each.
- **Touch targets / aria:** ensure ≥44px targets and aria‑labels on icon‑only buttons (onboarding already does this well — replicate the pattern).
- **Color meaning:** never encode state in color alone; pair status color with icon/label (chips already trend this way — enforce it).

---

## 20. Recommended visual design rules (summary — full version in design system doc)

1. **One UI typeface** (Inter). One mono, code/IDs only. Sentence case. Default tracking. Uppercase only for tiny eyebrow labels.
2. **Tokens are law.** Every color/surface/border/shadow comes from `--luca-*`. No raw neon Tailwind colors in components. No new `!important`.
3. **One radius scale, one shadow scale, one spacing scale.**
4. **Two glass surfaces** (panel, card), token‑driven. No noise/liquid‑border/scanline on default surfaces.
5. **Calm motion by default**; everything respects `reducedMotion`.
6. **Cyber/tactical effects are opt‑in** (Creator/Origin), off by default.
7. **Tier changes density & disclosure, not loudness.**
8. **Status color is semantic and always paired with icon/label.**

---

## 21. Immediate safe polish fixes (this PR / low‑risk)

These are safe, obvious, non‑behavioral and can land now or in a tightly‑scoped follow‑up:

- Ensure **all theme pickers consume `NORMAL_LUCA_THEME_OPTIONS`** so legacy/experimental names (`HACKER`, `RUTHLESS`, `TERMINAL`, `VAPORWAVE`, …) never appear in user‑facing copy. (Mapping stays for saved settings.)
- **Remove background opacity/blur sliders from onboarding** (`ThemeSelectionStep.tsx`); they belong in Appearance settings.
- **De‑tactical onboarding type**: drop `uppercase italic tracking-[0.16em]` / `tracking-[0.22em]` and `font-mono` slider labels in onboarding to sentence case + default tracking.
- Audit icon‑only buttons for missing `aria-label`s (replicate the existing onboarding pattern).
- Clean obviously obsolete/cyber **labels & comments** (e.g., scrollbar "for Technical Feel", "Tactical corners") where they leak into user copy.

> This PR ships the audit + design system. Code fixes beyond trivial/safe label cleanups should follow the PR sequence below so each is reviewable in isolation.

---

## 22. Medium‑term visual redesign plan (sequenced, no big‑bang)

1. **Type reset** — single typeface, kill uppercase/tracking/mono defaults, introduce type scale. (Highest visual ROI.)
2. **Token enforcement** — migrate components off raw Tailwind neon onto `--luca-*`; delete the `!important` light‑mode block once unused.
3. **Primitive layer** — add `src/shared/ui` (`Button`, `Card`, `Panel`, `Modal`, `Input`, `Badge`, `Toggle`, `Tabs`, `EmptyState`); migrate incrementally.
4. **Surface scales** — one radius/shadow/spacing scale; collapse glass to two surfaces.
5. **Cyber layer gating** — move scanline/glitch/hologram/tactical components behind Creator/Origin, off by default.
6. **Surface‑by‑surface polish** — onboarding → dashboard panels → VoiceHUD → Personal Intelligence → LucaLink → VisualCore → mobile.
7. **Tier density presets** — Basic comfortable / Pro standard / Creator dense.
8. **Accessibility pass** — focus‑ring primitive, motion audit, contrast verification after token migration.

---

## 23. What NOT to change

- ❌ Do **not** rewrite `App.tsx` or the shell.
- ❌ Do **not** replace the theme/token system — it is the best asset; extend it.
- ❌ Do **not** remove the 3‑panel layout, boot sequence, or right‑panel operational‑truth model.
- ❌ Do **not** delete legacy theme *mappings* (saved user settings depend on them) — just stop *surfacing* legacy names.
- ❌ Do **not** fully implement Basic/Pro/Creator in this PR.
- ❌ Do **not** perform large CSS rewrites, add dependencies, or change runtime behavior.
- ❌ Do **not** delete strategic components (memory graph, operation center, LucaLink) — gate the *cyber‑aesthetic* ones, don't remove capability.

---

## 24. Recommended PR sequence for implementation

| PR | Scope | Risk |
|---|---|---|
| **A** | This audit + `lucaos-visual-design-system.md` + trivial safe label/aria fixes | Minimal |
| **B** | Typography reset (single font, kill uppercase/tracking/mono defaults, type scale) | Low‑Med (visual‑only) |
| **C** | Token enforcement pass (components → `--luca-*`; remove `!important` block) | Med |
| **D** | `src/shared/ui` primitives + radius/shadow/spacing scales + glass consolidation | Med |
| **E** | Onboarding visual polish (cards, remove sliders, sentence case) | Low‑Med |
| **F** | Dashboard panel polish (left density, right‑panel softening, header identity) | Med |
| **G** | VoiceHUD calm‑by‑default (drop typewriter for Basic, hologram opt‑in) | Low‑Med |
| **H** | Personal Intelligence / LucaLink / VisualCore polish | Med |
| **I** | Mobile density + tap targets | Med |
| **J** | Cyber layer gating behind Creator/Origin + tier density presets | Med |
| **K** | Accessibility pass (focus ring, motion audit, contrast verification) | Low‑Med |

---

## 25. Final answer

> **Does LucaOS visually feel like a premium AI operating system?**

**Not yet — but it is close, and the hard part is already done.** LucaOS has a *premium‑grade engine* (typed semantic tokens, restrained themes, correct separation of appearance/theme/accent, calm boot model) wrapped in a *prototype/tactical skin* (five fonts, pervasive uppercase/tracking/monospace, scanline/glitch/hologram effects, fragmented glass utilities, and components that bypass the very token system that would make them premium).

The exact design‑system work to make it Apple‑grade, in priority order:

1. **Reset typography** to one quiet typeface, sentence case, default tracking, minimal monospace.
2. **Enforce the tokens** — every component on `--luca-*`; delete the `!important` light‑mode patch.
3. **Add primitives + one set of scales** (radius/shadow/spacing/glass).
4. **Turn the cyber layer off by default** and gate it behind Creator/Origin.
5. **Polish surface‑by‑surface** with tier‑aware density.

Do these five, and LucaOS stops feeling like a developer console with a beautiful theme engine and starts feeling like a calm, trustworthy, premium personal AI operating system.

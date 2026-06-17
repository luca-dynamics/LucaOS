# LucaOS Visual Design System

**Version:** 1.0 (post‑PR #232)
**Authority:** Product / Design Systems
**Applies to:** All LucaOS surfaces — desktop, mobile, voice, widget, overlay.
**Relationship to other docs:** This is the *visual* contract. It operationalizes `docs/design/lucaos-interface-principles.md` (philosophy) and the findings in `docs/audits/post-pr232-premium-visual-design-system-audit.md`. It is grounded in the existing token resolver `src/config/lucaAppearanceTokens.ts` and `src/config/lucaThemeLabels.ts`.

> **North star:** LucaOS should feel like a calm, trustworthy, premium **personal AI operating system** — Apple/OpenAI‑grade restraint, not a cyber dashboard or developer console. When in doubt, do less.

---

## 1. Design goals

1. **Calm by default.** Quiet surfaces, generous space, nothing competes for attention unless it needs action.
2. **One coherent language.** Every surface looks like it came from the same system.
3. **Tokens are law.** All color/surface/border/shadow/motion derives from semantic tokens — never ad‑hoc hex or raw neon utilities.
4. **Restraint over decoration.** Effects are invisible until needed. No scanlines/glitch/hologram on default surfaces.
5. **Trust through clarity.** System status reads as honest and legible, never as a debug console.
6. **Tier changes density & disclosure, not loudness.** Basic, Pro, and Creator share one calm visual language.
7. **Accessible by construction.** `reducedMotion`, `reducedTransparency`, `highContrast` are respected everywhere.

---

## 2. Theme rules

LucaOS keeps **three independent axes** (already modeled in `lucaAppearanceTokens.ts`):

- **Appearance mode** — `light` | `dark` | `system`.
- **Product theme** — `luca-silver` | `luca-graphite` | `luca-frost` | `luca-cream`.
- **Accent** — `neutral` | `blue` | `violet` | `green` | `amber` | `custom`.

Rules:

- These three axes are **never fused into one list** in the UI. Surface them as a Light/Dark/System segmented control, a theme picker, and an optional accent picker.
- **Only the four `"normal"` themes are user‑facing.** Always source pickers from `NORMAL_LUCA_THEME_OPTIONS`. Legacy ids (`ASSISTANT`, `AGENTIC_SLATE`, `LUCAGENT`, `RUTHLESS`, `TERMINAL`, `HACKER`, `BUILDER`, `ENGINEER`, `DICTATION`) and experimental (`VAPORWAVE`) remain in the compatibility map for saved settings but **must not appear in user copy**.
- **Default theme = Luca Silver, accent = neutral, appearance = system.** First‑run picks Graphite on a dark OS, Silver on a light OS (`resolveFirstRunAppearancePreference`).
- **Accent is a highlight, not a wash.** Accent drives focus rings, active states, primary actions, and small highlights — never large background fills. `compatibilityMode: "accent-heavy"` (glow ×1.6) is confined to the experimental theme only.
- **Status colors are independent of accent**: `--luca-success`, `--luca-danger`, `--luca-warning`, `--luca-info`.

### Default themes by mode

| Mode | Code tier | Theme | Appearance | Accent |
|---|---|---|---|---|
| **Basic** | Normal | Luca Silver | System | Neutral |
| **Pro** | Tactical | Luca Graphite | Dark | Blue (low‑sat) |
| **Creator** | Origin | Luca Graphite | Dark | Violet / custom |

All tiers default to **cyber effects off, monospace minimized, motion = calm**.

---

## 3. Typography rules

**One typeface for UI. One mono for code/IDs only.**

- **UI font:** Inter (already imported). Remove Outfit, Fraunces, Space Mono from the default UI; retire JetBrains Mono in favor of a single mono only where genuine code/hashes/IDs appear.
- **Case:** Sentence case everywhere. Uppercase is allowed **only** on micro eyebrow labels ≤ 11px, sparingly.
- **Letter‑spacing:** Default tracking. No `tracking-wide/wider/widest` on body or controls. Tiny eyebrow labels may use ≤ `0.04em`.
- **Monospace:** Only for code, hashes, IDs, and raw technical values in Creator/Origin surfaces. Not for ordinary numbers, labels, or status.

### Type scale (rem, base 16px)

| Token | Size | Weight | Line height | Use |
|---|---|---|---|---|
| `display` | 2.0 | 600 | 1.15 | Hero / boot wordmark |
| `title` | 1.5 | 600 | 1.2 | Page / modal titles |
| `heading` | 1.125 | 600 | 1.3 | Section headings |
| `body` | 1.0 | 400 | 1.5 | Primary text |
| `label` | 0.875 | 500 | 1.4 | Controls, list items |
| `caption` | 0.75 | 500 | 1.35 | Secondary / metadata |
| `eyebrow` | 0.6875 | 600 | 1.3 | Tiny uppercase labels (sparingly) |

Body line height ≥ 1.5 for comfort. Respect `--app-font-scale` for global sizing.

---

## 4. Spacing scale

**4px base.** Use only these steps; no arbitrary margins.

| Token | px |
|---|---|
| `space-0` | 0 |
| `space-1` | 4 |
| `space-2` | 8 |
| `space-3` | 12 |
| `space-4` | 16 |
| `space-5` | 24 |
| `space-6` | 32 |
| `space-7` | 48 |
| `space-8` | 64 |

- Card padding: `space-4` (comfortable) / `space-3` (dense).
- Panel gutters: `space-5` desktop, `space-4` mobile.
- Minimum gap between unrelated groups: `space-5`.
- Let surfaces breathe — prefer the larger step when unsure.

---

## 5. Border / radius / shadow rules

### Radius (collapse the current 8 values to 4)

| Token | px | Use |
|---|---|---|
| `radius-sm` | 6 | Inputs, chips, small controls |
| `radius-md` | 10 | Buttons, list rows |
| `radius-lg` | 14 | Cards, panels, modals |
| `radius-pill` | 9999 | Pills, avatars, toggles |

Map existing `rounded-sm/md` → `radius-sm`, `rounded-lg` → `radius-md`, `rounded-xl/2xl/3xl` → `radius-lg`, `rounded-full` → `radius-pill`. Avoid `rounded-none` except for full‑bleed edges.

### Borders

- Use `--luca-border-subtle` (default) and `--luca-border-strong` (emphasis / high contrast).
- Borders are **hairline** (1px). No "tech corner" decorations on default surfaces.

### Shadow (2 elevations + focus)

| Token | Use |
|---|---|
| `--luca-shadow-soft` | Resting elevation for cards/panels/modals |
| `--luca-shadow-glow` | *Optional* accent emphasis only (focus/active) — never ambient |
| focus ring | `0 0 0 2px var(--luca-accent-primary)` (single shared ring) |

One elevation treatment per element. Never stack glass + noise + tech‑border + glow.

---

## 6. Glass / blur usage rules

- **Two glass surfaces only**, both token‑driven:
  - `surface-glass` (panels) → `--luca-surface-glass` + `--luca-blur-level`.
  - `surface-card` (cards) → `--luca-surface-solid`/elevated + `--luca-shadow-soft`.
- Retire the proliferation (`glass-panel`, `glass-blur`, `glass-panel-light`, `glass-card-light`, `glass-card-stable*`, `glass-card-premium`, `glass-noise`, `liquid-border`) from default surfaces; consolidate onto the two above.
- **No fractal noise, no animated liquid border, no scanlines** on default surfaces.
- Blur and background opacity are **power‑user controls** — Appearance settings only, never onboarding.
- Always honor `reducedTransparency`: collapse glass to a solid surface (`glassAlpha → 0.92`, already supported in the resolver).

---

## 7. Icon usage

- One icon set, consistent stroke weight, via the shared `Icon` component.
- Sizes: `16` (inline/caption), `20` (controls/list), `24` (headers/primary). No arbitrary sizes.
- Icons are monochrome, inheriting `currentColor`; status color comes from tokens.
- Every icon‑only control has an `aria-label`.
- No decorative tech/hud iconography on default surfaces.

---

## 8. Color semantics

Always use semantic tokens; never raw Tailwind neon (`text-green-400`, `bg-white/10`) in components.

| Token | Meaning |
|---|---|
| `--luca-text-primary` / `-secondary` / `-tertiary` | Text hierarchy |
| `--luca-background-base` / `-elevated` / `-liquid` | Backgrounds |
| `--luca-surface-glass` / `-solid` / `-hover` | Surfaces |
| `--luca-border-subtle` / `-strong` | Borders |
| `--luca-accent-primary` / `-soft` | Accent (highlights/focus/primary action) |
| `--luca-success` / `-danger` / `-warning` / `-info` | Status |
| `--luca-shadow-soft` / `-glow` | Elevation / optional emphasis |

- Migrating components onto these tokens lets the `.light-mode { … !important }` block in `src/index.css` eventually be deleted.
- **Never encode meaning in color alone** — pair status color with an icon and/or label.

---

## 9. Status chip rules

- Chips communicate **state**, never decoration.
- Three canonical tones map to tokens: `ready → success`, `pending → warning`/neutral, `attention → danger` (mirrors `resolveLucaBootReadinessTone`).
- A chip = dot/icon + short sentence‑case label. No uppercase, no monospace, no glow.
- One chip primitive reused everywhere (consolidate `RuntimeStatusChip` et al.).

---

## 10. Motion / animation rules

- **Default motion = `calm`** (the resolver default). Motion serves transitions, not decoration.
- Durations: micro 120ms, standard 200ms, panel 280ms. Easing: standard ease‑out.
- **Everything respects `reducedMotion`** — when set, disable non‑essential transitions entirely.
- **Banned on default surfaces:** scanline (`animate-scan`), radar sweep, `liquid-rotate`, glitch/chromatic aberration, typewriter text, ambient pulsing.
- Cyber/expressive motion is **opt‑in** (Creator/Origin), off by default, and still motion‑reducible.

---

## 11. Component consistency rules

- **Shared primitives** live in `src/shared/ui`: `Button`, `Card`, `Panel`, `Modal`, `Input`, `Badge/Chip`, `Toggle`, `Tabs`, `EmptyState`, `Spinner`. All token‑driven. Build incrementally; do not rewrite the shell.
- **Buttons:** variants `primary` (accent fill), `secondary` (subtle surface), `ghost` (text). `radius-md`, `space-3` padding, single focus ring. No uppercase.
- **Cards/Panels:** one glass/elevation treatment, `radius-lg`, `--luca-shadow-soft`.
- **Modals:** one shell — backdrop blur, header (title + close), body, footer. Shared across LucaLink/VisualCore/Settings.
- **Inputs:** `radius-sm`, subtle border, accent focus ring, sentence‑case labels.
- **Tabs/segmented controls:** one pattern; active state via accent, not heavy fills.
- **Empty/loading/disabled states are first‑class:** every list/panel defines a calm empty state, a single spinner, and a clearly dimmed (not hidden) disabled state.

---

## 12. Basic / Pro / Creator density rules

Tiers change **density and disclosure**, never visual loudness. (Code tiers: Basic→Normal, Pro→Tactical, Creator→Origin.)

| Aspect | Basic | Pro | Creator |
|---|---|---|---|
| Density | Comfortable (`space-4` padding) | Standard (`space-3`) | Dense (`space-2/3`) |
| Default theme | Luca Silver / System | Luca Graphite / Dark | Luca Graphite / Dark |
| Language | Plain, warm, no jargon | Operator/diagnostic ok | Technical/candid ok |
| Left panel | Core tools only | + advanced groups | All groups |
| Right panel | Friendly summaries | + activity/health detail | + raw logs/traces |
| Memory | Friendly cards | + approval trail | + raw memory graph |
| Voice | Orb + transcript + stop | + telemetry/model label | + tactical stream / advanced |
| Boot copy | "Starting up…" plain | Subsystem labels | Full diagnostic copy |
| Cyber layer | Off | Off | Available, off by default |
| Monospace | None (UI) | IDs/code only | Code/raw technical values |

---

## 13. Enforcement checklist (PR review gate)

Before merging any visual change, confirm:

- [ ] No raw neon Tailwind color in components (use `--luca-*`).
- [ ] No new `!important`.
- [ ] One typeface; sentence case; default tracking; mono only for code/IDs.
- [ ] Radius/shadow/spacing from the scales above.
- [ ] At most two glass surfaces; no noise/liquid/scanline on default surfaces.
- [ ] All motion respects `reducedMotion`; cyber motion opt‑in only.
- [ ] Status color paired with icon/label; chips communicate state.
- [ ] Icon‑only controls have `aria-label`; focus ring present; tap targets ≥ 44px on mobile.
- [ ] Only `"normal"` theme names surfaced to users.

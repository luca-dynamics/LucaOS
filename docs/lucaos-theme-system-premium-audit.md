# PR #170 — LucaOS Theme System Audit + Premium Appearance Direction

## Scope and hard boundary

This is an audit/map PR only. It documents the current LucaOS theme, appearance, background, contrast, glass/material, desktop/mobile, boot, onboarding, and widget architecture so a later implementation can move LucaOS toward a premium neutral Light/Dark/Silver/Graphite appearance system.

This PR does **not** change current theme defaults, settings persistence, onboarding behavior, boot behavior, boot visuals, dashboard/mobile/widget visuals, persona behavior, runtime services, or user-facing controls.

## Executive summary

LucaOS already has a centralized theme palette and a runtime contrast bridge, but the current model mixes several concepts that premium desktop/mobile products usually keep separate:

- **Persona identity**: Assistant, Master System, Terminal, Builder, Dictation, LucaAgent-style modes.
- **Visual theme**: Professional, LightCream, Frost, Vaporwave, Agentic Slate, and other surface/background moods.
- **Accent color**: electric blue, cyan, purple, green, amber, terracotta, white, slate, cream.
- **Background style**: liquid gradients, glass opacity, blur, light/dark branches, cream grid, dark charcoal.
- **Mode semantics**: tactical/dev/terminal/coding identity leaks into product-level visual identity.

The premium direction should preserve LucaOS's embodied AI OS personality while moving default product visuals toward restrained, neutral surfaces: pearl/silver light mode, graphite dark mode, subtle glass, subtle borders, strong typography, calm motion, and optional accent highlights.

## Current default policy observed

| Question                      | Current answer                                                |
| ----------------------------- | ------------------------------------------------------------- |
| New-user default persona      | `ASSISTANT`                                                   |
| New-user default visual theme | `PROFESSIONAL`                                                |
| Default background opacity    | `0.3`                                                         |
| Default background blur       | `40`                                                          |
| Persona/theme sync default    | `true`                                                        |
| `getThemeColors` fallback     | `PROFESSIONAL`                                                |
| Onboarding theme write path   | `general.theme`                                               |
| Boot theme source             | App passes the active theme object into `LucaBootVisualShell` |

### Implication

The default is not an obviously loud neon theme, which is good. However, the default still lives inside a persona/theme system where visual identity and persona behavior can sync by default. That means future premium appearance work should not simply recolor the existing themes; it should separate **Appearance**, **Accent**, and **Persona**.

## Current architecture map

A typed audit map was added at `src/config/lucaThemeSystemAuditMap.ts`. It classifies surfaces by:

- surface id
- file/component
- current theme usage
- token usage
- hardcoded color usage
- visual role
- desktop/mobile relevance
- accessibility/contrast risk
- premium-alignment assessment
- future recommendation

The map intentionally does not drive runtime behavior.

## Theme source files

### `src/config/themeColors.ts`

Current strengths:

- Centralizes many legacy brand/persona colors.
- Provides `THEME_PALETTE`, `PERSONA_UI_CONFIG`, `getThemeColors`, `setHexAlpha`, `generateThemeStyles`, and `getDynamicContrast`.
- Provides a useful adaptive contrast idea based on theme and background opacity.

Current risks:

- `THEME_PALETTE` mixes product themes with persona/tactical identities.
- `PERSONA_UI_CONFIG` stores visual classes (`text-*`, `border-*`, `bg-*`, `shadow-*`) next to theme names and hex values.
- Accent colors can dominate entire panels and glows.
- Legacy aliases (`RUTHLESS`, `HACKER`, `ENGINEER`, `ASSISTANT`, `LUCAGENT`) prove that behavior/persona naming and theme naming are coupled.
- `getDynamicContrast` covers a useful subset of glass/background opacity but is not a complete industrial token system.

### CSS variable injection

`App.tsx` is the main runtime bridge from settings to CSS variables. It reads `general.theme`, `general.persona`, `general.backgroundOpacity`, `general.backgroundBlur`, `general.fontScale`, and `general.fontFamily`, then sets variables such as:

- `--app-bg-opacity`
- `--app-bg-blur`
- `--app-text-main`
- `--app-text-muted`
- `--app-border-main`
- `--app-bg-tint`
- `--app-bg-main`
- `--app-font-scale`
- `--app-font-family`

This is the right general injection point, but it should eventually consume a typed semantic token resolver rather than reading directly from persona configuration.

### Tailwind extension

`tailwind.config.js` extends `rq-base`, `rq-panel`, `rq-blue`, `rq-green`, `rq-amber`, `rq-red`, `rq-border`, and `sci-cyan`. This is useful for compatibility, but the current names and defaults are tactical/dev-accent-forward rather than product-surface-forward.

Future Tailwind tokens should expose semantic aliases such as `surface-glass`, `surface-solid`, `text-primary`, `border-subtle`, and `accent-primary`, while preserving `rq-*` aliases until migration is complete.

## Settings / Appearance audit

`SettingsGeneralTab` currently combines:

- persona/theme synchronization
- persona selection
- visual theme selection
- typography controls
- background opacity
- background blur
- startup/tray/debug/advanced controls nearby

This is usable, but not yet premium-grade information architecture. Appearance and Persona should eventually separate:

- **Appearance** controls product theme and mode: System / Light / Dark / Silver / Graphite / Frost / Cream.
- **Accent** controls small highlights: neutral / blue / violet / green / amber / custom.
- **Persona** controls Luca behavior, communication, and operating style.
- **Persona-theme sync** should become an optional explicit behavior, not the conceptual foundation.

No settings persistence changes are made in this PR.

## Boot audit

`LucaBootVisualShell` now uses a universal premium boot shell rather than terminal-first startup UI. It receives `theme`, renders `LiquidBackground`, and uses:

- `theme.hex` for glow/ring/orb accents
- `--app-bg-tint` for panel background
- `--app-border-main` for borders
- `--app-text-main` and `--app-text-muted` for text

This is broadly aligned with the premium direction because boot text and shell surfaces are token-aware. The main remaining risk is accent dominance: very loud themes can make boot feel electric-blue, cyan, purple, green, amber, or vaporwave rather than neutral LucaOS.

Recommendation: preserve current boot behavior now; later route boot through neutral surface/glow tokens and QA every legacy theme for readability.

## Onboarding audit

`ThemeSelectionStep` reads the current `general.theme`, writes the selected theme back to `general.theme`, and updates visual variables for preview. It also exposes background opacity and blur during first-run.

The write path appears correct for the current system: onboarding theme selection updates the setting that App later reads. The architectural issue is not the write path; it is that first-run choice is still theme/persona-style rather than Appearance + Accent + Persona.

`HologramFace` and related onboarding visual presence should eventually receive embodied-presence tokens so Luca can stay premium and readable in both pearl/silver light mode and graphite/dark mode.

## Desktop shell audit

The main desktop shell mixes:

- semantic variables (`--app-text-main`, `--app-text-muted`, `--app-border-main`, `--app-bg-tint`)
- persona theme class strings (`theme.primary`, `theme.border`, `theme.bg`, `theme.glow`)
- direct Tailwind colors (`bg-white/5`, `border-white/10`, `bg-black/30`, `text-slate-*`)
- local light-theme branches such as `lucagent`
- status colors such as emerald/green for active indicators

This is the highest-impact migration target after token foundation because desktop shell hierarchy defines the product's first daily-use impression.

Recommendation: migrate panel, divider, tab, selected, hover, status, and collapsed-panel states to semantic shell tokens in a staged PR.

## Mobile shell audit

Mobile shell uses some of the same active theme data as desktop, but it still contains separate direct black/white/slate branches for nav and panel surfaces. Mobile therefore does not yet fully share the desktop token contract.

Recommendation: introduce shared navigation and surface tokens that work across desktop and mobile before redesigning mobile visuals.

## Widgets and overlays audit

Important widget/overlay surfaces include:

- Hologram widget
- mini chat widget
- VoiceHUD
- VisionHUD
- VisualCore / Luca Screen
- browser and governance overlays

These surfaces frequently receive `theme.hex` or `themeColor` and then render component-local glows, borders, gradients, or status colors. That makes them expressive, but also creates risk that the product identity becomes a collection of accent-driven surfaces instead of one coherent OS material system.

Recommendation: define widget, HUD, VisualCore, and overlay tokens after the global token foundation, then migrate one surface family at a time.

## Hardcoded style classification

A repository scan for hardcoded hex, rgba, gradients, direct Tailwind color classes, and glow utilities found thousands of matches across `src`. Many are legitimate status colors or component-local effects, but they should be classified before redesign:

| Risk label                  | Meaning                                                        | Examples to migrate later                          |
| --------------------------- | -------------------------------------------------------------- | -------------------------------------------------- |
| `accent-dominance`          | Accent color controls too much of the surface identity         | `theme.hex` glows, selected tabs, or HUD fills     |
| `terminal-green-assumption` | Green reads as terminal/hacker/coding default                  | Terminal/Hacker, success-like active indicators    |
| `electric-blue-assumption`  | Blue/cyan reads as generic neon AI default                     | Master System, Frost, sci-cyan, cyan fallbacks     |
| `purple-persona-assumption` | Purple tied to dictation/AI glow rather than optional accent   | Dictation, VisionHUD defaults                      |
| `amber-tactical-assumption` | Amber/terracotta used as builder/system identity               | Builder, system mission color                      |
| `unscoped-rgba`             | Local translucent colors bypass tokens                         | glass panels, borders, muted text                  |
| `direct-tailwind-color`     | Tailwind color class bypasses semantic tokens                  | `bg-black`, `border-white/10`, `text-slate-500`    |
| `gradient-glow-hardcoded`   | Local radial/linear gradient formula bypasses material tokens  | LiquidBackground, boot orb, overlays               |
| `light-dark-branch-local`   | Component-specific light/dark logic instead of appearance mode | `lucagent` checks, `isLight` checks                |
| `surface-opacity-risk`      | Contrast depends on opacity/blur thresholds                    | glass controls, dynamic contrast, LiquidBackground |

## Answers to audit questions

1. **What is LucaOS's current default theme for new users?** `PROFESSIONAL`.
2. **Where is the default theme/persona decided?** In `DEFAULT_SETTINGS` inside `settingsService`, with persona `ASSISTANT`, theme `PROFESSIONAL`, opacity `0.3`, blur `40`, and sync enabled.
3. **Does boot use the right fallback theme before onboarding?** Boot receives the active App theme. App initializes active theme from settings or `PROFESSIONAL`, and `getThemeColors` also falls back to `PROFESSIONAL`. This is acceptable for current behavior.
4. **Does onboarding theme selection override boot theme correctly?** The current onboarding theme selection writes `general.theme`, and App listens to settings changes. The write path is correct for current behavior.
5. **Are persona and visual theme currently mixed together?** Yes. `PERSONA_UI_CONFIG`, legacy aliases, settings sync, and theme class strings mix persona, theme, accent, and mode semantics.
6. **Which themes feel product-grade?** `PROFESSIONAL`, `AGENTIC_SLATE`/`LUCAGENT`, `LIGHTCREAM`, and parts of `FROST` are closest, though all need tokenization and contrast QA.
7. **Which themes feel too tactical/developer/persona-specific?** `TERMINAL`, `MASTER_SYSTEM`, `BUILDER`, `DICTATION`, `VAPORWAVE`, and legacy aliases such as `HACKER`, `RUTHLESS`, and `ENGINEER` are too mode/persona/accent-specific for default branding.
8. **Which colors are too loud for default premium branding?** Electric blue, cyan/frost cyan, hacker green, hot pink, saturated purple, bright amber/terracotta, and red glow should be optional accents/status colors rather than dominant defaults.
9. **Which surfaces bypass the theme system with hardcoded colors?** Tailwind config, desktop shell, mobile nav, LiquidBackground, boot gradients, onboarding visual cards, VisualCore, HUDs, widgets, browser overlays, and many modals include direct classes or local rgba/hex/gradient values.
10. **Does `LiquidBackground` support a premium white/silver light mode?** Partially. It has a light branch and a silver-ish web gradient, but the values are local constants and accent glow can still dominate.
11. **Does `LiquidBackground` support a premium graphite/dark mode?** Partially. It has a charcoal/dark branch, but graphite should become a named tokenized product theme with controlled neutral glow.
12. **Does the current dynamic contrast system cover glass/background opacity well?** It covers the basic opacity-driven text/border switch, especially for light themes, but it does not fully model material elevation, blur level, reduced transparency, high contrast, status colors, or per-surface hierarchy.
13. **Does mobile use the same tokens as desktop?** Not consistently. Mobile reuses theme data but has local black/white/slate branches and direct Tailwind colors.
14. **Does the boot shell remain readable in every theme?** It is more readable than the old terminal-first boot because it uses app text/border variables, but every theme still needs manual visual QA because accent glows and LiquidBackground can vary heavily.
15. **Does the settings UI remain readable in light and dark modes?** It is improved by app variables and dynamic contrast, but local rgba fallbacks and direct Tailwind colors still create risk in high-opacity light, low-opacity glass, and legacy accent-heavy themes.
16. **Which tokens are missing for industrial design quality?** Appearance mode, product theme, accent, background base/elevated/liquid, glass/solid/hover surfaces, border subtle/strong, text primary/secondary/tertiary, accent primary/soft, status colors, shadow soft/glow, blur, motion, reduced motion, reduced transparency, and high contrast.
17. **What should the new design token architecture be?** See the future token model below.
18. **What should be the default new-user theme policy?** Future recommendation: System appearance or platform-aware Luca Light, product theme Luca Silver/Graphite, neutral or subtle Luca blue accent, and persona should not override full product appearance unless persona-theme sync is explicitly enabled.
19. **What should happen when user selects persona vs appearance?** Persona should adjust Luca behavior/communication/operating style. Appearance should adjust product surfaces and mode. Accent should adjust small highlights. Persona-theme sync should be optional and reversible.
20. **What PRs should implement the redesign safely?** Use the staged roadmap below.

## Future premium token architecture recommendation

Proposed token model for later implementation:

```ts
type AppearanceMode = "light" | "dark" | "system";
type ProductTheme =
  | "luca-silver"
  | "luca-graphite"
  | "luca-frost"
  | "luca-cream";
type Accent = "neutral" | "blue" | "violet" | "green" | "amber" | "custom";

interface LucaAppearanceTokens {
  appearanceMode: AppearanceMode;
  productTheme: ProductTheme;
  accent: Accent;
  backgroundBase: string;
  backgroundElevated: string;
  backgroundLiquid: string;
  surfaceGlass: string;
  surfaceSolid: string;
  surfaceHover: string;
  borderSubtle: string;
  borderStrong: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  accentPrimary: string;
  accentSoft: string;
  danger: string;
  success: string;
  warning: string;
  info: string;
  shadowSoft: string;
  shadowGlow: string;
  blurLevel: string;
  motionStyle: string;
  reducedMotion: boolean;
  reducedTransparency: boolean;
  highContrast: boolean;
}
```

### Token interpretation

- **Light mode** should default toward white/silver/pearl, graphite text, subtle grey borders, soft glass, and minimal accent glow.
- **Dark mode** should default toward charcoal/graphite/dark grey, white/light grey text, calm grey borders, dark glass, and minimal accent glow.
- **Accent** should be secondary. Blue/cyan/purple/green/amber can exist, but should not dominate default LucaOS identity.
- **Persona** should not own the whole visual system.

## Recommended future default policy

Do not implement in this PR. Future policy should likely be:

- Default appearance: `system` where platform support is reliable; otherwise platform-appropriate Luca Light / Luca Dark.
- Default product theme: `luca-silver` in light mode and `luca-graphite` in dark mode.
- Default accent: `neutral` or very subtle Luca blue.
- Persona: `ASSISTANT` or future default behavior persona, independent from product theme.
- Persona-theme sync: optional compatibility behavior, not the default mental model.

## Safe staged implementation roadmap

1. **Theme token foundation** — introduce typed semantic tokens and a resolver without changing defaults.
2. **Default first-run appearance policy** — decide System/Silver/Graphite policy and migration guardrails.
3. **Appearance/persona separation** — separate settings model and UI copy after compatibility planning.
4. **LiquidBackground light/dark refinement** — tokenize white/silver/pearl and graphite/charcoal liquid backgrounds.
5. **Settings appearance UI cleanup** — separate Appearance, Accent, Persona, Typography, and Glass controls.
6. **Desktop shell token migration** — panel hierarchy, tabs, dividers, active states, collapsed states.
7. **Mobile shell token migration** — bottom nav, mobile cards, mobile panel surfaces.
8. **Widget/VisualCore token migration** — Hologram, mini chat, VoiceHUD, VisionHUD, Luca Screen.
9. **Accessibility pass** — reduced motion, reduced transparency, high contrast, contrast snapshots, manual QA.

## PR #170 validation expectations

Because this PR adds a typed audit map, tests should verify:

- every audited surface has an assessment
- hardcoded color risks are classified
- premium alignment labels exist
- future implementation recommendations are present
- the audit documents current defaults without changing runtime fallback behavior

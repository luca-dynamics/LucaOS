# LucaOS Skin System

**Type:** Product / design specification (documentation-only)
**Status:** Specification. No runtime, source, or asset changes are made by this document.
**Date:** 2026-06-22
**Audience:** Founder / product owner and implementers (Codex to plan exact architecture later).
**Scope:** A system-wide visual identity layer for LucaOS — boot, onboarding, dashboard, composer, overlays, presence, mobile.

**Read together with:**

- `docs/luca-top-ai-interface-pattern-audit.md`
- `docs/luca-top-ai-interface-ux-verdict.md`
- `docs/luca-interface-founder-decisions.md`
- `docs/luca-interface-refinement-roadmap.md`
- `docs/luca-composer-affordance-inventory.md`
- `docs/luca-composer-product-decisions.md`

> **Shared direction:** "LucaOS should feel like a quiet operating system for
> intelligence, not a dashboard for controlling intelligence."

> **Method / honesty note.** This spec studies the *quality bar* of premium OS
> branding (Apple-grade polish, liquid-material depth) as a discipline only. It
> copies **no** competitor branding, logos, assets, names, exact gradients, or
> interface layouts. Every skin identity described here is original to LucaOS.
> Names and visual language must remain Luca-native.

---

## 1. Executive summary

LucaOS needs a real **OS Skin System**, not just basic light/dark themes.

- A **skin** is a system-wide visual identity layer — a coherent environment, not
  a color swap.
- Skins should apply consistently **from boot, through splash/loading, through
  onboarding, into the dashboard, composer, MiniChat, Luca Widget, Presence,
  VoiceHUD, settings, and the mobile shell.**
- The quality target is **Apple-grade polish** — calm, spacious, premium,
  materially deep — expressed through a **Luca-native identity**, never a copy.
- Skins must always **preserve usability, safety states, readability, and
  accessibility.** A skin can change how LucaOS *feels*; it can never change
  whether the user can see that voice is live, that an action needs approval, or
  how to stop generation.
- A skin system makes LucaOS feel **installable, upgradeable, premium, and
  system-level** — closer to choosing an operating environment than picking an
  app color.

> **Framing line for the whole system:**
> **"LucaOS skins are not decorations; they are the visual operating environments
> for an AI-native OS."**

---

## 2. Difference between theme and skin

### Theme

A **theme** is a basic selection: light / dark / a color accent. It changes
surface colors and text colors but leaves the product's *character* unchanged. It
answers "light or dark?".

### Skin

A **skin** is a full visual environment. It defines:

- **Background language** — solid, gradient, ambient, or liquid.
- **Material behavior** — opacity, blur, border strength, elevation.
- **Typography mood** — system-clean, editorial, developer, futuristic-calm.
- **Accent logic** — how and how sparingly accent and glow are used.
- **Surface hierarchy** — the weight ladder of panels, cards, controls.
- **Motion personality** — calm, fluid, minimal, premium.
- **Boot identity** — the background, orb/symbol, and loading rhythm at startup.
- **Onboarding mood** — how the first-run experience feels.
- **Widget / overlay treatment** — MiniChat, Luca Widget, VoiceHUD, Presence.
- **Mobile adaptation** — how the identity translates to a phone-native shell.

**Why LucaOS needs skins, not just themes:** LucaOS is positioned as an
installable, device-level AI host — not a chat app. A device-level product is
judged on whether it feels like a coherent *environment* from the moment it boots.
Themes touch only the surface palette; they cannot carry a boot identity, a motion
personality, or a presence treatment. A skin carries the identity *through the
whole system*, which is exactly the signal that separates an OS-like product from
an app with a dark mode. Skins are also the natural unit of "installable /
upgradeable" identity — something a user chooses once and feels everywhere.

---

## 3. Official launch skins

The first official skin set. Each is a complete environment, not a palette.
(Names follow the brand rules in §10; a better naming system may be proposed, but
these are the defaults.)

### LucaOS Pearl

*Light / white / premium / soft.*

- **Product mood:** calm, bright, premium-minimal; a quiet, airy room.
- **User type:** everyday users, design-minded users, default-comfort users.
- **Best use case:** general daily use; the recommended default light identity.
- **Background style:** near-white base with very soft ambient tint; no hard
  white, no harsh contrast.
- **Material style:** light glass — gentle translucency, hairline borders, soft
  diffuse shadows; restrained blur.
- **Accent style:** single calm accent used only for active/primary states; glow
  almost absent.
- **Typography feel:** system-clean, high legibility, generous spacing.
- **Motion feel:** calm and gentle; short, soft transitions.
- **Boot behavior:** soft luminous background, a quiet light orb, gentle shimmer;
  no terminal output.
- **Onboarding behavior:** bright, welcoming, spacious; feels like meeting someone
  calm.
- **Dashboard behavior:** spacious, low-density default; composer dominant.
- **MiniChat / Luca Widget behavior:** light, feather-soft, unobtrusive; lighter
  than the dashboard.
- **VoiceHUD behavior:** soft luminous bloom, calm; never game-like.
- **Mobile behavior:** bright, breathable, thumb-friendly; same calm identity.
- **Do:** keep it airy, legible, and premium-soft.
- **Do not:** use hard pure-white walls, heavy shadows, or neon accent.

### LucaOS Carbon

*Developer dark / charcoal / graphite / professional.*

- **Product mood:** focused, professional, low-noise dark; serious but not
  aggressive.
- **User type:** developers, power users, night users, Pro/Creator tiers.
- **Best use case:** long focused sessions, technical work, dark-environment use.
- **Background style:** near-neutral charcoal/graphite, low saturation; deep but
  not pure black.
- **Material style:** graphite glass — subtle translucency over dark surfaces,
  thin borders, soft elevation; controlled blur.
- **Accent style:** one restrained accent; glow used only for active/focus, never
  ambient.
- **Typography feel:** clean and professional; developer-comfortable without
  being terminal.
- **Motion feel:** minimal and precise; quick, quiet transitions.
- **Boot behavior:** deep graphite background, a steady cool orb, subtle
  highlight; calm, not cinematic-cyber.
- **Onboarding behavior:** focused and confident; quiet professionalism.
- **Dashboard behavior:** comfortable density for power users; still composer-first
  in Basic.
- **MiniChat / Luca Widget behavior:** compact, graphite, quiet.
- **VoiceHUD behavior:** cool calm glow; restrained.
- **Mobile behavior:** comfortable dark, high legibility, large touch targets.
- **Do:** keep it neutral, professional, and easy on the eyes.
- **Do not:** drift to cyberpunk/hacker — no neon green-on-black, scanlines,
  radar, or matrix motifs.

### LucaOS Flow

*Liquid glass / morph gradient / premium magical OS identity.*

- **Product mood:** alive, premium, gently magical; intelligence in motion.
- **User type:** users who want the signature LucaOS "wow" identity.
- **Best use case:** showcase / signature identity; demonstrating LucaOS as a
  living OS.
- **Background style:** slow liquid gradient / soft morphing ambient field; always
  gentle, never busy.
- **Material style:** liquid glass — layered translucency with soft depth and
  refraction-like softness; tasteful blur.
- **Accent style:** accent flows through the material softly; glow is present but
  disciplined and slow.
- **Typography feel:** futuristic-calm — clean, slightly soft, premium.
- **Motion feel:** fluid and premium; slow morph, gentle parallax, nothing jittery.
- **Boot behavior:** liquid background bloom, a soft morphing orb, slow shimmer;
  feels like intelligence waking.
- **Onboarding behavior:** the most "alive" first run; gentle motion that
  reassures rather than dazzles.
- **Dashboard behavior:** calm liquid backdrop behind a still, dominant composer;
  motion stays in the background.
- **MiniChat / Luca Widget behavior:** soft liquid material, light; quicker and
  lighter than the dashboard.
- **VoiceHUD behavior:** the signature moment — fluid bloom that responds to voice;
  premium, never frantic.
- **Mobile behavior:** liquid identity preserved but performance-aware; motion
  reduces gracefully.
- **Do:** keep liquid motion slow, soft, and background-level.
- **Do not:** become noisy, busy, distracting, or performance-heavy; motion must
  never compete with the composer or content.

### LucaOS Canvas

*Warm cream / human / editorial / calm work mode.*

- **Product mood:** warm, human, editorial; a calm desk for thinking and writing.
- **User type:** writers, thinkers, readers, long-form and reflective users.
- **Best use case:** reading, writing, long-form work, calm focus.
- **Background style:** warm cream / paper-like base; soft, low-glare.
- **Material style:** paper/cream — matte surfaces, very soft separation, minimal
  glass; little to no blur.
- **Accent style:** warm restrained accent; glow essentially absent.
- **Typography feel:** editorial — comfortable reading rhythm, generous measure.
- **Motion feel:** calm and minimal; transitions feel like turning a page.
- **Boot behavior:** warm cream background, a soft warm orb, gentle fade; quiet.
- **Onboarding behavior:** warm, human, unhurried.
- **Dashboard behavior:** reading-comfortable, low-density, text-forward.
- **MiniChat / Luca Widget behavior:** warm paper card, light and quiet.
- **VoiceHUD behavior:** warm soft glow; calm.
- **Mobile behavior:** comfortable warm reading on a phone; high legibility.
- **Do:** keep contrast readable and the warmth gentle.
- **Do not:** let cream reduce text contrast or legibility; never muddy.

---

## 4. Extended future skins (`defer`)

Proposed future identities. All are **deferred** until the launch set ships and
the token architecture is proven — each adds surface area, motion, and
accessibility work that should not precede a stable base.

- **Aurora** — soft colorful ambient light identity. *Defer:* color-motion and
  contrast tuning are involved; build after Flow validates ambient/liquid.
- **Titanium** — premium metallic neutral, industrial-calm. *Defer:* material
  depth nuance; build after Carbon proves the dark/graphite material.
- **Frost** — cool, crisp, high-clarity light glass. *Defer:* overlaps Pearl;
  needs differentiation work to justify a separate skin.
- **Midnight** — deep, quiet, near-black premium dark. *Defer:* contrast/OLED and
  safety-state visibility tuning at very low luminance.
- **Founder Edition** — signature limited identity for early supporters. *Defer:*
  a brand/positioning decision, not a base need; later.
- **Studio** — neutral, distraction-free creator/production identity. *Defer:*
  depends on Creator/Origin surfaces maturing.
- **Solar** — warm bright daylight identity. *Defer:* overlaps Canvas/Pearl;
  needs a distinct purpose.
- **Ember** — warm low-light evening identity. *Defer:* warm dark contrast and
  safety-state legibility need care; after Carbon + Canvas.

---

## 5. Skin application map

What a skin governs per surface — and the hard line it must never cross.
**Skins must never weaken safety, approval, or error states** anywhere in this
table.

| Surface | What skin controls | What skin must not control | Notes |
|---|---|---|---|
| Boot screen | Background, ambient tone, motion rhythm | Boot success/failure logic, timing of readiness | Visual identity only; no fake command output. |
| Boot orb / symbol | Orb appearance, shimmer, glow restraint | Whether boot completes; runtime signals | Original Luca symbol only; no competitor mark. |
| Splash / loading | Background, loading motion personality | Actual load state, error fallback | Calm; never terminal-like. |
| Onboarding | Mood, background, preview styling | Onboarding steps, consent/permission flow | Implementation untouched; skin is presentation. |
| Mode select | Visual treatment of mode cards | Which modes exist or what they do | Basic/Pro/Creator semantics unchanged. |
| Main dashboard shell | Background, material, density feel | Layout structure, panel logic, tier gating | Calm default preserved across skins. |
| Composer | Surface material, accent, spacing feel | Control set, behavior, send/stop logic | Composer stays dominant in every skin. |
| Right panel | Material, density tone | Operational truth content, approval visibility | Safety/approval content always legible. |
| Left sidebar | Material, quietness | Capability access, tier gating | Identity only. |
| Settings | Surface, typography mood | Setting values, persistence, controls | Predictable across skins. |
| MiniChat | Material, lightness, motion | Bridge/runtime behavior, approvals | Must stay lighter than dashboard. |
| Luca Widget | Appearance, glow restraint | Presence/entry behavior | Quiet, premium, unobtrusive. |
| Hologram / Presence | Visual style, motion personality | Presence runtime, identity logic | Ambient by default; never deleted. |
| VoiceHUD | Glow, motion, bloom style | Voice runtime, **active-listening visibility** | Active voice state always unmistakable. |
| Mobile shell | Background, material, motion | Navigation, tab logic, touch sizing minimums | Mobile is its own shell, not a reskinned desktop. |
| Notifications / toasts | Surface, accent tone | Severity meaning, error/warning semantics | Danger/warning stay clearly distinct. |
| Permission / approval surfaces | Surrounding surface styling only | **Visibility, prominence, color meaning of approval/deny/danger** | Never softened, dimmed, or recolored into ambiguity. |
| Empty states | Background, tone, copy styling | Honest "not yet connected" messaging | Calm; no dashboard widget creep. |

---

## 6. Skin anatomy

Every skin is defined by these profiles.

### Background profile

- **solid** — flat base color.
- **gradient** — soft static gradient.
- **ambient** — gentle, slow ambient field.
- **liquid** — slow morphing liquid field (Flow).
- **wallpaper-like** — premium OS-style backdrop behind chrome.

### Material profile

- **solid** — opaque surfaces (high readability, low translucency).
- **glass** — translucent with controlled blur.
- **liquid glass** — layered translucency with soft depth (Flow).
- **paper/cream** — matte, low-translucency (Canvas).
- **graphite** — dark translucency over neutral charcoal (Carbon).

### Accent profile

- **primary accent** — active/primary actions.
- **secondary accent** — supporting emphasis, used sparingly.
- **active state accent** — focus / live / selected states.
- **glow restraint** — explicit ceiling on glow; default near-zero except where
  earned (e.g. focused composer, VoiceHUD).

### Motion profile

- **calm** — short, soft, unobtrusive.
- **fluid** — slow morph/parallax (Flow).
- **minimal** — quick and precise (Carbon).
- **premium** — eased, deliberate, never jittery.
- **reduced-motion fallback** — required; disables liquid/morph and heavy
  transitions.

### Typography profile

- **system-clean** — neutral, highly legible (Pearl/Carbon).
- **editorial** — reading-optimized rhythm (Canvas).
- **developer** — comfortable for technical density (Carbon, Pro/Creator).
- **futuristic-calm** — clean and slightly soft (Flow).

### Boot profile

- **boot background** — skin's startup backdrop.
- **boot logo / orb** — original Luca symbol treatment.
- **shimmer** — subtle startup light movement.
- **loading rhythm** — calm pacing; no terminal/command output.

### Widget profile

- **MiniChat** — lighter than dashboard; skin-tinted but quick.
- **Luca Widget** — quiet, premium entry point.
- **VoiceHUD** — signature motion within the skin's restraint.
- **Presence / Hologram** — ambient identity consistent with the skin.

---

## 7. Token model recommendation

Conceptual token groups only — **no implementation here.** These name the
*contract* a skin fills. **Codex should later plan the exact architecture,
resolution order, host/platform behavior, and implementation.**

### Background tokens

- `--luca-skin-bg-base`
- `--luca-skin-bg-elevated`
- `--luca-skin-bg-ambient`
- `--luca-skin-bg-hero`

### Material tokens

- `--luca-skin-glass-opacity`
- `--luca-skin-glass-blur`
- `--luca-skin-border-strength`
- `--luca-skin-shadow-soft`
- `--luca-skin-shadow-float`

### Accent tokens

- `--luca-skin-accent-primary`
- `--luca-skin-accent-secondary`
- `--luca-skin-accent-glow`

### Typography tokens

- `--luca-skin-text-primary`
- `--luca-skin-text-secondary`
- `--luca-skin-text-tertiary`

### Boot tokens

- `--luca-skin-boot-bg`
- `--luca-skin-boot-orb`
- `--luca-skin-boot-highlight`

### Motion tokens

- `--luca-skin-motion-speed`
- `--luca-skin-motion-softness`
- `--luca-skin-motion-glow`

> **Note for implementation.** These tokens should layer *above* the existing
> Luca Material system, not replace it. The existing semantic material roles
> remain the enforcement point for surface hierarchy; skin tokens feed them. Exact
> mapping, fallbacks, reduced-transparency/reduced-motion overrides, and
> light/dark/skin relationships are a separate Codex architecture task (Phase 1).

---

## 8. Accessibility and safety rules

Strict, non-negotiable. A skin that violates any of these is invalid.

- Skins **must preserve WCAG-readable contrast** for text and essential UI in both
  default and active states.
- Skins **must not weaken approval / permission / error / warning / danger
  states** — these keep their meaning, prominence, and color distinction in every
  skin.
- **Active voice / listening must always be visible** and unmistakable.
- **Active vision / screen context must always be visible.**
- **Stop generation must always remain clear** and reachable.
- **Reduced transparency** (host/OS or user setting) **must disable heavy blur**
  and fall back to solid/near-solid surfaces.
- **Reduced motion must disable liquid / morph animation** and heavy transitions,
  across all skins including Flow.
- **Mobile skins must not reduce touch clarity** — minimum touch targets and
  legibility are preserved regardless of skin.
- **Developer dark (Carbon) must not become cyberpunk / hacker** — no neon,
  scanlines, radar, or matrix motifs.
- **Liquid skin (Flow) must not become noisy** — motion stays slow, soft, and
  background-level.
- **Cream skin (Canvas) must not reduce readability** — warmth never costs
  contrast.

---

## 9. Boot and onboarding direction

### Boot

Boot should feel like a **premium OS startup** — quiet intelligence waking.

- Skin-specific **background, orb/symbol, and motion** set the identity from the
  first frame.
- **No terminal-like loading.** No streaming logs, no monospace boot console.
- **No cyberpunk boot sequence.** No matrix rain, scanlines, or HUD targeting.
- **No fake command output.** Boot communicates calm readiness, not theatrics.
- The orb/symbol is the original Luca mark in the skin's treatment; no competitor
  mark or imagery.

### Onboarding

Onboarding should let users **preview skins in a calm, Apple-grade way** — without
copying any competitor's onboarding layout.

- **Skin picker cards** — one calm card per skin showing its mood (background,
  material, accent, type), product-grade names (Pearl / Carbon / Flow / Canvas).
- **Live preview** — selecting a card previews the skin on a representative
  surface (e.g. a calm sample shell + composer) so the choice is felt, not guessed.
- **Opacity / blur preview** — show how the skin's material reads, and how it
  responds to reduced-transparency, so users understand the trade-off.
- **Light / dark / skin relation** — clarify that skins are environments, and how
  light/dark sits within or alongside them (e.g. Pearl light, Carbon dark, Flow
  and Canvas with their own light/dark behavior). The relationship must be
  obvious, not buried.
- **Default skin recommendation** — recommend **Pearl** as the calm default light
  identity (with **Carbon** as the natural dark counterpart). Flow is the
  signature/showcase choice; Canvas is the reading/writing choice.

---

## 10. Naming and brand rules

- Names should feel **product-grade**, like real OS identities.
- **Avoid** generic labels ("theme 1 / theme 2", "dark blue", "preset A").
- **Avoid competitor references** in user-facing names — no Apple, Claude,
  ChatGPT, Gemini, Cursor, or their product/feature names.
- **Avoid cyberpunk / hacker names** (no "Matrix", "Neon", "Ghost", "Stealth").
- **Avoid overly technical names** (no "Skin_v2", "GraphiteGlass_Dark_03").
- **Use names like** Pearl, Carbon, Flow, Canvas — short, evocative, material- or
  mood-rooted, ownable.
- Names should read well together as a family and leave room for the deferred set
  (Aurora, Titanium, Frost, Midnight, etc.) without collisions.

---

## 11. Implementation roadmap

Future work, classified into phases. **This document is Phase 1 only**; nothing
below is authorized by this PR.

### Phase 1 — docs / spec

- This skin system spec.
- Codex token architecture plan (resolution order, host/platform behavior,
  fallbacks, reduced-transparency/reduced-motion, light/dark/skin relationship).
- Boot / onboarding skin integration plan (presentation-level).

### Phase 2 — scaffolding

- Skin config object.
- Skin token registry (layered above the existing material system).
- Settings integration (skin selection).
- Skin preview metadata (names, moods, sample surfaces).

### Phase 3 — first skin rollout

- Pearl.
- Carbon.
- Flow.
- Canvas.

### Phase 4 — boot / onboarding integration

- Boot background.
- Onboarding picker.
- Preview cards.
- Motion / reduced-motion handling.

### Phase 5 — extended skins

- Deferred future skins (Aurora, Titanium, Frost, Midnight, Founder Edition,
  Studio, Solar, Ember), each as its own reviewed effort.

---

## 12. Strict rules

This is a **documentation-only** specification.

This PR does **not**:

- change source / runtime behavior;
- edit `App.tsx`;
- edit `README`;
- touch onboarding implementation;
- touch boot implementation;
- touch voice runtime;
- touch browser runtime;
- touch LucaLink behavior;
- touch memory / governance / model routing / services;
- touch tactical / debug / advanced visuals;
- add screenshots / assets / logos;
- copy Apple, Claude, ChatGPT, Gemini, Cursor, or other competitor UI directly;
- use competitor names in skin names;
- add actual image assets.

### Validation

- **Build:** Not required for a documentation-only change; no build was run.
- **`git diff --check`:** Run; results recorded in the PR.
- **Source/runtime impact:** None. This PR adds a single Markdown file under
  `docs/` and changes no `.ts` / `.tsx`, `App.tsx`, `README`, onboarding, boot,
  runtime, or asset files.
- **Assets:** No screenshots, logos, or image assets added.
</content>

# Presence and Embodiment

> How the one Luca is represented so it reads as a single identity across every
> Surface. The Manifesto's embodiment idea, made visual: a consistent, restrained
> presence that adapts to desktop, web, voice, widget, mobile, and XR without ever
> becoming different characters.

[Invariant 1](../01-constitution/01-the-eight-invariants.md#invariant-1--one-luca-identity)
is absolute: there is exactly one Luca, and every Surface is an embodiment of that
single continuous identity. That invariant is usually discussed as a fact about
architecture — shared [Memory](../02-specification/03-memory-architecture.md),
shared [Runtime](../02-specification/01-persistent-runtime.md), shared state. This
chapter is about the same invariant as a fact about **perception**. If the
architecture guarantees one Luca but the design presents a different character on
each device, the user does not experience one identity. Continuity that is real in
the system but invisible in the experience is continuity the user never receives.

So the design job is precise: give Luca a presence that is unmistakably the same
identity everywhere, while letting each [Surface](../02-specification/06-surface-layer.md)
render that identity in the form its medium allows.

---

## Embodiment, not avatars

The Manifesto frames every device as a [Host](../GLOSSARY.md) that gives Luca a
body. That word — body — is deliberate and it is also a trap. It invites designers
to build a _character_: a mascot, a creature with moods, an emotive face that
performs feeling. LucaOS does not do that, for the reason stated in the
[Design Philosophy](00-design-philosophy.md): a character overclaims. A performed
mood implies feelings; a creature implies aliveness; both violate the
[honesty commitment](../01-constitution/04-trust-and-permissions.md).

The rejection is of _personification_, not of a visible form. This is the precise
distinction the shipped product already draws, and it is worth stating plainly so the
principle is not misread as "Luca has no orb and no face": Luca **does** have a
presence orb and a face, and they are the real, allowed identity marks (named in
[The shipped presence marks](#the-shipped-presence-marks) below). What is rejected is
the _pulsing sci-fi orb_ and the _emotive avatar_ — a mark that performs energy or
feeling. What is kept is a calm, state-honest, reduce-motion-safe presence that shows
what Luca is doing and nothing more.

Embodiment in LucaOS therefore means something quieter than a companion. Luca's
presence is a **calm, coherent mark and a consistent behavior**, not a personified
being. Think of it as the identity of an instrument — recognizable, coherent, and
honest about being an object — rather than the face of a companion. The presence
indicates state (present, attending, listening, acting) without performing an inner
life.

```mermaid
flowchart TD
  ID[One Luca identity] --> M[Identity constants:<br/>mark, palette, type, voice, motion character]
  M --> D[Desktop embodiment]
  M --> W[Web embodiment]
  M --> V[Voice embodiment]
  M --> G[Widget embodiment]
  M --> Mo[Mobile embodiment]
  M --> X[XR embodiment]
  D & W & V & G & Mo & X --> U[User experiences ONE Luca]
```

---

## The identity constants

What makes Luca read as one identity is a small set of constants that hold across
every Surface. These are the load-bearing elements of continuity; they change
slowly and deliberately, never per-Surface for convenience.

| Constant | What it is | Why it must be shared |
|---|---|---|
| **The mark** | Luca's presence signature — the calm liquid-plasma orb and the plasma face (see [The shipped presence marks](#the-shipped-presence-marks)), used as presence indicator and identity anchor | It is the fastest signal that this is the same Luca |
| **Palette** | The calm, restrained color system (see [Design Tokens](02-design-tokens.md)) | Color is recognized pre-consciously; a shifted palette reads as a different app |
| **Typography** | The type family and scale | Type carries the premium, calm register everywhere text appears |
| **Voice** | How Luca speaks — its verbal identity (see [Voice and Tone](04-voice-and-tone.md)) | On voice-only Surfaces this _is_ the identity; it must match the words on screen |
| **Motion character** | The easing and pacing signature (see [Motion and Timing](03-motion-and-timing.md)) | How Luca moves is as recognizable as how it looks |
| **Presence behavior** | How Luca indicates present / attending / listening / acting | Consistent behavior is continuity the user can feel across devices |

A Surface may vary **density, layout, input modality, and fidelity**. It may not
vary the identity constants. That division — constants fixed, presentation adapted
— is the whole discipline of this chapter.

---

## The shipped presence marks

This chapter describes the _discipline_ of Luca's presence; the shipped LucaOS
codebase already provides the concrete marks that satisfy it, and the design system
defers to them rather than inventing a parallel one. There are two, and both are the
real, allowed embodiments of the one Luca — not the rejected sci-fi cliché.

- **The presence orb** — a calm **liquid-plasma orb** rendered on an HTML canvas.
  Two sibling implementations of the same visual are live: `WidgetVisualizer`
  (the compact Dictation-widget orb) and `VoiceVisualizer` (the larger VoiceHUD
  "core"). Both draw honest states directly from operational signals — standby,
  listening/VAD-active, and speaking/amplitude-reactive — and both collapse their
  motion under reduced motion. `LucaPresenceOrb` is a newer generic CSS placeholder
  slated to be replaced by a browser-safe extraction of the canvas orb; treat the
  canvas orb as the source of truth. (Source audit:
  [`docs/foundation/LUCA_ORB_AND_POST_BOOT_VISUAL_SOURCE_AUDIT.md`](../../docs/foundation/LUCA_ORB_AND_POST_BOOT_VISUAL_SOURCE_AUDIT.md).)
- **The face** — `HologramFace`, a 3D avatar (`public/models/avatar.glb`) shaded by
  `lucaFacePlasmaMaterial` on its own mesh, with a low-performance 2D fallback. This
  is a **calm plasma presence, not an emotive avatar**: it carries identity, not
  moods. The obsolete scanline/grid/glitch hologram material has been **retired** —
  that glitch treatment was the pulsing sci-fi failure mode this chapter rejects, and
  removing it is exactly the correction the chapter argues for. (Material:
  [`docs/design/luca-liquid-glass-material.md`](../../docs/design/luca-liquid-glass-material.md).)

Both marks are composed over Luca's [liquid-glass material](../../docs/design/luca-liquid-glass-material.md):
the substrate owns colour, identity, and state; the optics add a disciplined rim and
glint; safety, status, and listening meaning stay on their governed tokens, never on
the glass. Neither mark is decoration and neither performs an inner life. The line the
shipped system draws is the same one this chapter draws: **calm and state-honest is
allowed; pulsing, glowing, glitching, or emoting is not.**

---

## The presence indicator

Across graphical Surfaces, Luca's presence is shown by a single restrained
indicator built from the mark. It has a small number of honest states, and it never
performs beyond them.

- **Present (at rest).** Luca is there and available. The default. The indicator is
  quiet — a calm, static or near-static mark. It does not pulse for attention;
  Presence is felt lightly (see [Design Philosophy](00-design-philosophy.md),
  Principle 1).
- **Attending.** Luca is actively considering the user's input. A gentle, settled
  motion — never a frantic spinner, never a "thinking" spectacle. It communicates
  "working," not "look how hard I am working."
- **Listening (voice).** On Surfaces that accept speech, a calm state that honestly
  reflects that audio is being captured. Because listening touches privacy, this
  state is unambiguous and never hidden — the user always knows when Luca is
  listening.
- **Acting.** Luca is taking an action in the user's world. This state is legible
  and paired with [Provenance](../GLOSSARY.md); when the action is gated, the
  [permission](../01-constitution/04-trust-and-permissions.md) moment is distinct
  and honest, never disguised as ambient decoration.

What the presence indicator is **not**: a mood ring, an _emotive_ orb, a
performing face, or a loading show. The distinction is between form and behavior —
the calm liquid-plasma orb and the plasma face are allowed marks; what is forbidden is
making either of them pulse, glow, or emote to perform an inner life. The indicator
reflects operational state truthfully and calmly. It never implies Luca feels anything
about that state.

---

## One identity, many Surfaces

Each Surface renders the same identity in the form its medium allows. The detail
lives in [Surface Guidelines](05-surface-guidelines.md); here is how embodiment
specifically adapts while staying one Luca.

### Desktop and web

The fullest visual embodiment: the mark, the full palette, the type scale, and the
full presence-state vocabulary. Luca sits as calm chrome around the user's content,
deferring to it (Principle 4). Desktop and web should feel like the same Luca at
different densities, not two products.

### Voice

Here the visual constants recede and the **voice becomes the identity**. There is no
mark to look at, so continuity is carried entirely by how Luca sounds and what it
says — its verbal identity from [Voice and Tone](04-voice-and-tone.md), and, where a
screen is present (a voice HUD on a phone or car display), a minimal calm visual
that matches. The voice-HUD is deliberately spare: a small honest indication of
listening/attending/speaking, never a pulsing sci-fi orb. The same personality that
writes Luca's text speaks Luca's audio; a user must not meet a warmer or colder Luca
by switching to voice.

### Widget

The most compressed embodiment: a small, glanceable surface. The mark and a single
honest state may be all that fits. The discipline is to compress without mutating —
the widget is a small window onto the one Luca, not a lite sibling with its own feel.
It shows only what is honestly current and defers the rest to a fuller Surface.

### Mobile

Touch-first, one-handed, interruption-prone. Embodiment adapts to larger touch
targets and a denser attention economy, but the mark, palette, type, and presence
behavior are the same identity the user knows from the desktop. Switching devices
mid-task should feel like continuing, not re-meeting.

### XR

The most speculative Surface, and the one where the honesty commitment is most
tested. Spatial computing invites a literal embodied "being" standing in the room —
exactly the personified character LucaOS refuses. In XR, Luca is present spatially
but remains an **honest, abstract presence**, not an anthropomorphic avatar
performing life. It occupies space calmly, respects the user's environment and
attention, and indicates state with the same restrained vocabulary used everywhere
else. XR support is a forward-looking target; see the
[Roadmap](../06-roadmap/README.md) for where the current build stands.

---

## Voice-HUD and avatar considerations, kept honest and calm

Two temptations recur wherever Luca gets a richer body — a voice HUD or any avatar
treatment. Both are governed by the same rules:

- **Indicate, do not emote.** The visual may show that Luca is listening,
  attending, or speaking. It may not show that Luca is happy, sad, curious, or
  eager. Operational truth, not feeling.
- **Recede when idle.** A voice HUD or spatial presence returns to a calm resting
  state promptly. It does not idle-animate to stay interesting.
- **Never fake attention or listening.** The listening state must correspond to
  Luca actually capturing audio. A presence that _looks_ like it is listening when
  it is not, or hides that it is, is a trust violation — this is honesty and
  privacy at once.
- **Match the words.** Whatever the HUD shows must agree with what Luca says and
  does. Divergence between the visible presence and the actual behavior fractures
  the single identity.

---

## Failure modes to catch

- **Per-Surface characters.** A playful mobile Luca and a serious desktop Luca are
  two Lucas. The identity constants must hold.
- **Personification creep.** The face gaining eyes or expressions, a "breathing" idle
  animation, an emotive color that implies mood — each is a step from the allowed calm
  plasma face toward the emotive avatar LucaOS refuses.
- **Cyberpunk presence.** A _pulsing sci-fi_ orb, a scanning HUD, neon "AI energy,"
  the retired scanline/glitch hologram treatment. This is the
  [rejected aesthetic](00-design-philosophy.md) and it also overclaims — distinct from
  the calm liquid-plasma orb, which is the allowed mark.
- **Continuity theater.** Showing a "synced across your devices" flourish that
  implies more continuity than the system actually delivers. Show continuity only
  where it is [real](../02-specification/09-continuity-and-sync.md); where it is a
  target, do not imply it is present.
- **Divergent voice.** A different tone in the voice embodiment than in text. One
  identity means one personality across modalities and across underlying
  [models](../02-specification/04-provider-abstraction.md).

---

## See also

- [The One Identity Principle](../00-manifesto/04-the-one-identity-principle.md)
- [Invariant 1 — One Luca Identity](../01-constitution/01-the-eight-invariants.md#invariant-1--one-luca-identity)
- [Design Philosophy](00-design-philosophy.md) — the honesty and calm principles this chapter applies
- [Voice and Tone](04-voice-and-tone.md) — the verbal half of the identity
- [Surface Guidelines](05-surface-guidelines.md) — per-Surface adaptation in detail
- [Identity and Embodiment (Specification)](../02-specification/02-identity-and-embodiment.md)
- Shipped source of truth: [Luca Orb & Post-Boot Visual Source Audit](../../docs/foundation/LUCA_ORB_AND_POST_BOOT_VISUAL_SOURCE_AUDIT.md) (the real orb + `HologramFace`) · [Luca Liquid Glass Material](../../docs/design/luca-liquid-glass-material.md) (`lucaFacePlasmaMaterial`, retired glitch material)

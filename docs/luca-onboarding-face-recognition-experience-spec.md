# Luca Face Recognition — Onboarding Experience Spec (P5c)

**Type:** Design specification (documentation-only)
**Status:** Design spec. No source/runtime/UI/onboarding behavior changes. Defines the calm, conversational face-recognition moment for the premium onboarding flow. Implementation is staged as P5c and reuses the existing FaceScan capability.
**Date:** 2026-06-25

Read together with:
- `docs/luca-premium-onboarding-functional-handoff-map.md` (P5)
- `docs/luca-onboarding-presence-visual-language-spec.md` (the three-state presence)
- `docs/luca-premium-onboarding-postboot-design.md` (Face Scan → optional presence; "not security-grade")
- `src/components/Onboarding/FaceScan.tsx` (existing capability — reuse, do not rebuild)
- `src/components/Onboarding/OnboardingRuntimeAdapter.ts` (`saveFaceScanData`)

> Product direction: **"LucaOS should feel like a quiet operating system for intelligence, not a dashboard for controlling intelligence."**

---

## 1. Concept

LucaOS is a being that inherits a host device and uses it as its body. Face
recognition is the calm moment that being learns to **recognize its owner** —
not a security checkpoint. It should feel like a futuristic AI speaking casually
to you, the way Apple's Face ID setup feels guided and reassuring, not like a
scanner verifying a subject.

> **One line:** "Luca is learning your face so it knows it's you." Never "facial
> verification required."

This is **optional and never compulsory.** Skipping is a first-class, guilt-free
choice that does not weaken any feature.

---

## 2. Experience principle

- **Luca speaks, calmly and in first person.** The copy is Luca talking *to*
  you, casually: "Mind if I learn your face? It helps me know it's really you
  when I'm here." Not "Facial Recognition Setup."
- **The being is present, not a camera UI.** Luca's identity presence (the
  hologram face) and the calm voice/orb language frame the moment; the camera
  is a quiet instrument, not the hero.
- **Recognition, not security.** Framed as Luca getting to know its owner, not
  as authentication. It is explicitly *not* security-grade (matches the
  post-boot design note).
- **Consent and clarity first.** Before the camera turns on, Luca says plainly
  what it will do, what is stored, and where, and that you can forget it anytime.
- **Calm motion only.** A gentle settle as recognition completes; nothing
  pulses, scans aggressively, or uses targeting-reticle/biometric-grid theatrics.
  Reduced motion always wins; Flow stays static.

---

## 3. The calm flow (Luca's voice)

```text
1. Invitation (no camera yet)
   Luca (identity presence): "Since I live on this device now, I can learn your
   face so I always know it's you. Want me to?"
   Primary: "Sure, learn my face"   Secondary: "Maybe later"

2. Consent & clarity (still no camera)
   A calm line: what's captured (a face signature), where it's stored
   (on this device), that it's optional and you can ask Luca to forget it
   anytime. "Not used as a security lock."

3. Recognition (camera on, calm)
   Luca: "Look at me for a second…" — a soft, single settle as it captures.
   No reticle, no countdown, no alarm states.

4. Recognized (gentle confirmation)
   Luca: "Got it — I'll recognize you now." with a calm presence settle.
   Primary: "Great"   Secondary: "Retake"

   Skip at any point → "No problem, I can learn it later in Settings."
```

Mobile/Capacitor: the same flow uses the native camera via the platform
capability layer; copy and calm framing are identical, bottom-safe actions.

---

## 4. Reuse, don't rebuild

- The existing `FaceScan.tsx` already provides camera availability checks,
  capture, confirm, retake, skip, and a friendly description. P5c **wraps/reframes**
  it in the premium presence + Luca-voice copy above; it does not replace the
  capture plumbing.
- Persistence stays on the existing `saveFaceScanData` adapter hook (web →
  local device storage; desktop → adapter). No new storage path, no cloud upload
  introduced by this spec.
- Presence comes from `LucaPresence` (identity state) already built; the moment
  reuses the three-state presence language, not a new visual system.

---

## 5. Privacy, consent, accessibility

- **Optional, skippable, revocable.** Skipping never blocks onboarding or any
  feature. "Forget my face" must be available later (Settings).
- **Plain about storage.** State what is kept and where, in one calm line, before
  the camera activates. No dark patterns, no pre-checked capture.
- **Not security-grade.** Never framed or used as an authentication gate; status/
  safety semantics are unaffected.
- **Accessibility.** Full keyboard/skip path; reduced motion respected; the
  camera step is never the only way forward.
- **Permission honesty.** If the camera permission is denied or unavailable,
  Luca stays calm ("That's okay — I can do this later") and continues; this is an
  attention state, not a failure.

---

## 6. Where it slots into onboarding

This is the **optional identity moment** in the P5 functional tail: it runs only
if the user opts in, on any platform with a camera, independent of the local-model
provisioning path. It is presentational + consent-gated and carries no status/
safety semantics.

## 7. Rules honored

Documentation-only. `git diff --check` clean. Adds one doc under `docs/`. No
source, runtime, UI, routing, camera, storage, or onboarding behavior changes;
the existing FaceScan capability and `saveFaceScanData` are referenced for reuse,
not modified.

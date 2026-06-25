# Luca Local Intelligence Setup — Onboarding Experience Spec (P5b)

**Type:** Design specification (documentation-only)
**Status:** Design spec. No source/runtime/UI/onboarding behavior changes. Defines the calm, optional local-model setup moment for the premium onboarding flow. Implementation is staged as P5b and reuses the existing provisioning capability.
**Date:** 2026-06-25

Read together with:
- `docs/luca-premium-onboarding-functional-handoff-map.md` (P5)
- `docs/luca-onboarding-face-recognition-experience-spec.md` (P5c, sibling moment)
- `docs/luca-onboarding-presence-visual-language-spec.md`
- `src/components/Onboarding/OnboardingRuntimeAdapter.ts` (`resolveLocalHardwarePlan`, `buildLocalProvisionPlan`, `applyLocalProvisionPlan`, `supportsLocalProvisioning`)
- `src/components/Onboarding/OnboardingSystemPanels.tsx` (`HardwareScanPanel`, `OllamaInstallPanel`, `OllamaWakePanel`), `OnboardingLocalPlanReviewPanel.tsx`, `OnboardingProvisioningPanel.tsx`

> Product direction: **"LucaOS should feel like a quiet operating system for intelligence, not a dashboard for controlling intelligence."**

---

## 1. Concept

Choosing how Luca thinks is a calm preference (premium `intelligence_route`).
Actually setting up **local models is optional** and never blocks first run. Luca,
the being inhabiting this host, can look at the body it now lives in, see what
local intelligence resources are already there, and either connect to them or
help set them up — or step aside and run on Luca Prime / a cloud model for now.

> **One line:** "Luca can think locally on this device, but it never has to —
> and it never makes you wait to begin."

---

## 2. Two paths, by what the host already has

After a user expresses interest in local intelligence (or any time on a capable
host), Luca quietly checks the host (`resolveLocalHardwarePlan`) and branches:

### A. Power / Pro user — resources already present
- Luca **scans the host** and finds existing local capability (e.g. an Ollama
  runtime, capable GPU/RAM, already-installed models).
- Luca **recommends connecting** to what's there, calmly: "I can see you've
  already got local models here — want me to use them?"
- **Connect** applies the detected plan (`applyLocalProvisionPlan`) with no
  forced download. Nothing is installed without consent.

### B. Normal user — no local setup yet
Luca presents a calm choice, no pressure:
- **Set it up now** — Luca explains it takes normal install/download time and is
  honest about size/duration, then runs the existing provisioning flow
  (`HardwareScanPanel → LocalPlanReview → OllamaInstall/Wake → ProvisionLocal`).
- **Skip for now** — continue on **Luca Prime** (the recommended cloud default),
  or **connect your own cloud models**, and **set up local later in Settings**.
  Skipping never blocks or degrades onboarding.

Either way the choice is optional, reversible, and clearly explained.

---

## 3. Experience principle

- **Optional and non-blocking.** Local setup never gates first run. The default
  remains Luca Prime / cloud; local is an enhancement the user opts into.
- **Detect, then recommend — never force.** On capable hosts Luca surfaces what
  exists and suggests connecting; it never downloads or starts a model without
  explicit consent.
- **Honest about time and size.** If a user chooses to install now, Luca states
  plainly that it takes normal installation time and how large the download is —
  no hidden long waits.
- **Calm, Luca-voice, presence-framed.** Reuses the premium presence + voice
  language; no terminal logs, no "provisioning kernel" jargon in the default path
  (advanced/technical detail stays in Pro/Creator or a Details disclosure).
- **Set up later is first-class.** "Do it later in Settings" is always offered and
  never framed as incomplete or failed.

---

## 4. Platform behavior

- **Desktop (Electron):** `supportsLocalProvisioning` is true — both paths A and B
  are available; the existing provisioning panels run.
- **Web / Capacitor mobile:** `supportsLocalProvisioning` is false — local
  provisioning is unavailable on the host. Luca says so calmly and routes to Luca
  Prime / cloud, offering "set up local later" without implying failure (consistent
  with Web Safe Mode honesty).

---

## 5. Reuse, don't rebuild

- Detection, plan building, and provisioning reuse the existing adapter hooks
  (`resolveLocalHardwarePlan`, `buildLocalProvisionPlan`, `applyLocalProvisionPlan`)
  and the existing panels (`HardwareScanPanel`, `OnboardingLocalPlanReviewPanel`,
  `OllamaInstallPanel`, `OllamaWakePanel`, `OnboardingProvisioningPanel`). P5b
  reframes the entry/exit in Luca's calm voice and presence; it does not rebuild
  provisioning.
- Route selection comes from the premium `intelligence_route` choice already
  collected; this step only executes the local path when chosen and supported.

---

## 6. Consent, safety, accessibility

- Nothing installs, downloads, or starts without explicit consent.
- No provider keys, model downloads, or local runtime starts are implied by the
  preference alone — execution is a separate, consented action.
- Skip / later paths are always available and keyboard-accessible; reduced motion
  respected; Flow static.
- Status/safety semantics are untouched; degraded/unavailable states are honest,
  not alarming.

---

## 7. Where it slots into onboarding

This is the **mode-gated local path** of the P5 functional tail: it runs only when
the user chose a local route AND the host supports provisioning, and it is itself
fully optional/skippable. The sibling optional moment is face recognition (P5c).

## 8. Rules honored

Documentation-only. `git diff --check` clean. Adds one doc under `docs/`. No
source, runtime, UI, provisioning, provider, model, or onboarding behavior
changes; existing provisioning capability is referenced for reuse, not modified.

# Premium Onboarding — Functional-Step Handoff Map (P5)

**Type:** Integration map (documentation-only)
**Status:** Planning. No source/runtime/UI/onboarding behavior changes. This maps the legacy functional onboarding steps the premium flow does not yet perform, classifies them, and proposes how to hand off — pinning the one product decision needed before P5 code.
**Date:** 2026-06-25

Read together with:
- `docs/luca-premium-onboarding-productionization-plan.md` (P1–P8)
- `docs/luca-premium-onboarding-postboot-design.md`
- `src/components/Onboarding/OnboardingFlow.tsx`, `OnboardingRuntimeAdapter.ts`
- `src/services/onboarding/OnboardingController.ts`

---

## 1. The premium flow vs the legacy flow

The premium flow (`LucaPremiumOnboardingPreview`) collects **choices/preferences**: environment (skin), presence, permission style, memory boundaries, tool intent, intelligence route, and an optional name. The legacy `OnboardingFlow` additionally performs **functional work** through the `OnboardingRuntimeAdapter`. P5 is about preserving that functional work where it is actually needed, not deleting it.

## 2. Legacy functional steps, classified

| Step | What it does (adapter hook) | When it is needed | Class |
| --- | --- | --- | --- |
| `FACE_SCAN` | Optional camera identity (`saveFaceScanData`, `persistOperatorIdentity`) | Only if the user opts into a camera/face presence | **Optional** |
| `COGNITIVE_CORE_SELECTION` | Choose cloud vs local intelligence | Overlaps the premium `intelligence_route` choice | **Replaced by premium** |
| `HARDWARE_SCAN` | `resolveLocalHardwarePlan()` | Only for a local model route | **Mode-gated (local)** |
| `LOCAL_PLAN_REVIEW` | `buildLocalProvisionPlan` / `applyLocalProvisionPlan` | Only for a local model route | **Mode-gated (local)** |
| `OLLAMA_INSTALL` / `OLLAMA_WAKE` / `PROVISION_LOCAL` | Download/start a local model | Only for a local route, and only where `supportsLocalProvisioning` | **Mode-gated (local, desktop)** |
| `MODE_SELECT` | text/voice | Premium `presence` already implies this | **Replaced by premium** |
| `CONVERSATION` | First conversation (`ConversationComponent`) | Optional warm intro | **Optional** |
| `CALIBRATION` | Final calibration | Finish tail | **Optional/finish** |

## 3. The key finding

The heavy functional steps are **all conditional on choices the premium flow already collects**, and the local ones are gated by `OnboardingRuntimeAdapter.supportsLocalProvisioning` (false on web). Consequences:

- **Basic + cloud route + web/Capacitor:** essentially **no** heavy functional step is required. Face scan is optional, local provisioning is off, conversation/calibration are optional. The premium flow + completion bridge (P1/P4/P6) is already close to functionally complete for this path.
- **Local model route (desktop):** the provisioning chain (`HARDWARE_SCAN → LOCAL_PLAN_REVIEW → OLLAMA_* → PROVISION_LOCAL`) is the real functional work that must still run.
- **Optional identity (any platform):** face-scan capture is opt-in only.

So P5 is **not** a monolithic re-implementation — it is a small, conditional "functional tail" that runs only the steps a user's choices require, reusing the existing adapter hooks.

## 4. Proposed handoff design

After the premium flow completes, route into a conditional tail driven by the collected choices + adapter capabilities:

```text
premium choices (P1–P6)
      ↓ on finish
  needs local provisioning?  (route == local_model && adapter.supportsLocalProvisioning)
      ├─ yes → run HARDWARE_SCAN → LOCAL_PLAN_REVIEW → OLLAMA_*/PROVISION_LOCAL  (reuse legacy panels/adapter)
      └─ no  → skip
  opted into camera identity? → optional FACE_SCAN  (else skip)
      ↓
  complete (existing completion bridge + routing)
```

The tail reuses the existing legacy panels and adapter methods; the premium flow owns only the calm choice screens. Cloud/web/Basic users reach completion with no extra steps.

## 5. The one product decision to pin (with recommendation)

**How should the functional steps be presented relative to the premium flow?**

1. **Conditional tail (recommended).** Append only the required functional steps after the premium choices, gated by route + `supportsLocalProvisioning`. Keeps Basic/cloud/web calm and short; preserves local provisioning where needed. Lowest user-facing change.
2. **Relocate to Settings.** Premium flow finishes immediately; local provisioning / face scan move to a post-onboarding Settings task. Calmest first run, but defers real setup the user asked for.
3. **Advanced/Pro gate.** Functional steps appear only in Pro/Creator or behind an "Advanced setup" entry. Risk: a Basic user who chose a local route never provisions it.

**Recommendation: option 1 (conditional tail).** It honors "Basic stays calm" while not dropping the functional work a local-route user explicitly chose, and it reuses the existing adapter + panels rather than rebuilding them.

## 6. Staged P5 sub-PRs (after the decision)

- **P5a** — pure `resolveOnboardingFunctionalTail(choices, adapter)` helper: given the premium choices + adapter capabilities, returns the ordered list of functional steps required (pure, testable, dormant).
- **P5b** — wire the tail into the premium flow behind the existing flag, reusing the legacy provisioning panels/adapter for local routes.
- **P5c** — optional face-scan opt-in.
- **P5d** — QA across routes × platforms (cloud/local × web/desktop) + reduced-motion.

## 7. Rules honored

Documentation-only. `git diff --check` clean. Adds one doc under `docs/`. No source, runtime, UI, routing, provider, or onboarding behavior changes. The legacy flow remains the default until the rollout step (P7).

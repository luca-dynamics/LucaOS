# LucaOS Foundation ⇄ Established Docs — Reconciliation Map

> **Status: plan of record.** This is the analysis behind the reconciliation of
> the new `foundation/` canon with the pre-existing LucaOS documentation. It was
> produced by a read-only audit; it edits nothing by itself.
>
> **Chosen approach:** keep the Foundation's generic, code-portable terms as
> primary and bridge to the native/product names with a [Crosswalk](CROSSWALK.md),
> rather than renaming every chapter. Execution proceeds in reviewable phases:
> **(1) map + crosswalk** ← *this phase*; (2) absorb missed doctrine; (3) reconcile
> the design system to the shipped design language; (4) correct current-state
> claims and record pruning ADRs. The Cortex auth question in §F is a security
> item to verify on its own track, not a doc edit.

Consolidated from a four-way read-only audit of the ~213 pre-existing docs
(`docs/`, `ops/docs/`, `research/docs/`) against the new `foundation/`.

## The shape of the problem

The new Foundation is a **clean-room re-derivation** of the same thesis. It is
philosophically deeper and, in several places, more code-accurate and more
rigorous than the established docs. But it was written without reading the
existing canon, so it:

1. **Dropped the native subsystem vocabulary that is live in code and UI** — Luca
   Guard, Mission Engine, Mission Tape, Memory Vault, LucaLink (as a protocol),
   Skills Runtime, Embodiment Layer, Evolution Core, Soul/Now Layer. These are
   not dead docs: `src/services/lucaGuard/`, `missionEngine/`, `missionTape/`,
   `memory/MemoryVaultService.ts`, `neuralSelfRepairService.ts` all exist.
2. **Collided on four load-bearing terms** (same word, different meaning).
3. **Missed whole constitutional doctrines** (operating modes, Mission Doctrine,
   guarded self-evolution).
4. **Contradicted the shipped product identity** in the design system.
5. Created a **second, competing canon** (`foundation/` vs `docs/foundation/`).
6. Made a few **current-state claims that the audits/code contradict** — ironic
   given the honesty pillar.

Not everything is a mistake: several omissions are *correct pruning*, and several
Foundation positions are *stronger* than the established docs and should win.

---

## A. Term collisions — same word, two meanings (resolve first; highest risk)

| Term | Established meaning | Foundation meaning | Resolution |
|---|---|---|---|
| **Cortex** | The reasoning/planning/routing brain (top of the layer map) | The optional Python local-intelligence sidecar (RAG/voice/vision/local models) | Foundation's matches the code. Correct the established glossary; keep "Cortex = local-intelligence sidecar." Record as ADR. |
| **Embodiment** | The **actuation** layer: Direct Host / Sandbox Body / Ghost Browser / Remote Delegation (how Luca *acts on* environments) | Identity across **display Surfaces** (how Luca is *present*) | Keep two distinct terms: **Surface** = presence/display; **Embodiment Layer** = actuation. Foundation is missing the actuation layer entirely — and with it the safety-critical "risky work defaults to Sandbox Body, not Direct Host" rule. Add it. |
| **Skill** | An installable/imported unit with a **contract + sandbox** (Skills Runtime) | An emergent **learned competency** | Disambiguate; adopt the established Skill Contract (`id/source/permissions/tools/memory_policy/risk_level/sandbox/version`) + signature/trust gating for third-party skills/MCP. |
| **Surface** | A **named product surface** (Composer, MiniChat, VoiceHUD, Luca Screen, Ghost Browser, the 3-panel zone model) | A **device modality** (desktop/web/voice/widget/mobile/XR) | Rename Foundation's axis to "Surface modalities / Hosts"; enumerate the named surfaces as the concrete instances. |

---

## B. Direct conflicts where the Foundation contradicts the shipped product

1. **The design system rejects the product's identity marks.**
   `03-design-system/01-presence-and-embodiment.md` repeatedly condemns "the orb"
   and "the face" as cyberpunk failure modes — but the shipped Luca embodiment
   *is* a calm liquid-plasma **presence orb** (`WidgetVisualizer`/`VoiceVisualizer`/
   `LucaPresenceOrb`) and a **HologramFace** (`avatar.glb` + `lucaFacePlasmaMaterial`,
   glitch material already retired). As written, the Foundation disowns the real
   identity. Fix: distinguish the *calm, state-honest, reduce-motion-safe orb/face*
   (allowed — arguably exactly what the Foundation wants) from the *pulsing sci-fi
   orb* it rejects.
2. **"No glow / no rim"** in `02-design-tokens.md` contradicts the governed
   **liquid-glass material**, which permits disciplined rims/specular/glint and
   reserves glow for presence/focus surfaces (frozen under reduced motion).
3. **The LUCA acronym.** Established: "LUCA = Large Universal Control **Agents**"
   (plural) — directly against the Foundation's "exactly one Luca, never plural."
   Here the Foundation is arguably *right*; retire the acronym explicitly (ADR),
   don't leave it contradicting the singularity thesis in canon.
4. **Divergent design constants** (silent second source of truth): `radius-lg`
   16 vs established 14; motion base 220 vs 200 / fast 140 vs micro 120; status
   tokens `positive/caution/critical` vs the real `--luca-success/-danger/-warning/-info`
   (+ missing `info`); token names `--surface-background`/`--color-neutral-500`
   that **do not exist in code** vs the real `--luca-*` resolver
   (`src/config/lucaAppearanceTokens.ts`). Defer to the real values.

---

## C. Major gaps — real doctrine/subsystems the Foundation must absorb

**Doctrine (constitutional in the established docs, live in code):**
- **Mission Engine + Mission Doctrine** — `plan → execute → verify → recover →
  record`, atomic-operation contract, verification gates, checkpoint/rollback —
  and **Mission Tape** (the auditable mission record). The single largest
  omission. Foundation documents a generic turn loop, not this orchestration tier.
- **Operating modes / experience tiers** — Origin/Tactical/Core, *renamed* by the
  code-backed source-of-truth doc to **Creator / Pro / Basic**
  (`docs/product/lucaos-experience-modes.md`; build layer
  `public_standard/public_tactical/origin`). The Foundation's safety/trust chapters
  use a single undifferentiated "operator" and miss the **Creator/Origin
  source-authority tier** that gates self-evolution and mesh ownership.
- **Guarded self-evolution** — Evolution Core; Origin/Creator-only, sandboxed,
  rollback-required, no autonomous public mutation. A Constitution-level principle,
  entirely absent from the Foundation.

**Subsystems:**
- **Luca Guard** — the *named* safety subsystem. Behaviorally the Foundation is
  *stronger* (transcript-not-authority, injection-bypass removal, category floors,
  behavior-inspecting destructive detection), but it drops the name and misses:
  intrinsic **risk classes** (safe/sensitive/dangerous), **asset trust tiers**
  (Trusted/Verified/Untrusted), **signature verification** for skills/MCP/adapters,
  **sandbox enforcement**, **in-execution anomaly detection**, **post-execution
  audit persistence**.
- **LucaLink mesh** — trust ladder (guest/paired/trusted/admin/owner), **12 sync
  lanes each with a per-lane conflict policy**, host roles/routing, and the
  **Primary Host vs Origin** authority distinction. The Foundation's 3-value
  `SyncEnvelope.kind` is a reduced sketch of the real `luca-link/v1` model.
- **Memory Vault** — human-readable, user-editable, exportable memory + connected-app
  ingestion + compression (live: `MemoryVaultService.ts`, `UnifiedMemoryVaultPanel.tsx`).
  Foundation's Archive chapter omits this presentation/ingestion layer. (Note:
  Foundation's **tiers identity/durable/transient match the code exactly** —
  `memoryWriteCapacity.ts` — so Soul Layer ≈ identity, Now Layer ≈ transient; map
  and mark Soul/Now superseded, but Memory Vault is *not* superseded.)
- **Computer-use execution model** — embodiment modes, **sandbox-body-by-default
  for risky work** (a safety requirement), verification-first completion,
  checkpoint/replay, cursor-guided grounding.
- **The whole shipped design language** — the **skin system** (Pearl/Carbon/Flow/
  Canvas + `--luca-skin-*` layer, the top-level identity architecture), the
  **liquid-glass material**, the **fluid-interaction standard** (direct
  manipulation, interruptibility, spatial continuity; the
  `lucaPresenceMotion`/`lucaFluidMotion` split), the **three-axis theme model**,
  the **named surfaces + 3-panel zone model**, the **tier disclosure model**
  (density/disclosure, not loudness), and safety-state visibility invariants
  (listening always visible, stop always clear, approval never skin-dimmed;
  reduced-transparency control).

---

## D. Duplication — pick one canonical home

| Concern | Established | New | Canonical | Action |
|---|---|---|---|---|
| Constitution | `docs/foundation/CONSTITUTION.md` | `foundation/01-constitution/*` | `foundation/` | Migrate surviving native doctrine (Luca Guard, Mission Doctrine, modes, evolution) across, then stub the old file with a pointer |
| Glossary | `docs/foundation/GLOSSARY.md` | `foundation/GLOSSARY.md` | `foundation/` | Merge native vocabulary in; stub old |
| Architecture | `docs/foundation/ARCHITECTURE.md` | `foundation/02-specification/*` | `foundation/` | Add crosswalk/layer map; stub old |
| Agent onboarding | `docs/foundation/AGENTS.md` (Codex read-order) | `foundation/CLAUDE.md` + root `CLAUDE.md` + `LUCA.md` | `foundation/` | Emit a real `AGENTS.md` mirroring `CLAUDE.md` (for Codex); stub the old one |
| Eng standards | `ops/docs/.ai-assistant-rules.md` (stale: mandates wiring tools through `geminiService.ts` — a vendor service that now *violates* provider abstraction) | `foundation/CONTRIBUTING.md` | `foundation/` | Stub with pointer; retire the vendor-coupled rule |
| Design system | `docs/design/*` + `docs/luca-skin-*` (real, typed) | `foundation/03-design-system/*` (illustrative) | Split: Foundation keeps ethos/pedagogy; **defers to** `docs/design/*` for real tokens/skins/material | Replace illustrative constants with pointers to the real system |
| Absorb / competitive roadmap | `docs/absorb/Luca_Absorb_Architecture_v12.md` (4,370 lines) | — | Keep as non-canonical research | Relocate any *doctrine* it asserts into a clearly "aspirational" roadmap appendix |

---

## E. Foundation current-state claims to correct (honesty pillar)

1. **`09-continuity-and-sync.md`** names the live relay as `lucaLink/manager.ts`;
   the audit says the operative runtime singleton is **`lucaLinkService.ts`**
   (`manager.ts` is the secondary structured stack). Wrong module attributed.
2. **`09`** presents "additive merge" as the whole conflict model; the real
   protocol assigns policy **per lane** (primary-host-wins / last-write-wins /
   append-only / merge / no-conflict). Over-generalized.
3. **`09`** calls the device-trust layer "extensive"; the PR#182 audit lists
   revocation, per-device permissions, trust ladder, key rotation as
   **target/missing**. Possible overclaim — verify.
4. **`02-identity-and-embodiment.md`** presents spawned-agent fold-back as an
   operating mechanism; the orchestration audit says governed multi-agent
   orchestration **does not exist** (only an ungoverned `LucaWorkforce` scaffold).
   Add an honesty marker.
5. **`04-provider-abstraction.md`** "Model Router" singular understates that
   routing is fragmented across `ModelManagerService` (real hub, ~25 importers) +
   `ModelRouterService`/`CapabilityRouter` (near-orphans, hardcoded fake model IDs).
6. **`01-persistent-runtime.md`** "user should not watch Luca boot" — the boot
   audit says today's boot surface is a diagnostic terminal (`LUCA BIOS v2.4`,
   `MOUNTING LOCAL_CORE`). Target right; mark current gap.

## F. ⚠ Non-doc security flag (verify independently of reconciliation)

`08-cortex-and-local-intelligence.md` asserts the Cortex's privileged routers are
gated behind `require_privileged`. `docs/luca-cortex-backend-architecture-plan.md`
claims the opposite: **no auth on any of the ~57 Cortex endpoints, wildcard CORS,
and an optional `0.0.0.0` bind** — an unauthenticated-RCE-class exposure. These
cannot both be true. This is a real security question that should be checked
against the running Cortex regardless of what the docs say.

---

## G. Do NOT reflexively re-import (correct pruning — record as ADRs)

- The plural "Large Universal Control **Agents**" acronym (undercuts singularity).
- "Cortex = the brain" (the code says sidecar; Foundation is right).
- Cyber/tactical framing as default (the premium audit itself says "cyber off by
  default").
Each needs a recorded keep/rename/retire decision, not a silent copy-back.

---

## Recommended reconciliation sequence

1. **Governance decision first:** declare `foundation/` the single canon; the old
   `docs/foundation/*` and `.ai-assistant-rules.md` become pointer stubs *after*
   their surviving content is migrated.
2. **Adopt the native names** (Luca Guard, Mission Engine, Mission Tape, Memory
   Vault, LucaLink, Skills Runtime, Embodiment Layer) into the Foundation glossary
   + relevant chapters, with a crosswalk table. Genericizing them was the core
   error.
3. **Resolve the four term collisions** (Cortex, Embodiment, Skill, Surface) with
   recorded ADRs.
4. **Absorb the missed doctrine:** Mission Engine + Mission Doctrine chapter;
   operating modes (Creator/Pro/Basic) + source-authority tier; guarded
   self-evolution boundary; the fuller Luca Guard model; the LucaLink mesh model.
5. **Fix the design system:** keep ethos/pedagogy, but defer tokens/skins/material/
   motion/surfaces to the real shipped system; fix the orb/face rejection and the
   "no glow/no rim" overshoot.
6. **Correct the current-state claims** in E and record the pruning ADRs in G.
7. **Verify the Cortex auth question (F)** on its own track — it is not a doc edit.

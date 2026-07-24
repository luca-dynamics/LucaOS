# Naming Crosswalk

The Foundation uses **generic, code-portable terms** as its primary vocabulary
(Runtime, Router, Memory, the permission gate, Surface). LucaOS's product, UI, and
source code use **native names** for the same subsystems (Luca Guard, Mission
Engine, Memory Vault, LucaLink, Skills Runtime). Both are valid; this document is
the bridge between them.

It exists because the Foundation was first written without reconciling against the
established LucaOS documentation and codebase. Rather than rename every chapter,
the decision (see [RECONCILIATION.md](RECONCILIATION.md)) is to **keep the generic
terms as primary and map them here**. A contributor reading the Foundation, the
older `docs/`, or the source should be able to move between all three using this
table.

> **Status:** Phase 1 of the reconciliation. Rows marked _(to add)_ name doctrine
> the Foundation has not yet absorbed; they are placeholders for later phases, not
> claims that the chapter already covers them. Code paths are current as of this
> writing and should be treated as pointers, not guarantees.

---

## Naming policy

- Foundation prose uses the **generic term** as primary.
- On first substantive use in a chapter, link here so the native/code name is one
  hop away.
- When you touch a subsystem in code, prefer the **native name** the code already
  uses; do not rename code to match the generic docs.
- New load-bearing terms are added to the [Glossary](GLOSSARY.md) and, if they map
  to a native name, to this crosswalk in the same change.

---

## Term-collision resolutions

Four words mean different things across the two doc sets. These are the canonical
meanings; each will be recorded as an ADR in a later phase.

| Term | Canonical meaning (Foundation) | Meaning to keep distinct | Where the other meaning lives |
|---|---|---|---|
| **Cortex** | The optional **Python local-intelligence sidecar** — retrieval, voice, vision, local models. Matches the code. | *Not* "the reasoning brain." | Older `docs/foundation/GLOSSARY.md` defines Cortex as the reasoning core; that definition is superseded. |
| **Embodiment** | Identity across **display Surfaces** (how Luca is _present_). | The **Embodiment Layer** — the _actuation_ tier (Direct Host / Sandbox Body / Ghost Browser / Remote Delegation) — is a distinct subsystem, _(to add)_ to the Specification. | `docs/embodiment/EMBODIMENT_MODES.md`; code `src/services/computerUse/`. |
| **Skill** | An emergent **learned competency** (vs a primitive Tool). | An installable/imported **unit with a contract + sandbox** ("Skills Runtime" sense). | `docs/skills/SKILLS_RUNTIME_SPEC.md`. |
| **Surface** | A **device modality / Host** (desktop, web, voice, widget, mobile, XR). | A **named product surface** (Composer, MiniChat, VoiceHUD, Luca Screen, Ghost Browser; the 3-panel zone model). | `docs/design/lucaos-interface-principles.md`, `docs/luca-skin-system.md`. |

---

## Subsystem crosswalk

| Foundation (generic) | Native / product name | Code (pointer) | Foundation chapter |
|---|---|---|---|
| Persistent Runtime, turn loop | Cortex (reasoning) hosting the **Mission Engine** | `src/services/turns/TurnRunner.ts` | [02-spec/01](02-specification/01-persistent-runtime.md) |
| The permission gate / safety layer | **Luca Guard** | `src/services/lucaGuard/` | [02-spec/07](02-specification/07-safety-and-permissions.md) |
| Mission orchestration _(to add)_ | **Mission Engine** (plan→execute→verify→recover→record) | `src/services/missionEngine/` | _(Phase 2)_ |
| Audit trail / provenance | **Mission Tape** + provenance records | `src/services/missionTape/` | [02-spec/11](02-specification/11-observability-and-provenance.md) |
| Archive (memory store) | **Memory Vault** (its human-readable, editable, exportable face) | `src/services/memory/MemoryVaultService.ts` | [02-spec/03](02-specification/03-memory-architecture.md) |
| Memory tiers: identity / durable / transient | **Soul Layer** (≈ identity) / **Now Layer** (≈ transient) | `src/services/memory/memoryWriteCapacity.ts` | [02-spec/03](02-specification/03-memory-architecture.md) |
| Continuity and sync | **LucaLink** (protocol / host mesh; trust ladder + sync lanes) | `src/services/lucaLink/` | [02-spec/09](02-specification/09-continuity-and-sync.md) |
| Capability / Tool layer | **Skills Runtime** (Tools, MCP, imported skills) | `toolRegistry`, `src/services/skills/` | [02-spec/05](02-specification/05-capability-and-tool-layer.md) |
| Router / model routing | **Model Router** (`ModelManagerService` hub + shadow planner) | `src/services/llm/ProviderFactory.ts`, `src/model-router/` | [02-spec/04](02-specification/04-provider-abstraction.md) |
| Local intelligence | **Cortex** (Python sidecar) | `cortex/python/` | [02-spec/08](02-specification/08-cortex-and-local-intelligence.md) |
| Actuation _(to add)_ | **Embodiment Layer** (host / sandbox body / browser body / remote delegation; sandbox-body-by-default for risky work) | `src/services/computerUse/` | _(Phase 2)_ |
| Guarded self-evolution _(to add / scope decision)_ | **Evolution Core** / Neural Self-Repair | `src/services/evolution/`, `neuralSelfRepairService.ts` | _(Phase 2)_ |
| Operating modes _(to add)_ | **Experience Modes: Creator / Pro / Basic** (was Origin / Tactical / Core; build layer `origin` / `public_tactical` / `public_standard`) | `src/experience/experienceMode.ts`, `src/config/layerBoundary.ts` | _(Phase 2)_ |

---

## Design vocabulary crosswalk

The Foundation's design tokens and motion constants are explicitly _illustrative_.
The real, shipped design language is the source of truth; defer to it. (Full
reconciliation of the design system is Phase 3.)

| Foundation (illustrative) | Real, shipped source of truth |
|---|---|
| `--surface-background`, `--color-neutral-*`, `--color-accent-*` | The `--luca-*` semantic tokens resolved by `src/config/lucaAppearanceTokens.ts` |
| status `positive` / `caution` / `critical` | `--luca-success` / `--luca-danger` / `--luca-warning` / `--luca-info` |
| "one calm palette, light/dark" | The **skin system** — Pearl / Carbon / Flow / Canvas + the `--luca-skin-*` layer (`docs/luca-skin-system.md`) |
| elevation "no glow, no rim" | The governed **liquid-glass material** (disciplined rims/specular; glow reserved for presence/focus) (`docs/design/luca-liquid-glass-material.md`) |
| "not an orb, not a face" (rejected) | The **calm liquid-plasma presence orb** (`LucaPresenceOrb`) and **HologramFace** _are_ the shipped identity; only the _pulsing sci-fi_ orb is rejected. To be reconciled in Phase 3. |

---

## Retired / not-adopted (rationale; ADRs pending)

- **"LUCA = Large Universal Control Agents"** — the plural-"Agents" acronym
  contradicts the [One Identity Principle](00-manifesto/04-the-one-identity-principle.md).
  Not adopted; "Luca" is a singular name.
- **"Cortex = the reasoning brain"** — superseded by the sidecar meaning above, per
  the code.

## See also

- [RECONCILIATION.md](RECONCILIATION.md) — the full reconciliation map and plan
- [GLOSSARY.md](GLOSSARY.md) — canonical term definitions

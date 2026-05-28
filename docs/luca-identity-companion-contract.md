# Luca Identity and Companion Contract
Date: 2026-05-28 (UTC)
Status: Canonical contract plus safe runtime persona/prompt adapter; no persistence, provider routing, UI route, or evolution mutation changed.

## Overview
This contract defines Luca as a persistent personal AI OS agent with tier-aware presentation and companion boundaries. The foundation helpers remain pure/read-only, and the runtime adapter now composes them into safe prompt/persona snapshots for existing chat and voice prompt surfaces. Future onboarding, memory, and embodiment systems can consume the same snapshots without adding hidden persistence.

## Source files
- `src/services/identity/LucaAgentIdentity.ts` defines the canonical Luca identity contract.
- `src/services/identity/LucaCompanionProfile.ts` defines companion profile/personality boundaries.
- `src/services/identity/LucaTierPersona.ts` defines tier-aware persona behavior.
- `src/services/identity/LucaIdentityRuntimeAdapter.ts` composes identity/profile/tier contracts for prompt-safe runtime surfaces.
- `src/services/identity/index.ts` exports the identity contract and runtime adapter surface.

## Contract invariants
- Default agent name is Luca.
- Foundation snapshots keep `runtimeBehaviorChanged` as `false`; runtime adapter snapshots mark `runtimeBehaviorChanged: true` only to disclose that prompt/persona behavior is intentionally being shaped by the canonical identity layer.
- `persistenceEnabled` is always `false`.
- Identity helpers are pure and do not call settings, memory, voice, model router, or evolution services.
- Unknown tier maps to safe fallback behavior.
- Human feeling claims are forbidden.
- Persistent memory claims are allowed only when source is explicitly `memory_profile`.

## Architecture mapping

| LucaOS area | Future use | Current PR stance |
|---|---|---|
| Onboarding | Populate display name, tone, preferences, tier, memory disclosure. | Contract-only; no onboarding UI or persistence change. |
| Chat | Add snapshots to prompt assembly after review. | Wired through existing persona prompt helpers where safe. |
| Voice | Use compact tone/persona snapshots. | Wired into persona/voice prompt metadata; provider runtime unchanged. |
| Memory | Map explicit memory profile into relationship summary. | No memory writes/deletes. |
| User tiers | Select Origin/Tactical/Normal/Unknown presentation. | Consumed by prompt adapter only; no UI/control exposure. |
| Future embodiment | Share one Luca identity across devices. | Documentation only. |

## Replacement plan for older persona code
Existing mutable personality runtime code should be preserved until a dedicated behavior migration PR can wrap or replace it safely. The runtime adapter is now the canonical source for safe prompt/persona identity text. Existing mutable personality runtime code remains preserved and wrapped with canonical identity guidance rather than removed.

## Runtime adapter connection update (2026-05-28)
Status is now: canonical identity foundation connected to safe runtime persona/prompt surfaces.

- `src/services/identity/LucaIdentityRuntimeAdapter.ts` composes `LucaAgentIdentity`, `LucaCompanionProfile`, and `LucaTierPersona` into prompt-safe runtime snapshots for chat, voice, onboarding, system, memory, and unknown surfaces.
- Existing persona prompt helpers now consume the runtime adapter where safe, so Luca identity behavior has a canonical source of truth instead of scattered hardcoded identity text.
- The runtime adapter forbids fake human emotion claims and includes explicit forbidden claims in prompt summaries.
- The runtime adapter does not claim hidden or persistent memory unless the caller explicitly marks the source as `memory_profile`.
- No persistence, settings writes, memory writes, voice/model provider rewrite, optimizer execution, or evolution mutation was added.

# Luca Identity and Companion Contract
Date: 2026-05-28 (UTC)  
Status: Pure contract layer; no runtime chat/voice behavior changed.

## Overview
This contract defines Luca as a persistent personal AI OS agent with tier-aware presentation and companion boundaries. It is intentionally pure and read-only. Future onboarding, chat, voice, memory, and embodiment systems can consume snapshots after explicit integration work.

## Source files
- `src/services/identity/LucaAgentIdentity.ts` defines the canonical Luca identity contract.
- `src/services/identity/LucaCompanionProfile.ts` defines companion profile/personality boundaries.
- `src/services/identity/LucaTierPersona.ts` defines tier-aware persona behavior.
- `src/services/identity/index.ts` exports the identity contract surface.

## Contract invariants
- Default agent name is Luca.
- `runtimeBehaviorChanged` is always `false`.
- `persistenceEnabled` is always `false`.
- Helpers are pure and do not call settings, memory, voice, model router, or evolution services.
- Unknown tier maps to safe fallback behavior.
- Human feeling claims are forbidden.
- Persistent memory claims are allowed only when source is explicitly `memory_profile`.

## Architecture mapping

| LucaOS area | Future use | Current PR stance |
|---|---|---|
| Onboarding | Populate display name, tone, preferences, tier, memory disclosure. | Contract-only; no onboarding UI or persistence change. |
| Chat | Add snapshots to prompt assembly after review. | Not wired. |
| Voice | Use compact tone/persona snapshots. | Not wired; voice runtime unchanged. |
| Memory | Map explicit memory profile into relationship summary. | No memory writes/deletes. |
| User tiers | Select Origin/Tactical/Normal/Unknown presentation. | Pure helper mapping only. |
| Future embodiment | Share one Luca identity across devices. | Documentation only. |

## Replacement plan for older persona code
Existing mutable personality runtime code should be preserved until a dedicated behavior migration PR can wrap or replace it safely. The new identity contract should become the canonical source for future prompt/persona assembly, but this PR does not alter live prompt generation.

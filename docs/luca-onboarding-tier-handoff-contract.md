# Luca Onboarding Tier Handoff Contract

`src/types/lucaOnboardingTierHandoff.ts` defines a contract-only onboarding handoff object and validation helpers.

No persistence/settings writes/UI wiring are performed.

## 2026-05-28 identity/profile handoff extension
- Future onboarding may populate Luca identity/profile inputs such as `userDisplayName`, `personalitySummary`, `preferredTone`, `communicationStyle`, and explicit memory disclosure.
- The current identity foundation is contract-only: it performs no settings writes, no memory writes, and no onboarding persistence.
- Chat and voice should consume identity snapshots only in a later runtime PR with tests for no hidden memory claims and no fake human emotion claims.
- Unknown or incomplete onboarding should resolve to safe fallback persona behavior.

## Runtime identity adapter handoff update (2026-05-28)
- `LucaIdentityRuntimeAdapter` now provides an `onboarding` surface so onboarding handoff data can be mapped into prompt-safe identity snapshots without adding persistence.
- Current runtime persona prompt builders can consume display name, personality summary, relationship summary, communication style, model mode, and interaction mode as read-only metadata.
- Relationship summaries are disclosed only when the handoff source is explicitly `memory_profile`; non-memory sources receive a no-hidden-memory disclosure.
- This update does not write onboarding preferences, settings, or memory and does not change voice/model provider routing.

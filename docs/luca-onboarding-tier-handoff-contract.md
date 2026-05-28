# Luca Onboarding Tier Handoff Contract

`src/types/lucaOnboardingTierHandoff.ts` defines a contract-only onboarding handoff object and validation helpers.

No persistence/settings writes/UI wiring are performed.

## 2026-05-28 identity/profile handoff extension
- Future onboarding may populate Luca identity/profile inputs such as `userDisplayName`, `personalitySummary`, `preferredTone`, `communicationStyle`, and explicit memory disclosure.
- The current identity foundation is contract-only: it performs no settings writes, no memory writes, and no onboarding persistence.
- Chat and voice should consume identity snapshots only in a later runtime PR with tests for no hidden memory claims and no fake human emotion claims.
- Unknown or incomplete onboarding should resolve to safe fallback persona behavior.

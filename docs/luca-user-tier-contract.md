# Luca User Tier Contract (Pure Type Layer)
Date: 2026-05-28 (UTC)
Status: Contract-only (no UI wiring, no runtime behavior changes)

## Purpose
This document defines the canonical, shared user-tier contract for LucaOS self-evolution governance and future tiered UI migration.

This contract exists to unblock future migration of the latest private MacBook architecture (Origin / Tactical / Normal + onboarding) into the public repository, while keeping the current change strictly type/helper level.

## Canonical tier model
- `origin`
- `tactical`
- `normal`
- `unknown`

## Canonical capability model
- `view_origin_evolution_dashboard`
- `submit_evolution_request`
- `import_external_evolution_artifact`
- `review_evolution_proposal`
- `approve_evolution_proposal`
- `promote_evolution_candidate`
- `rollback_evolution_candidate`
- `view_safe_evolution_summary`
- `provide_feedback_evidence`

## Context model
`LucaUserTierContext` carries:
- `tier`
- `source` (`onboarding`, `settings`, `local_capability_detection`, `creator_override`, `migration_placeholder`, `unknown`)
- optional `confidence`
- optional `isPrivateMacbookArchitectureExpected`
- optional `metadata`

## Capability policy snapshot
- **Origin**: full capability contract surface is representable for future guarded workflows, including approve/promote/rollback contract capability flags.
- **Tactical**: may submit request + view safe summary + provide feedback evidence only.
- **Normal**: view safe summary + provide feedback evidence only.
- **Unknown**: safest posture (`provide_feedback_evidence` only).

## Safety metadata (contract constants)
- `runtimeBehaviorChanged: false`
- `uiWiringChanged: false`
- `originControlsExposed: false`
- `evolutionServiceCalled: false`
- `persistenceEnabled: false`

## Non-goals in this PR
- No UI mounting.
- No route updates.
- No Origin controls exposure.
- No `evolutionService` mutate/commit calls.
- No optimizer execution.
- No persistence.

## Future consolidation note
If legacy/adjacent tier types (for example `LucaTier`) overlap, a future PR should perform safe consolidation/re-export harmonization without changing behavior.

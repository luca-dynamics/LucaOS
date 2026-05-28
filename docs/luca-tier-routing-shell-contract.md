# Luca Tier Routing Shell Contract

## Purpose

This contract introduces a pure helper/type layer for resolving LucaOS shell intent from `LucaUserTier` plus onboarding/migration context. It prepares future private MacBook UI migration without wiring UI, changing runtime behavior, or modifying `App.tsx`.

## Contract Outputs

- `LucaTierShellMode`
  - `origin_creator_shell`
  - `tactical_shell`
  - `normal_shell`
  - `unknown_safe_shell`
- `LucaTierRoutingSource`
  - `onboarding`
  - `settings`
  - `private_macbook_migration`
  - `local_capability_detection`
  - `creator_override`
  - `default_safe_fallback`
  - `unknown`
- `LucaTierRoutingContext`
- `LucaTierRoutingDecision`

## Routing Rules

- origin -> `origin_creator_shell`
- tactical -> `tactical_shell`
- normal -> `normal_shell`
- unknown -> `unknown_safe_shell`

## Origin Dashboard Mount Rule

`canMountOriginEvolutionDashboard` is `true` only when all conditions are met:

1. `shellMode` is `origin_creator_shell`
2. `userTier` is `origin`
3. `requiresExplicitOriginGate` is `true` (future explicit gate marker)

All tactical/normal/unknown decisions must return `false`.

## Safety/Non-Wiring Guarantees

- `runtimeBehaviorChanged` is always `false`
- `uiWiringChanged` is always `false`
- No UI routing, mounting, or rendering changes
- No `App.tsx` integration
- No Origin controls exposure
- No `evolutionService` mutate/commit calls
- No optimizer execution
- No persistence changes

## Future Work

A future PR may introduce isolated shell components and connect this contract into UI wiring after migration gates are explicitly approved.

## 2026-05-28 migration bridge update
- Tier shell stubs are isolated-only placeholders (not mounted).
- Tier routing preview adapter is pure metadata only.
- Onboarding handoff is contract-only.
- Origin dashboard snapshot adapter is read-only display data only.
- Private UI import map guides future MacBook migration.
- No App.tsx wiring, no Origin control exposure expansion, no runtime behavior change.

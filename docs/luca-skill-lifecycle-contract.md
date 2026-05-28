# Luca Skill Manifest & Lifecycle Contract

## Purpose
This contract introduces a canonical skill manifest and lifecycle gate for LucaOS so existing `toolRegistry`, `SkillTriggerService`, `SkillIngestionService`, and future self-evolution workflows can converge on one schema without changing runtime execution behavior.

## Canonical manifest
Implemented in `src/services/skills/SkillManifest.ts`.

Key fields include:
- Identity/versioning: `id`, `name`, `description`, `version`, `source`, `createdAt`, `updatedAt`
- Lifecycle: `lifecycleState` (`draft | candidate | active | deprecated | rejected | archived`)
- Tier ownership and access: `ownerTier`, `allowedUserTiers`
- Capability boundaries: `allowedTools`, `deniedTools`, `inputs`, `outputs`, `triggerHints`, `category`, `tags`
- Governance contracts: `memoryPolicy`, `safetyPolicy`, `evalPolicy`, `promotionPolicy`, `rollbackPolicy`
- Metadata guardrails:
  - `contractKind: "luca_skill_manifest"`
  - `autonomousSelfModificationEnabled: false`
  - `runtimeBehaviorChanged: false`
  - `migrationRequired: false`

## User operation tiers
- `origin`: creator tier, can govern promotion/evolution/rollback when policy gates pass.
- `tactical`: developer/power-user tier, can invoke permitted skills and participate in constrained improvement workflows.
- `normal`: public/simple tier, cannot perform promote/evolve/rollback actions.

## Lifecycle gate rules
Implemented in `src/services/skills/SkillLifecycleGate.ts`.

Highlights:
- Normal users cannot `promote`, `evolve`, or `rollback`.
- Tactical users cannot promote high-risk/critical skills.
- Origin can promote/evolve/rollback only when eval/promotion/rollback policies are satisfied.
- Critical skills require Origin-level approval.
- `draft`/`candidate` are not invokable by Normal users.
- `deprecated`/`rejected`/`archived` are blocked for invocation unless Origin override is explicitly present.

## Legacy interoperability
Implemented in `src/services/skills/SkillManifestMapping.ts` and `SkillManifestAdapter.ts`.

- Pure mapping helpers infer risk/access tiers from legacy tool metadata.
- Unknown legacy fields are preserved in manifest metadata.
- Adapter is explicitly non-invasive:
  - `adapterOnly: true`
  - `runtimeBehaviorChanged: false`
  - `skillExecutionChanged: false`
  - `autonomousSelfModificationEnabled: false`

## Relation to future LucaOS self-evolution
This contract is the governance layer for future reflection/evolution proposals:
- It does **not** replace `toolRegistry` in this phase.
- It does **not** execute or register new production skills.
- It provides policy/eval/promotion scaffolding for future integration with LucaOS self-evolution repositories and proposal pipelines.

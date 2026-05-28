# Luca Evolution Governance Contract
Date: 2026-05-28 (UTC)

## Purpose
This contract defines a canonical, non-autonomous governance layer for self-evolution proposals in LucaOS.
## Lifecycle
`draft -> submitted -> under_review -> approved/rejected -> promoted/rolled_back -> archived`
## Tier permissions
- **Normal:** may contribute evidence/feedback but cannot submit raw proposals or approve/promote/rollback.
- **Tactical:** may submit improvement proposals but cannot approve/promote high-risk or core capability proposals.
- **Origin:** required for external lab candidates and all high-risk/core capability promotions.
## Core gate constraints
- Autonomous self-modification is disabled.
- Runtime auto-apply is false by default.
- Promotion is blocked on regressions.
- Promotion for medium+ risk requires rollback availability.
- Runtime/computer-use/filesystem/network/voice policy touching proposals require Origin approval.
## External lab PR-back model
External proposals are represented as `external_lab_candidate` (or source `lucaos_self_evolution_repo`) and routed into Origin review before any approval/promotion decision. This models PR-back workflows without runtime auto-apply.
## Difference from Hermes-only scope
LucaOS governance must span broader surfaces than Hermes: UI/UX, public distribution modes, voice behavior policy, computer-use boundaries, memory policy, and runtime policy constraints. Governance is therefore explicit about user-tier permissions and high-risk capability gates.
## Runtime behavior posture
This change is contract + gate + adapter only. It does not replace `evolutionService`, does not auto-mutate runtime code, and does not alter skill/tool registration execution paths.
## 2026-05 Evolution Run/Candidate Contract Extension
- Added canonical `EvolutionRun` and `CandidateVariant` contracts for external-lab-compatible evolution artifacts.
- Added dataset/eval references, constraint gate result records, optimizer engine metadata, and PR-back metadata.
- External lab outputs are represented as metadata-only inputs; optimizer execution remains disabled inside LucaOS core.
- Origin review is required for external lab PR-back proposal paths.
## Repo boundary reference (2026-05-28)
- Canonical LucaOS core vs external lab split: `docs/lucaos-self-evolution-repo-boundary.md`.
## 2026-05 External Artifact Envelope Extension
LucaOS now defines explicit external artifact envelope contracts and validation gates for future lab exchange:
- canonical artifact kind taxonomy,
- required schema version and origin-review defaults,
- risky-capability detection signals,
- candidate and PR-back rollback completeness checks,
- explicit no-auto-promote/no-runtime-auto-apply snapshot flags.
This extension remains adapter/contract-only and does not execute optimizers in LucaOS core.
## 2026-05 PR-back metadata verifier extension
A pure PR-back metadata verifier is now part of the governance contract for external lab candidate intake. It validates repo trust metadata and PR references, requires Origin review flags, warns on missing finalized commit SHA data, blocks untrusted source repo inputs, and keeps auto-merge disabled (`canAutoMerge=false`) for all PR-back candidates.
## 2026-05 Constraint Gate Report Verifier Extension
LucaOS now defines a dedicated pure constraint-gate-report verifier to validate lab-returned gate results prior to Origin candidate review.
Verifier rules include:
- safety failure blocks,
- regression failure blocks candidate selection,
- medium+ risk requires rollback gate presence,
- eval-required workflows require passing eval gate,
- policy-touching gate kinds force Origin review flags,
- unknown gate kinds warn by default,
- no auto-promotion.
Reference: `docs/luca-constraint-gate-report-verifier.md`.
## 2026-05 Origin Proposal Inbox Adapter Extension
Added an in-memory `EvolutionProposalInbox` adapter layer for proposal intake + governance-safe review decisions.
- Actions supported: submit, review, reject, archive.
- All actions are checked through `EvolutionGovernanceGate`.
- External lab candidates require Origin review.
- Tactical may submit low-risk requests but inbox intentionally has no approve/promote API.
- No persistence, no runtime mutation, no execution, and no `evolutionService` mutate/commit calls.
- Snapshot metadata guarantees:
  - `adapterOnly: true`
  - `runtimeBehaviorChanged: false`
  - `persistenceEnabled: false`
  - `autonomousSelfModificationEnabled: false`
  - `existingEvolutionServiceCalled: false`

## External Artifact Import Governance
All imported external artifacts are governance-subordinate to Origin.
### Required metadata flags
- `adapterOnly: true`
- `runtimeBehaviorChanged: false`
- `importedArtifactsRequireOriginReview: true`
- `autoApplyEnabled: false`
- `existingEvolutionServiceCalled: false`
### Import rules
- candidate bundle -> proposal/candidate metadata only.
- eval report -> review run object only.
- PR-back report -> proposal metadata only.
- unsupported schema/kind -> blocked.
- tactical high-risk import -> blocked.
- normal import -> blocked.

## Origin evolution control service composition

The Origin evolution control service composes existing governance and verifier pieces (`EvolutionProposalInbox`, `ExternalEvolutionImportAdapter`, `verifyConstraintGateReport`, and `verifyPrBackMetadata`) as a safe, Origin-operated control surface.

This layer is adapter-only and does not call mutation/commit paths or `evolutionService`. It does not execute optimizers, does not auto-apply proposals, does not persist state beyond in-memory inbox data, and does not perform network/GitHub PR verification.

Dashboard note: future Origin dashboard wiring can consume this service in a dedicated UI integration PR; this contract update does not change runtime behavior.

## User-tier UI integration contract reference (2026-05-28)
- Canonical bridge doc: `docs/luca-user-tier-ui-integration-contract.md`.
- Governance + UI integration must preserve Origin-only control authority while public repo UI remains behind private tier-routing/onboarding architecture.


## 2026-05 Pure user-tier contract layer extension
A canonical shared user-tier contract is now defined for governance-adjacent consumers in `src/types/lucaUserTier.ts`, with documentation in `docs/luca-user-tier-contract.md`.

This extension is type/helper only:
- no runtime behavior changes,
- no UI mounting/wiring,
- no Origin control exposure,
- no `evolutionService` mutate/commit calls,
- no persistence.

It prepares migration alignment between this public repo and the latest private MacBook Origin/Tactical/Normal onboarding architecture.

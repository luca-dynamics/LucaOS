# Luca Evolution Proposal Inbox Adapter

Date: 2026-05-28 (UTC)

## Purpose
Defines an in-memory, adapter-only proposal inbox for Origin-governed LucaOS evolution workflows.

## Constraints
- In-memory only (no persistence).
- No runtime mutation/commit/promotion execution.
- No existing `evolutionService` mutate/commit calls.
- No runtime behavior change.

## API
- `submitProposal(proposal, actorTier)`
- `listProposals(filter?)`
- `getProposal(id)`
- `reviewProposal(id, actorTier, decisionMetadata?)`
- `rejectProposal(id, actorTier, reason)`
- `archiveProposal(id, actorTier, reason?)`
- `getSnapshot()`

## Governance behavior
- Uses `EvolutionGovernanceGate` for all actions.
- `origin` may submit/review high-risk proposals.
- `tactical` may submit improvement requests, but cannot approve/promote high-risk/core-capability changes (and inbox does not expose approval/promotion actions).
- `normal` cannot submit raw proposals.
- `external_lab_candidate` requires Origin review.

## Snapshot metadata contract
`getSnapshot()` and proposal metadata reflect:
- `adapterOnly: true`
- `runtimeBehaviorChanged: false`
- `persistenceEnabled: false`
- `autonomousSelfModificationEnabled: false`
- `existingEvolutionServiceCalled: false`

## Notes
This adapter is intentionally non-executing and non-promoting. Promotion/mutation wiring remains future work after governance hardening.

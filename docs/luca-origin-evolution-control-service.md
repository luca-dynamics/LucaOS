# Luca Origin Evolution Control Service

## Purpose

`OriginEvolutionControlService` is an Origin-only service composition layer for self-evolution governance workflows. It composes existing in-repo governance contracts and adapters, and exposes a safe backend surface for future Origin dashboard wiring.

## Composition

The service composes:

- `EvolutionProposalInbox`
- `ExternalEvolutionImportAdapter`
- `verifyConstraintGateReport`
- `verifyPrBackMetadata`
- Existing governance gates reached through those adapters/contracts

## Safety guarantees

- No persistence beyond in-memory proposal inbox state
- No optimizer execution
- No mutate/commit/promotion execution
- No calls into `evolutionService`
- No file mutation execution
- No network/GitHub verification calls
- `canAutoMerge` is always `false`
- `promotionAllowed` is always `false`

## Exposed methods

- `submitProposal(proposal, actorTier)`
- `importExternalArtifact(envelope, actorTier)`
- `importCandidateBundle(bundle, actorTier)`
- `verifyConstraintReport(input, actorTier)`
- `verifyPrBack(input, actorTier)`
- `listProposals(filter?)`
- `getProposal(id)`
- `reviewProposal(id, actorTier, decisionMetadata?)`
- `rejectProposal(id, actorTier, reason)`
- `archiveProposal(id, actorTier, reason?)`
- `getSnapshot()`

No `approve`, `promote`, `apply`, or `execute` methods are exposed.

## Tier policy

- Origin can use review/import/verify methods.
- Tactical can submit low-risk proposals where existing gates allow.
- Normal cannot submit raw proposals.
- External artifacts and candidate bundles are Origin-controlled imports and remain review-only.

## Runtime impact

This service is adapter-only and governance-only. Runtime behavior is unchanged.

A future PR can wire this service into the Origin Evolution Dashboard after explicit UI integration work.

## User-tier integration reference
- Canonical UI-tier integration contract: `docs/luca-user-tier-ui-integration-contract.md`.
- This service is intended for Origin-scoped surfaces only; Tactical/Normal must not receive direct control wiring from this layer.


## Tier type alignment (2026-05-28)
`OriginEvolutionControlService` and its evolution collaborators now use the canonical `LucaUserTier` contract through the preserved `LucaTier` compatibility alias in evolution contracts. This keeps existing call signatures stable and preserves Origin/Tactical/Normal gate behavior.

No UI wiring was added in this update.

## 2026-05-28 migration bridge update
- Tier shell stubs are isolated-only placeholders (not mounted).
- Tier routing preview adapter is pure metadata only.
- Onboarding handoff is contract-only.
- Origin dashboard snapshot adapter is read-only display data only.
- Private UI import map guides future MacBook migration.
- No App.tsx wiring, no Origin control exposure expansion, no runtime behavior change.

## Deterministic execution absorb mapping (2026-05)
The Origin evolution control service should eventually consume deterministic execution plans for high-risk proposal review. Origin can review self-evolution, filesystem, network, tool/skill, and computer-use implications, but deterministic execution snapshots keep `liveExecutionAllowed: false` and promotion disabled by default.

Receipts from tests, evals, constraint gates, PR-back metadata, manual notes, or external lab outputs should be attached as evidence before any future promotion workflow is considered. This document update does not expose Origin controls or wire UI.

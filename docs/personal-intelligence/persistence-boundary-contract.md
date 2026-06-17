# Personal Intelligence persistence boundary contract

## Purpose

The Personal Intelligence persistence boundary defines the safe shape of a future memory write request without performing the write. It sits after Memory Controls previews and Interactive Review Workflow confirmations so LucaOS can reason about audit, rollback, privacy, and sync requirements before any future durable memory persistence exists.

This contract is deliberately dry-run only. It does not persist memory, mutate the memory graph, write audit logs, call Operation Center, call models/tools, create storage adapters, schedule expiration jobs, or sync with LucaLink.

## Preview, confirmation intent, candidate, and persistence

- **Preview**: Memory Controls produce `PersonalMemoryControlPreview` objects. A preview describes current/proposed summaries and policy decisions while preserving `sideEffectsPerformed: false`.
- **Confirmation intent**: Interactive Review Workflow can produce `PersonalIntelligenceReviewResult` with `confirmed: true`. Confirmation records local user intent only and preserves `persistencePerformed: false` and `mutationPerformed: false`.
- **Persistence candidate**: The persistence boundary can convert a confirmed review result, or an explicitly supplied memory-control preview, into `PersonalIntelligencePersistenceCandidate`. This is a request-shaping object only.
- **Actual persistence**: still deferred. No candidate is written, stored, synced, or applied.

A cancelled review result is blocked. A blocked memory-control preview is blocked. A confirmed result is not auto-applied.

## Request and boundary result shape

Each evaluated boundary result includes:

- `requestId`, `source`, `targetMemoryId`, `action`;
- `decision`, `reason`, and `risk`;
- `auditEvent` with `recorded: false` and `dryRunOnly: true`;
- `rollbackPlan` with descriptive undo guidance only;
- `privacyImpact` and `syncImpact` summaries;
- `requiresExplicitUserConfirmation` and `requiresAuditBeforeWrite`;
- `eligibleForFuturePersistence`;
- `dryRunOnly: true`, `sideEffectsPerformed: false`, `persistencePerformed: false`, and `mutationPerformed: false`.

Supported request sources are:

- `review_workflow_confirmation`;
- `memory_control_preview`;
- `system_migration`;
- `manual_import`.

The current implementation uses the first two as pure contract inputs. Migration/import remain source labels only, not storage paths.

## Decisions

The boundary can return:

- `eligible`: confirmed, non-blocked, low-risk candidate that could be persisted by a future audited write path;
- `requires_review`: confirmed candidate that still requires explicit confirmation, audit, and rollback planning before any future write;
- `blocked`: cancelled, unconfirmed, blocked, or unsupported preview/result;
- `rejected`: confirmed candidate that violates non-negotiable safety policy, such as sensitive/secret sync enablement;
- `dry_run_only`: reserved for dry-run confirmations that should never be considered a write.

## Eligible actions

These actions may be eligible for future persistence after confirmation and audit handling:

- `approve_memory`
- `deny_memory`
- `correct_memory`
- `edit_memory`
- `make_temporary`
- `make_private`
- `mark_do_not_sync`
- `archive_memory`
- `restore_memory`

`forget_memory` is intentionally high risk and never auto-applied. It can only cross this boundary as a review-gated dry-run candidate with rollback guidance.

## Never auto-apply actions

These actions must never be applied by inference, automation, or system migration alone:

- `forget_memory`
- `make_private`
- `mark_do_not_sync`
- `mark_sync_allowed`
- `restore_memory`

They require explicit user confirmation and must still satisfy boundary policy.

## High-risk / destructive actions

These actions require explicit confirmation and rollback planning:

- `forget_memory`
- `restore_memory`
- `archive_memory`
- `make_private`
- `mark_do_not_sync`

The boundary reports rollback availability but does not execute rollback.

## Sync restrictions

- Sensitive and secret memory must not become sync-allowed.
- Private or local-only memory must not be converted to sync-enabled without explicit confirmation.
- `mark_sync_allowed` remains blocked/rejected for sensitive or secret memory, even after confirmation.
- Any sync-relevant result includes an explicit `syncImpact` summary.
- No sync service is called.

## Privacy constraints

Sensitive, private, and secret memory changes require audit-before-write. Creator mode is audit disclosure, not a privacy bypass. Protected raw values must not appear in serialized summaries, audit summaries, or disclosure strings.

## Audit event contract

The boundary creates a pure audit event object before any future write could be considered. It is not recorded.

Fields include:

- `eventId`, `eventType`, `requestId`, `targetMemoryId`, `action`;
- `decision`, `risk`, `reason`, `source`, `createdAt`;
- `requiresUserConfirmation`, `requiresAuditBeforeWrite`;
- `privacyImpact`, `syncImpact`, `rollbackPlanId`;
- `recorded: false`, `dryRunOnly: true`.

Supported event types are:

- `personal_intelligence_persistence_candidate_created`
- `personal_intelligence_persistence_blocked`
- `personal_intelligence_persistence_requires_review`
- `personal_intelligence_persistence_dry_run_confirmed`

No audit log is written and no Operation Center runtime is called.

## Rollback / undo contract

Rollback plans include:

- `rollbackPlanId`, `targetMemoryId`, `action`;
- `previousStateSummary`, `proposedStateSummary`;
- `rollbackAction`, `requiresUserConfirmation`;
- `available`, `reason`;
- `dryRunOnly: true`, `executed: false`.

Forget/private/do-not-sync/archive/restore candidates include rollback guidance. If previous state is unavailable, rollback is explicitly unavailable and future persistence must reject or collect safe prior-state evidence before writing.

## Basic / Pro / Creator disclosure

### Basic

Basic summaries show safe action labels, confirmation requirements, deferred persistence, and privacy warnings when relevant. Raw protected memory IDs and protected values are hidden.

### Pro

Pro summaries show action, decision, risk, privacy impact, sync impact, and rollback availability. Protected values remain hidden.

### Creator

Creator summaries show safe request/audit/rollback identifiers and explicit dry-run flags, including `recorded: false` and `persistencePerformed: false`. Creator mode does not bypass privacy.

## Implemented in this PR

- A pure `src/personal-intelligence/persistenceBoundary/` module.
- Boundary types, policy, helpers, fixtures, and focused tests.
- Composition with existing Memory Controls and Interactive Review Workflow result types.
- A pure Operation Center-style summary helper that does not write events.
- Documentation for the contract and deferred work.

## Deferred

- Durable memory persistence.
- Actual memory mutation.
- Hidden memory capture.
- Sync or LucaLink integration.
- Model calls.
- Tool calls.
- Reminders or expiration jobs.
- Operation Center event writes.
- Database/storage backends.
- Cloud memory.
- Cross-device memory via LucaLink.

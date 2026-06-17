# Personal Intelligence interactive review workflow foundation

## Purpose

The interactive review workflow foundation adds a local, UI-ready path on top of the existing Memory Graph, Continuity Engine, Memory Controls preview helpers, and read-only dashboard bridge.

The workflow supports the safe user journey:

1. See a memory review item from the existing review queue.
2. Choose a suggested action.
3. Preview the proposed result.
4. Confirm or cancel the preview.
5. Receive a local confirmation/result summary that records intent only.

This foundation deliberately does **not** persist, mutate, sync, schedule, call tools, call models, or capture hidden memory.

## Preview, confirmation intent, and persistence

The workflow separates three concepts:

- **Preview**: `createMemoryReviewActionPreview(...)` composes `previewMemoryControlAction(...)` and `summarizeMemoryControlPreview(...)` from Memory Controls. It returns current/proposed state summaries and policy decisions while preserving `sideEffectsPerformed: false`.
- **Confirmation intent**: `confirmMemoryReviewPreview(...)` returns a local result object with `confirmed: true`, `mutationPerformed: false`, and `persistencePerformed: false`. It is a future handoff shape, not a write.
- **Persistence**: not implemented. No confirmed workflow result is stored, synced, scheduled, or applied to the memory graph.

Cancelling a preview returns a cancelled result and leaves the preview/proposed state unchanged. The original graph remains unchanged across selection, preview, confirmation, and cancellation.

## Workflow phases

The workflow model uses explicit phases:

- `idle`
- `selected`
- `preview_ready`
- `confirmation_required`
- `confirmed`
- `cancelled`
- `blocked`
- `review_only`

Each result includes the workflow ID, action, phase, preview summary, decision, reason, confirmation flags, mode, event summary, `sideEffectsPerformed: false`, `persistencePerformed: false`, and `mutationPerformed: false`.

## Confirmation requirements

The workflow keeps Memory Controls as the policy source and adds a confirmation boundary for review UX:

- destructive lifecycle actions such as `forget_memory` and `restore_memory` require explicit confirmation;
- sensitive/private corrections require review confirmation;
- Memory Controls `approval_required` decisions remain confirmation-required in the workflow;
- blocked previews cannot be treated as applied work.

Confirmation records only intent. It does not write a proposed node, schedule expiration, call sync, or notify a runtime service.

## Basic, Pro, and Creator disclosure

### Basic

Basic mode presents friendly titles/details from the existing review queue, hides raw memory IDs in preview/result display fields, hides category/sensitivity/source/confidence/staleness metadata, and keeps protected values redacted. It uses simple approval/correction language and reinforces that changes require confirmation.

### Pro

Pro mode adds category, sensitivity, staleness, reason counts, and preview state summaries. It still does not expose protected raw values.

### Creator

Creator mode adds safe audit identifiers/counts, workflow phase, event summaries, and explicit `persistencePerformed: false` / `sideEffectsPerformed: false` flags. Creator is an audit disclosure mode, not a privacy bypass; protected raw values remain hidden.

## Right-panel bridge

The existing `PersonalIntelligenceReadOnlyPanel` now includes a small `PersonalIntelligenceReviewWorkflowPanel` child. The child uses local React state only to select items, preview actions, and confirm/cancel intent.

The UI states explicitly say:

- “No memory changes have been applied”;
- “Confirmation records intent only; persistence is deferred”;
- “Manage memory settings in Settings”.

It does not add Settings tabs, replace Memory/Knowledge/Personalities configuration, or create fake saved/synced messaging.

## Operation Center style summary

`createPersonalIntelligenceReviewOperationSummary(...)` returns a pure string for low-risk summary surfaces, for example:

```text
Personal Intelligence review preview: confirmation required. Action: forget memory. Persistence: deferred. Side effects: none.
```

It does not write Operation Center events or add runtime actions.

## Implemented in this PR

- Pure review workflow types, policy, helpers, fixtures, and tests under `src/personal-intelligence/reviewWorkflow/`.
- Composition with existing Memory Controls review queue and preview helpers.
- Safe fictional fixtures re-exporting the existing pending, sensitive, stale, conflicting, temporary, expired, sync-risk, normal, and empty graph cases.
- A small right-panel workflow component wired into the existing Personal Intelligence read-only panel.
- Documentation of the preview-to-confirm boundary.

## Deferred

- Durable persistence.
- Real memory mutation.
- Hidden memory capture.
- Memory sync or LucaLink integration.
- Notifications/reminders.
- Scheduled expiration jobs.
- Model calls.
- Tool calls.
- Runtime planning.
- Cross-device memory.
- Full settings workflow.
- Permanent audit log writes.

## Persistence boundary follow-up

The Personal Intelligence persistence boundary contract now consumes confirmed review results as dry-run candidates only. A confirmed result can become persistence-eligible only when `confirmed: true`; cancelled results and blocked previews remain blocked. The boundary adds audit-event and rollback-plan contracts while preserving `persistencePerformed: false`, `mutationPerformed: false`, and `sideEffectsPerformed: false`. Actual persistence remains deferred.

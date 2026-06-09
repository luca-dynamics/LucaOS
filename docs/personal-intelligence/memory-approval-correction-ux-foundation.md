# Personal Intelligence Memory Approval / Correction UX Foundation

## Why memory control exists

Luca must not feel as though it secretly remembers things. Personal Intelligence memory needs an understandable, user-directed control boundary where a person can inspect what Luca believes, preview a correction, and make an informed approval decision before any future persistence layer acts.

This foundation operates on the existing `PersonalMemoryNode` and `PersonalMemoryGraph` model. It does not create a second memory store and does not connect previews to persistence, sync, tools, runtime authority, or model routing.

## Supported control actions

The model supports previewing:

- `approve_memory`
- `deny_memory`
- `forget_memory`
- `correct_memory`
- `edit_memory`
- `make_temporary`
- `make_private`
- `mark_do_not_sync`
- `mark_sync_allowed`
- `archive_memory`
- `restore_memory`

Each preview reports the target memory ID, requested action, current and proposed state summaries, decision, reason, risk, warnings, a human-readable summary, and `sideEffectsPerformed: false`.

## Preview-only behavior

`previewMemoryControlAction` clones the supplied node and produces a proposed state. It never changes the supplied node or graph. The proposed node exists so a future review surface can show the exact governed result without implying that the result has been stored.

Examples:

- Approval previews set the proposed approval state to approved and may move draft or pending memory to active.
- Denial previews change only the proposed approval state.
- Forget previews set the proposed lifecycle to forgotten and require explicit approval.
- Temporary previews require a valid future expiration date; they do not schedule a timer.
- Private and do-not-sync previews set local-only privacy controls and disable sync eligibility.
- Sync-allowed previews are blocked for sensitive and secret memory.
- Sensitive or private corrections require review.
- Forgotten, archived, or expired memory must be restored and reviewed before editing.

Denied and forgotten proposed memories are not eligible to surface as active memory under the memory graph visibility helpers.

## Decision and risk model

Decisions are:

- `allowed`: policy permits the proposed state to be shown for review.
- `approval_required`: a user confirmation boundary is required before any future mutation.
- `blocked`: policy rejects the proposal, such as sensitive sync or a missing expiration.
- `unsupported`: reserved for actions outside the supported control vocabulary.
- `review_only`: the requested state is already present or only review is meaningful.

Risk levels are `low`, `medium`, `high`, and `sensitive`. Sensitivity, privacy, and destructive lifecycle actions increase risk. A decision of `allowed` still means only that a preview can be created; it never grants write authority.

## Review queue

`createMemoryControlReviewQueue` creates a deterministic, read-only queue from a supplied graph and time. It surfaces:

- pending approval memories;
- memories explicitly requiring review;
- stale identity, project, goal, or active-task memory;
- graph conflicts;
- contradictory or unsafe sync flags;
- sensitive or secret memories needing confirmation; and
- temporary context near expiration or already expired.

Queue suggestions are advisory action names only. They do not invoke a mutation handler.

## Basic, Pro, and Creator disclosure

- **Basic** provides friendly review cards and suggested actions without category, sensitivity, staleness, source, confidence, or evidence metadata. Sensitive titles and details are replaced with protected labels.
- **Pro** adds category, sensitivity, and staleness while continuing to redact protected titles, details, and values.
- **Creator** adds safe audit metadata: source, confidence, evidence IDs/count, and related edge IDs. Protected titles, details, evidence reasons, and values remain redacted.

All queue modes report `sideEffectsPerformed: false`.

## Privacy rules

- Sensitive and secret memory cannot be marked sync-allowed.
- Making memory private makes the proposal local-only, disables sync, and requests summary redaction.
- Marking memory do-not-sync makes the proposal local-only and disables sync.
- Protected queue entries never disclose raw values.
- Creator audit data includes identifiers and counts, not evidence text or protected values.
- Privacy flags remain declarative; no cross-device service is connected.

## Implemented in this PR

- Memory control action, request, preview, decision, reason, risk, and review queue types.
- Pure policy evaluation and state preview helpers.
- Basic / Pro / Creator review queue disclosure.
- Safe fictional fixtures covering pending, sensitive, stale, conflict, temporary, expired, sync-risk, and normal memory.
- Focused tests for immutability, policy, redaction, disclosure, queue inclusion, and side-effect-free results.
- Personal Intelligence root exports for the control module.

A UI panel is intentionally deferred. No existing surface could honestly apply these actions without implying a persistence path, so this PR supplies a UI-ready queue and preview model instead of nonfunctional mutation buttons.

## Deferred

- Durable persistence and actual memory mutation.
- Automatic or hidden memory capture.
- Memory import and export.
- Cross-device memory sync or LucaLink integration.
- Notifications, reminders, or scheduled expiration work.
- Runtime planning and runtime authority integration.
- Model routing and tool execution.
- Full Personal Intelligence dashboard and interactive approval workflow.

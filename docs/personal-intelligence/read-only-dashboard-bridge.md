# Personal Intelligence read-only dashboard bridge

## Purpose

The Personal Intelligence read-only dashboard bridge makes the existing Personal Intelligence foundations visible in LucaOS without granting them runtime authority. It presents a compact continuity and memory-review summary in the existing right-panel **Memory** surface.

The bridge is deliberately informational. It does not retrieve live memory, persist data, mutate a memory graph, approve a proposal, call a model, call a tool, plan runtime work, or synchronize data.

## Dashboard intelligence versus Settings configuration

LucaOS already owns configuration surfaces for **Data & Memory**, **Knowledge Base**, **Personalities**, and **Brain**. This bridge does not replace or duplicate any of those tabs.

The responsibilities remain separate:

- **Settings** configures memory, knowledge sources, personalities, models, and related product behavior.
- **The dashboard bridge** summarizes supplied Personal Intelligence context in a safe, read-only form.
- **The existing Memory panel** continues to own its established archive, governance, proposal, and graph concepts.

The bridge currently uses helper text — “Manage memory, knowledge, and personality settings in Settings.” — rather than inventing a route or tab identifier. The current right-panel component does not receive the Settings navigation contract, so a clickable deep link would create unnecessary App-level coupling or risk a broken route.

## Composition

The pure dashboard helper accepts a supplied `PersonalMemoryGraph` and composes the existing foundations:

```ts
createContinuitySnapshot(graph, { mode, now })
createMemoryControlReviewQueue(graph, mode, now)
```

It derives only summary fields, including:

- active project title;
- friendly handoff headline;
- recommended next action;
- open task and blocker counts;
- memory-review count;
- stale-context and privacy-review counts;
- protected-memory count;
- Creator-only review counts by reason;
- preview-only and side-effect-free status.

Continuity selection and memory-review policy remain owned by their existing modules. The dashboard helper does not duplicate their scoring, filtering, or queue rules.

## Safe supplied data

The reusable panel requires a `PersonalMemoryGraph` prop. It never reads browser storage, local files, application memory services, project state, or user data.

The initial product mount supplies the existing fictional continuity fixture and labels it clearly as a safe fictional preview. This makes the bridge visible while preserving the boundary that live memory retrieval is not implemented.

## Basic, Pro, and Creator disclosure

### Basic

Basic shows:

- a friendly handoff headline;
- a safe active-project title when available;
- one recommended next action;
- a simple memory-review count;
- “Memory changes require your approval”;
- Settings guidance.

Basic does not expose graph IDs, review reasons, source/confidence metadata, protected-memory counts, memory IDs, or edge data.

### Pro

Pro shows:

- active project and next action;
- open-task count;
- blocker count;
- stale-context count;
- privacy-review count;
- memory-review count;
- explicit preview-only and no-side-effects status.

Pro does not expose graph IDs, memory IDs, edge data, or protected raw values.

### Creator

Creator adds a safe audit view:

- supplied graph ID;
- continuity generation time;
- protected-memory count;
- review-queue counts grouped by safe reason labels.

Creator remains an audit view, not a privacy bypass. Protected titles, summaries, values, memory IDs, evidence, confidence, and graph edge details are not included.

## Preview-only behavior

Every summary and every mode-specific disclosure reports:

```ts
previewOnly: true
sideEffectsPerformed: false
```

The UI reinforces this with “Preview only” and “No memory changes have been applied.” There are no approve, deny, forget, correct, save, sync, run, or execute actions in the bridge.

## What this change implements

- A pure dashboard summary model under `src/personal-intelligence/dashboard/`.
- Mode-specific safe disclosure shaping for Basic, Pro, and Creator.
- A reusable `PersonalIntelligenceReadOnlyPanel`.
- A compact mount in the existing right-panel Memory surface for desktop and mobile.
- A clearly labeled fictional fixture-backed preview.
- Focused helper and rendering tests for disclosure and protected-content safety.

## Deferred

The following remain intentionally out of scope:

- durable memory persistence;
- real memory mutation;
- hidden memory capture;
- live memory retrieval;
- model calls;
- tool calls;
- runtime planning;
- notifications or reminders;
- cross-device memory sync;
- a full Personal Intelligence dashboard;
- interactive approval workflows;
- direct Settings deep links until an existing navigation contract can be passed without broad App coupling.

# Personal Intelligence Runtime Trace and Learning Events

This phase adds a bounded, in-memory evidence layer for Personal Intelligence. It records summaries of what Luca observed, proposed, blocked, or verified under the execution doctrine:

**Sense → Understand → Plan → Approve → Act → Verify → Learn**

The word **Act** names a doctrine stage; it does not grant execution authority. An Act-stage record can describe a proposal, pending state, blocked or skipped action, or an outcome completed externally. The trace recorder itself never executes an action.

## Evidence, not private chain-of-thought

Runtime traces contain short summaries and bounded evidence references. They are not private chain-of-thought, hidden prompts, raw internal reasoning, raw user files, credential material, secrets, or token dumps. Runtime trace policy blocks those payload classes rather than recording them.

Every trace and stage reports `sideEffectsPerformed: false`. Helpers are pure and defensively copy returned values. Trace state remains in memory unless a future caller explicitly places it in a separately reviewed controlled state holder.

## Learning events are proposal-ready, not persisted

Runtime traces, user feedback, blocked actions, dry-run results, and verification outcomes can become learning-event records. A learning event carries provenance, Privacy Zone, confidence, verification status, optional mission/memory/trace relationships, warnings, and blockers.

Creating a learning event does not:

- save memory;
- approve persistence;
- update a prompt or personality;
- change model/provider routing;
- invoke a skill, tool, workflow, MCP surface, generated code, shell, or browser automation;
- write browser, filesystem, database, network, socket, or Electron state; or
- alter LucaLink runtime or transport behavior.

A safe learning event can be converted into a **persistence proposal preview**. The preview remains `review_required`, has no approval metadata, and reports `writePerformed: false`.

## Governed persistence boundary

Any future memory persistence must continue through the established sequence:

**proposal → policy → approval → dry-run → governed adapter**

Runtime trace and learning helpers do not call `memoryService.saveMemory`, the governed memory adapter, or the controlled live-write helper. The Settings panel renders static safe fixtures and readiness summaries only; rendering performs no write.

## Privacy and content policy

Policy blocks hidden prompts, private reasoning, raw files, credentials, secrets, private keys, token-like strings, and oversized/raw payload dumps. Credential, financial, health, and enterprise traces require explicit approval metadata. Private-zone review requires explicit approval unless a reviewed policy specifically allows private trace review.

An Act stage that claims execution authority is invalid. A completed Act record requires explicit approval context and must identify the result as externally completed; otherwise it is converted to blocked evidence.

## Settings visibility

The **Data & Memory → Personal Intelligence Persistence** surface now includes **Runtime Trace + Learning Events** below the controlled memory approval pilot. It displays:

- the seven doctrine stages;
- a safe memory-approval dry-run trace;
- a blocked live-write trace;
- a user-feedback learning-event preview;
- proposal-readiness and trace-readiness counts; and
- warnings that readiness is not execution or persistence authority.

No new Personal Intelligence mega-tab is introduced.

## Future work

1. Connect real, already-sanitized approval-pilot events to the pure trace recorder.
2. Add a separately governed persistent audit trail.
3. Add mission-profile advisory and collaborative wiring without autonomous execution.
4. Consider a bounded LucaLink handoff later, with redaction, scope, expiry, and explicit approval.

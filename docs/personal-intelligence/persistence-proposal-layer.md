# Personal Intelligence Persistence Proposal Layer

PR #208 adds a governed, side-effect-free layer between read-only Personal Intelligence previews and any future persistence implementation:

> Preview → Proposal → Approval Requirements → Audit Plan → Future Persistence Adapter

## Scope

The layer defines typed memory and learning proposals, pure proposal transitions, validation, policy evaluation, in-memory audit records, rollback/delete plans, and a readiness summary. The existing Data & Memory and Knowledge Bridge Settings surfaces display sample proposal state for inspection.

A proposal describes a possible future operation. It is not an operation and does not carry authority to write. Approval changes the proposal status only to `approved_for_future_adapter`; it never means “approved to write.” Every proposal fixes `writePerformed` to `false`.

## Explicit non-capabilities

PR #208 adds proposal, audit, planning, and readiness models only:

- No memory is written.
- No learning event is persisted.
- No file, browser store, database, provider, network service, runtime service, LucaLink service, MCP runtime, tool, or Electron bridge is contacted.
- No storage adapter is connected.
- No runtime memory, Settings, model routing, personality, or integration state is mutated.
- Serialized previews must not contain hidden prompts, private reasoning, raw files, or credentials.

`readyForFuturePersistenceAdapter: true` means only that the modeled review prerequisites are present. It does not execute or authorize current persistence.

## Proposal lifecycle

1. A preview is converted into a typed `memory` or `learning` proposal.
2. Validation checks required metadata and safe serialized-preview boundaries.
3. Policy evaluation identifies explicit approval requirements, blockers, and warnings.
4. Approval, rejection, and cancellation return new proposal values without mutating the source.
5. Audit and rollback/delete planning values describe evidence a future adapter would need.
6. Readiness summarizes whether a separately reviewed adapter could be considered later.

Future PR #209 or later may add a governed local persistence adapter only after separate review of storage boundaries, migrations, recovery, deletion, retention, and runtime wiring.

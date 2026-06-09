# LucaLink Session Ownership Foundation

## Purpose

LucaLink session ownership is a pure, read-only model for explaining which linked host may own each session lane and whether a proposed handoff is ready for future review. It does not switch transports, migrate sessions, send data, execute tools, mutate trust, change approval state, or perform a handoff.

The model reuses LucaLink linked-host trust and connection states. It does not create a second device registry or a second runtime authority path.

## Ownership lanes

| Lane                   | Meaning                                                       | Current protection                                                    |
| ---------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------- |
| `conversation_owner`   | Host selected to represent the active conversation surface.   | Primary Host or approved active companion.                            |
| `voice_owner`          | Host selected to represent the active voice surface.          | Primary Host, approved companion, or approved voice relay.            |
| `display_owner`        | Host selected to represent the active display surface.        | Primary Host, approved companion, or approved display surface.        |
| `approval_owner`       | Host that retains approval authority.                         | Primary Host only.                                                    |
| `memory_context_owner` | Host selected to represent approved memory context.           | Primary Host or explicitly approved companion; no memory sync occurs. |
| `tool_execution_owner` | Readiness/model lane for possible future execution ownership. | Always `runtime_disabled`; it grants no execution authority.          |
| `handoff_owner`        | Host that represents coordination of a proposed handoff.      | Primary Host only; no handoff is performed.                           |

Each evaluation returns a deterministic owner or an explicit unresolved state. Without an explicit requested owner, eligible hosts are ordered by conservative role priority and then stable host ID.

## Host roles

The model recognizes these session roles:

- `primary_host`
- `active_companion`
- `voice_relay`
- `display_surface`
- `execution_candidate`
- `read_only_observer`
- `handoff_target`
- `revoked`
- `blocked`

These roles classify session participation only. They do not change the linked-host trust registry or promote a host.

## Primary Host protection

The Primary Host remains the approval authority:

- A companion cannot silently become the Primary Host.
- Only `primary_host` may own `approval_owner` or `handoff_owner`.
- A non-primary request for the approval lane returns `pending_approval` with `primary_host_required`.
- An `execution_candidate` is only a model role. It cannot own the runtime-disabled tool lane.

## Ownership states

Evaluations use the following states:

- `owned` — an eligible, approved host is the deterministic model owner.
- `unassigned` — no safe eligible host is available.
- `pending_approval` — explicit approval or Primary Host authority is required.
- `blocked` — the requested host is blocked and cannot own an active lane.
- `revoked` — the requested host is revoked and cannot own an active lane.
- `read_only` — an observer may be represented without becoming an active owner.
- `runtime_disabled` — the lane exists only as a model and has no runtime implementation.

Every result also declares `modelOnly: true` and `sideEffectsPerformed: false`.

## Read-only observers

A `read_only_observer` never becomes an active authority. When explicitly evaluated for a presentation-safe lane, it returns `read_only` with `read_only_observer`. It cannot become approval, handoff, memory, or tool authority through this classification.

## Handoff readiness

`evaluateLucaLinkHandoffReadiness` classifies a proposed source host, target host, lane, governance decision, and ownership state. Its possible states are:

- `ready`
- `approval_required`
- `blocked`
- `revoked`
- `read_only`
- `runtime_disabled`
- `unsupported`

`ready` means only that the supplied model facts are compatible with the lane. It does not mean that a handoff was sent or that a transport exists.

The classifier applies these conservative rules:

- A blocked or revoked target is never ready.
- `remote_action` and `tool_execution_owner` are always `runtime_disabled`.
- A handoff target remains classification-only and requires approval.
- The approval lane requires Primary Host authority.
- Pending or denied governance remains non-authoritative.
- Display and voice lanes may be classified as ready, but no screen, audio, network, or session operation occurs.
- Inputs are not mutated and the result declares `classificationOnly: true` and `sideEffectsPerformed: false`.

## Fixtures

Safe fake fixtures cover a Primary Host, mobile companion, display surface, voice relay, read-only observer, revoked host, blocked host, and handoff target. They contain no credentials, addresses, tokens, or real device identifiers.

## Implemented in this foundation

- Typed ownership lanes, host roles, owners, states, reasons, and evaluations.
- Deterministic pure ownership evaluation.
- Primary Host approval protections.
- Terminal blocked/revoked behavior.
- Read-only observer classification.
- Runtime-disabled tool ownership.
- Pure handoff-readiness classification.
- Tests and architecture-invariant registration for model-only modules.

## Deferred

This foundation intentionally does not implement:

- actual host handoff
- transport switching
- WebRTC or session migration
- remote action execution
- tool execution across devices
- screen-sharing transport
- file-transfer transport
- cross-device memory sync
- persistent ownership state
- real pairing or discovery

Any future runtime implementation must pass through separate, explicit runtime authority and enforcement work. These model results must not be treated as commands.

## Revocation propagation

When a revoked or blocked host appears in an existing ownership assignment, the revocation-propagation dry run marks that lane invalid and describes the review or future cleanup required. It never changes the assignment. Approval ownership may identify the Primary Host as a suggested fallback, but reassignment remains unperformed and review-required. Voice, display, memory-context, tool-execution, and handoff ownership receive lane-specific invalidation guidance. See [LucaLink Runtime Revocation Propagation Plan and Dry-Run QA Matrix](./lucalink-revocation-propagation-dry-run.md).

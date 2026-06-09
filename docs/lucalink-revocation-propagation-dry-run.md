# LucaLink Runtime Revocation Propagation Plan and Dry-Run QA Matrix

## Purpose

The revocation propagation model defines the deterministic cleanup obligations that a future LucaLink runtime must honor when a linked host is revoked or blocked. It is the safety bridge between the existing governance/session-ownership models and any future transport, relay, transfer, memory, or handoff adapters.

This implementation is pure, read-only, and dry-run only. It describes invalidation, cancellation, blocking, review, adapter cleanup, and audit requirements without changing ownership, trust, approvals, transports, sessions, or devices.

## Inputs and output contract

`evaluateLucaLinkRevocationPropagation` accepts:

- a revoked or blocked session host;
- the Primary Host when one is available for review guidance;
- a caller-provided generation timestamp for deterministic results;
- current model-only ownership assignments;
- optional pending handoffs; and
- optional approval records.

The returned plan includes affected lanes, handoff classifications, stale approvals, blocked permissions, future adapter actions, an unrecorded audit event, Device Center state, Operation Center and Device Center summaries, and explicit `dryRunOnly: true` / `sideEffectsPerformed: false` markers.

## Revocation propagation matrix

| Existing state involving revoked/blocked host | Dry-run result                    | Future runtime obligation                                        | Mutation in this implementation |
| --------------------------------------------- | --------------------------------- | ---------------------------------------------------------------- | ------------------------------- |
| Conversation ownership                        | `invalidate`                      | Remove the invalid owner before further use.                     | None                            |
| Voice ownership                               | `invalidate_and_review`           | Stop relay and require reassignment review.                      | None                            |
| Display ownership                             | `invalidate_and_review`           | Stop display session and require reassignment review.            | None                            |
| Approval ownership                            | `primary_host_review`             | Return approval authority to the Primary Host only after review. | None; fallback is a suggestion  |
| Memory-context ownership                      | `invalidate_and_review`           | Clear/re-authorize memory context before reuse.                  | None                            |
| Tool-execution ownership                      | `runtime_disabled`                | Invalidate any candidate; execution remains unavailable.         | None                            |
| Handoff ownership                             | `invalidate_and_review`           | Block coordination until Primary Host review.                    | None                            |
| Pending handoff from host                     | `cancelled`                       | Cancel the future runtime handoff.                               | None                            |
| Pending handoff to host                       | `blocked`                         | Prevent the host from becoming the target.                       | None                            |
| Host is handoff approval owner                | `requires_review`                 | Route a fresh decision to the Primary Host.                      | None                            |
| Remote-action/tool-execution handoff          | `blocked` / `runtime_not_enabled` | Keep the lane disabled regardless of stale state.                | None                            |
| Approved record involving host                | `revoked`                         | Invalidate the approval before future runtime use.               | None                            |
| Pending record involving host                 | `cancelled`                       | Cancel the pending approval.                                     | None                            |

A revoked or blocked host cannot remain owner of any lane. The evaluator never performs automatic reassignment. For `approval_owner`, it may report the eligible Primary Host ID as a suggested fallback, but the result always declares `reassignmentPerformed: false` and requires review.

## Blocked permissions

The dry run invalidates these host permissions:

- `sync_memory`
- `relay_notifications`
- `share_screen`
- `voice_relay`
- `file_exchange`
- `remote_action`
- `tool_execution`
- `admin_trust`

`remote_action`, `tool_execution`, and `admin_trust` remain non-runtime and are reported as `runtime_disabled` even if stale input state claims otherwise. The other listed permissions are reported as blocked for the invalid host.

## Future adapter action plan

The plan can describe the following future adapter obligations:

- `disconnect_transport`
- `stop_voice_relay`
- `stop_display_session`
- `cancel_file_exchange`
- `cancel_pending_handoff`
- `clear_memory_context`
- `invalidate_tool_execution_candidate`
- `record_audit_event`

Every adapter action includes the target host, reason, severity, and `dryRunOnly: true`. No adapter is imported or called. The module does not close sockets, touch WebRTC, stop a session, clear memory, cancel a real transfer, write an audit record, or mutate a registry.

## Operation Center and Device Center summaries

`createRevocationOperationSummary` reports the terminal host state, affected lane count, affected pending-handoff count, stale approval count, future adapter-action count, and the fact that no runtime action was executed.

`createRevocationDeviceCenterSummary` reports a calm revoked/blocked state, invalid ownership and approval-review counts, and that adapter actions are guidance only. The typed Device Center state also exposes whether active ownership is invalid and whether user review is required.

The plan emits one model-only `lucalink_host_revocation_propagation_required` audit event with `recorded: false`. Operation Center persistence and Device Center UI wiring remain deferred to avoid broad runtime or interface work.

## Dry-run QA coverage

Focused tests verify:

- voice and display owner invalidation;
- Primary Host approval fallback review without reassignment;
- source and target handoff cancellation/blocking;
- approval-owner handoff review;
- terminal blocked-host behavior;
- permanent non-runtime permissions;
- dry-run adapter actions and side-effect markers;
- input immutability and deterministic output;
- safe summary counts and Device Center state; and
- source-level exclusion of runtime, socket, transport, persistence, and execution APIs.

Fixtures use fictional host and session identifiers only. They contain no credentials, tokens, network addresses, or real device data.

## Implemented

- Pure revocation propagation types and policy constants.
- Deterministic lane, handoff, approval, permission, adapter-action, audit, and summary evaluation.
- Fictional fixtures including a Primary Host, voice companion, display surface, revoked lane owner, blocked host, handoffs, stale memory permission, and adapter plan.
- Model-only architecture-invariant registration.
- Focused unit and source-safety tests.

## Deferred

- real transport disconnect;
- real voice relay stop;
- real display stop;
- real session migration;
- WebRTC or socket integration;
- real file-transfer cancellation;
- real memory-sync clearing;
- durable trust persistence;
- real audit-log writes;
- Device Center or Operation Center runtime wiring;
- automatic ownership reassignment; and
- real handoff.

A future runtime adapter must treat revoked/blocked state as terminal and consume these obligations before trusting cached ownership, approval, permission, or session state. This document and evaluator do not grant runtime authority.

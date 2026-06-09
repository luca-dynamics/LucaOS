# LucaLink Local Approval Actions + Handoff Review Bridge

This PR adds a local-only, preview-first approval action model for LucaLink. It helps Device Center explain what would happen if a user approves, denies, revokes, blocks, reviews, or cancels a handoff for a linked host.

## What this implements

- A pure approval action model under `src/services/lucaLink/approvalActions/`.
- Preview results for `approve_host`, `deny_host`, `revoke_host`, `block_host`, `review_handoff`, and `cancel_handoff`.
- Device Center copy and cards that show pending approval, limited trust, revocation consequences, handoff readiness, Primary Host review, and runtime-disabled status.
- Basic / Pro / Creator disclosure summaries.
- Fictional fixtures only: Primary Host, pending mobile companion, trusted devices, revoked/blocked hosts, display surface, voice relay, and handoff cases.

Every preview returns `sideEffectsPerformed: false` and `previewOnly: true`. The module does not pair devices, open transport, execute handoffs, disconnect hosts, persist trust, sync memory, transfer files, execute tools, or run remote actions.

## Approve / deny / revoke preview model

`approve_host` is only preview-allowed for pending, pairing, or limited untrusted onboarding states. It requires explicit confirmation, proposes `trusted_limited`, and does not grant `trusted_full` or admin authority. Sensitive permissions remain approval-required, and `remote_action`, `tool_execution`, and `admin_trust` remain runtime-disabled.

`deny_host` previews a pending or pairing host moving to a blocked/revoked state. It blocks future handoff and permission use in the preview, but it does not disconnect runtime transport or mutate persistent trust.

`revoke_host` and `block_host` compose the existing revocation propagation dry-run evaluator. They show affected ownership lanes, stale approvals, blocked permissions, dry-run adapter cleanup actions, and audit event previews. `block_host` is treated as higher risk and stronger than revoke, but remains dry-run.

## Revocation dry-run composition

The approval action evaluator calls `evaluateLucaLinkRevocationPropagation(...)` for revoke/block previews. The resulting plan is surfaced as review evidence only:

- affected lanes
- cancelled or blocked pending handoffs
- stale approval records
- blocked permissions
- adapter dry-run actions
- audit event preview
- Device Center and Operation Center summary text

Adapter actions are guidance for future runtime cleanup. They are not executed.

## Handoff review bridge

`createLucaLinkHandoffReviewSummary(...)` composes handoff readiness, governance, and session ownership. The summary includes handoff IDs, source/target host IDs, lane, readiness, reason, Primary Host review requirements, runtime-disabled status, and preview flags.

Rules:

- `remote_action` and `tool_execution_owner` are always runtime-disabled.
- Revoked or blocked targets are blocked.
- A read-only observer cannot become authority.
- Display and voice lanes may be classified as ready only; no real relay or migration occurs.
- Approval owned by a non-Primary Host requires Primary Host review.

## Basic / Pro / Creator disclosure

Basic shows calm user-facing status: pending approval, approve/deny/revoke explanation, “Sensitive access remains blocked,” and “No runtime action executed.” It hides raw host IDs, lane matrices, adapter action lists, and audit identifiers.

Pro adds counts: trust state, permission summary, affected lane count, stale approval count, blocked permission count, and handoff readiness state. It still hides raw dry-run matrices.

Creator shows safe diagnostics: masked IDs, affected lanes, dry-run adapter action names, audit event preview, and model-only/dry-run flags. Creator disclosure does not bypass governance or execute runtime behavior.

## Why trusted_full/admin trust is not automatic

Local approval intentionally defaults to `trusted_limited`. `trusted_full` and `admin_trust` would imply stronger authority and require separate Primary Host review, durable audit design, and runtime enforcement that is not implemented here. This prevents silent escalation and keeps sensitive capabilities behind explicit governance.

## Deferred

- real device pairing
- real QR/code pairing
- real network discovery
- real transport disconnect
- WebRTC/socket/session migration
- real handoff
- remote action execution
- tool execution
- screen sharing
- file transfer
- memory sync
- persistent trust writes
- durable audit log writes
- automatic trust escalation

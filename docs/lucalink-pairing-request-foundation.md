# LucaLink Pairing Request Model + QR/Code Approval Foundation

This foundation adds a safe, deterministic preview layer for future LucaLink pairing requests. It is model-only and exists so Device Center can explain how pairing approval, expiration, limited trust, and Primary Host review would work before any runtime pairing system exists.

## What this PR implements

- A pure pairing request model under `src/services/lucaLink/pairingRequests/`.
- Fictional QR/code preview contracts that are non-secret, single-use, expiring, and not valid for runtime pairing.
- Deterministic evaluation helpers for pending, expired, blocked, approval-preview, denial-preview, and Device Center summaries.
- A small read-only Device Center preview card that states that no real pairing has started.
- Focused tests proving the helpers are side-effect-free, preview-only, non-runtime, and disclosure-aware.

## Pairing request model

Every pairing request preview carries:

- `requestId`, `sourceHostId`, `targetHostId`, display name, device type, host type, and platform.
- request method: `qr_code`, `short_code`, `manual_code`, `nearby_preview`, or `link_token_preview`.
- status: `draft`, `pending`, `awaiting_primary_host`, `approved_preview`, `denied_preview`, `expired`, `revoked`, `blocked`, or `unsupported`.
- requested permissions, requested trust, requested connection state, risk, reason, warnings, and expiry.
- `sideEffectsPerformed: false` and `previewOnly: true`.

New requests default to Primary Host review and `trusted_limited`. They do not escalate to `trusted_full` automatically.

## QR/code preview contract

The QR/code preview is deliberately fictional:

- `singleUse: true`
- `containsSecret: false`
- `validForRuntimePairing: false`
- `sideEffectsPerformed: false`
- `previewOnly: true`

Preview codes such as `LUCALINK-DEMO-4281` and `PAIR-PREVIEW-8392` are display strings only. The QR payload preview is marked non-secret and runtime-disabled. It does not contain a network address, URL, raw credential, real session token, key, persistent pairing token, or host transport endpoint.

## Expiration

Every request must expire. Expired requests evaluate to `expired`, block approval previews, and do not delete any model record. Expiration preview returns a side-effect-free `expired` state with `approvalBlocked: true`.

## Primary Host approval

Pairing approval previews require:

- Primary Host approval.
- user confirmation.
- `trusted_limited` as the proposed trust state.
- no linked-host registry mutation.
- no transport start.

If the Primary Host is missing, evaluation remains review-only and approval preview is blocked.

## Sensitive permissions

`remote_action`, `tool_execution`, and `admin_trust` remain runtime-disabled and blocked for pairing. Sensitive permissions remain blocked or approval-required. Memory sync can be requested only as an approval-required preview; no memory is synced.

## Basic / Pro / Creator disclosure

- **Basic** shows friendly status, preview code, expiration, Primary Host approval, limited trust, and no-real-pairing copy. Raw request IDs, host IDs, permission matrices, audit payloads, and QR internals are hidden.
- **Pro** adds method, device type, host type, requested trust state, requested permission count, expiration state, and approval/denial preview state without exposing secrets.
- **Creator** adds masked request/host IDs, non-secret QR payload preview, audit preview, and model-only flags. Creator mode does not bypass pairing approval.

## Operation Center summary

The pure Operation Center summary reports: pairing request preview, decision, method, `trusted_limited`, runtime pairing disabled, side effects none, and preview-only. It does not emit events, write logs, or change Operation Center state.

## Why no real pairing happens

This foundation imports no runtime pairing, QR scanner, socket, WebRTC, network, transport, or storage APIs in the pairing request module. Device Center displays a preview fixture only. Approval/denial/expiration helpers return model objects and never mutate the linked-host registry, persist trust, start transport, or write durable audit logs.

## Deferred

- real QR scanning
- real QR generation for runtime use
- real pairing code verification
- real network discovery
- real WebRTC/socket/transport connection
- real linked-host registry writes
- persistent trust state
- durable audit logs
- device identity handshake
- key exchange
- file transfer
- screen sharing
- voice relay
- memory sync
- remote action
- tool execution
- real handoff

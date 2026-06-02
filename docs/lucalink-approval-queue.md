# LucaLink Approval Request Queue

PR #192 adds a pure Primary Host approval request model and in-memory pending approval queue for LucaLink soft-enforcement decisions.

## Purpose

The queue records actions that LucaLink soft enforcement classifies as `requires-primary-host-approval`. It stores only a bounded approval request and does not execute, retry, transmit, or display the blocked action.

## Lifecycle

Requests start as `pending` and can become:

- `approved`
- `denied`
- `expired`
- `cancelled`

Approving, denying, cancelling, and expiring a request records a serializable decision object with timestamp and optional reason/device metadata. Finalized requests are not returned as pending.

## Queue defaults

- Default TTL: 5 minutes
- Max requests: 100
- Dedupe window: 10 seconds

The queue is in-memory only. It does not use localStorage, sessionStorage, backend endpoints, sockets, or telemetry.

## Dedupe behavior

Pending requests dedupe when they match by event name, lane, permission, requesting device, target device, and source inside the dedupe window. A deduped request updates `updatedAt` and records a warning that an existing pending approval request was reused.

When capacity is reached, finalized requests are removed first. If all requests are still pending, lower-risk pending requests are preferred for removal before high-risk or critical pending requests.

## Payload preview and redaction

Payload previews are bounded and sanitized before being stored. The preview helper:

- redacts obvious secret keys such as passwords, tokens, secrets, API keys, private keys, bearer/authorization fields, credentials, seeds, and mnemonics
- truncates long strings
- limits array length
- limits object depth
- avoids mutating the original payload

## Soft-enforcement bridge

The bridge creates approval requests only when soft enforcement returns `requires-primary-host-approval` and `requiresPrimaryHostApproval: true`. It does not create requests for `allow`, `deny`, `observe-only`, or disabled-mode results.

Generated requests preserve the soft-enforcement reason, explanation, warnings, errors, lane, permission, risk, and device context where available.

## Runtime exposure boundary

`lucaLinkService` exposes non-UI queue helpers for listing, summarizing, approving, denying, cancelling, and clearing in-memory requests. Outbound `send(...)` and `beamPacket(...)` can enqueue a pending request only when soft enforcement is explicitly enabled and returns a Primary Host approval requirement.

This PR does **not** add approval UI, modals, prompts, notifications, socket events, persistence, network behavior, automatic approval, action retry, or full runtime enforcement.

## Next step

A later PR can connect these in-memory requests to Primary Host approval UX and Device Center hooks while preserving the boundary that approvals do not imply automatic action execution unless a future runtime continuation layer explicitly implements it.

# LucaLink Runtime Continuation Model

PR #194 adds a pure runtime continuation model for LucaLink actions that were blocked for Primary Host approval. It defines short-lived, serializable continuation tokens and an in-memory registry that can answer whether a later manual continuation would be allowed. PR #195 connects approved Device Center approval decisions to this registry and adds read-only continuation visibility.

## Approval does not equal execution

A Primary Host approval only records that a blocked request was approved. It does **not** retry, replay, emit, send, execute, or continue the original action. Continuation tokens are model records only; full runtime continuation wiring is intentionally deferred.

## Token lifecycle

Continuation tokens can be `pending`, `validated`, `consumed`, `expired`, `cancelled`, or `blocked`.

1. An approved Device Center approval request can create a continuation token.
2. The token receives a short TTL (default: 2 minutes).
3. Validation checks status, expiry, replay mode, and optional device/lane/permission/event context.
4. Consumption is single-use and only records `consumedAt` / `consumedByDeviceId`; it does not execute anything.
5. Tokens are stored in memory only and can be expired, cancelled, summarized, or cleared.

## Replay modes

- `fresh-confirmation-required`: physical-world, payment, and critical safety actions must get a new Primary Host confirmation and are blocked as continuation records.
- `non-replayable`: audit/model-only; never valid for continuation.
- `manual-retry-only`: shell, browser, git, code, file, and unknown actions require a separate manual retry path.
- `single-use-replayable`: reserved for intentionally safe low/medium-risk actions such as notifications or simple conversation continuation. In this PR it remains a model classification only.

## Fresh-confirmation-required actions

Payment spend, robotics motion, smart-home control, physical-world actuator commands, and critical safety lane commands are recorded as blocked tokens. Their warnings explain that they cannot be replayed from approval without fresh Primary Host confirmation.

## Device Center bridge

Device Center approval now calls the approval queue first and, only when the request status becomes approved, creates a continuation token from the approved request. Denied and cancelled approvals do not create continuation tokens.

Device Center Advanced can display continuation totals, valid records, consumed records, expired / blocked records, and replay-mode counts. The optional record controls validate, cancel, or mark consumed as state only. They do not run the original action.

## Registry boundary

The continuation registry is in-memory only. It has no persistence, socket events, backend endpoints, telemetry, local/session storage access, browser/device API access, network calls, automatic retry, action replay, or runtime continuation execution.

## Next step

A later PR can add a controlled runtime continuation bridge. That bridge must preserve the Origin vs Primary Host boundary and keep execution separate from approval and token consumption.

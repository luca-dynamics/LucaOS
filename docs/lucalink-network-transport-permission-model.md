# LucaLink Network / Transport Permission Model

## Scope

This milestone adds a side-effect-free policy and evaluation layer for LucaLink message classes and transport channels. It models requests, channel policy, message-class policy, preview decisions, readiness, audit records, fixtures, and read-only Device Center visibility.

It does **not** change live transport behavior. No Socket.IO, relay, LAN, WebRTC, VPN, WebSocket, peer, or fetch send occurs. The model does not connect, pair, persist, approve, cast, collect sensors, execute adapters, or mutate a remote host.

## Channels and message classes

The model covers local-only preview, manual pairing metadata, QR pairing metadata, LAN, relay, guest relay, and explicitly gated future WebRTC, VPN, and future transport channels. It evaluates heartbeat, host status, pairing, approval notification and decision intents, display, sensor, adapter, guest, mission sync, bounded handoff, diagnostic, and blocked-sensitive-payload classes.

Channel and message-class policies are both required for a request to pass. Trust level, session kind, risk, privacy, expiry, approval state, blockers, and sensitive-content screening are evaluated without calling a transport.

## Decision meanings

- `allowed_preview` means the model says a request could be considered as a policy preview. It does not mean the message was sent, queued, connected, or executed.
- `approval_required` means explicit approval metadata is still required before an allowed preview can be produced.
- `blocked` means trust, session, risk, privacy, content, or class/channel policy rejected the request.
- `expired` means the request passed its expiry time.
- `unsupported` means the channel is not enabled for policy preview in this milestone.

Every request, decision, readiness summary, and audit record reports `sideEffectsPerformed: false`. `isTransportDecisionSendable` always returns false, `liveTransportMutationEnabled` remains false, and `readyForLiveSend` remains false.

## Model-level conversions

Display intents, read-only sensor snapshots, companion approval notifications, and adapter plans can be converted into transport permission requests. Conversion copies summarized model metadata only. It does not mutate the source object, invoke approval helpers, collect sensor data, mutate a queue, load an adapter entrypoint, or authorize runtime transport.

## Safety boundaries

Sensitive payloads are blocked. This includes credentials, secrets, token-like content, hidden prompts, private reasoning, and raw file or raw memory content. Private previews require explicit approval metadata. Guest relay accepts only low-risk guest messages in a guest session. WebRTC, VPN, and unspecified future transports remain unavailable and not sendable.

The Device Center card is read-only, has no send/connect/approve/cast controls, and performs no polling or effect-driven network work.

## Future work

A separate review may connect this policy to runtime enforcement. Any future live transport work must preserve explicit approval, auditability, expiry, redaction, strict message-class/channel enforcement, trust and session checks, and deny-by-default behavior. Policy approval must never be treated as proof that a message was sent or an action was executed.

## Dashboard Operation Center summary

These model outputs can be represented as normalized, read-only cards in the Dashboard Operation Center. Summarization is informational only: it does not send, execute, approve, persist, or mutate LucaLink runtime state.

## Dry-run handoff simulation integration

LucaLink governance outputs can feed the side-effect-free dry-run handoff simulation layer and may appear as read-only `lucalink_dry_run` summaries in Operation Center. Dry-run evidence does not send, execute, collect, write, install, approve, open displays, or mutate pairing, transport, approval, device, or runtime state.

## Runtime authority boundary

Transport decisions may be reviewed as evidence by the Runtime Authority Boundary. `allowed_preview` and `approval_required` are evidence states only; neither enables a send. Candidate review also requires host scope, approval, expiry, redaction, file/install safety, sensor restrictions, and Operation Center visibility. See [LucaLink Runtime Authority Boundary and Handoff Capability Registry](./lucalink-runtime-authority-boundary.md).

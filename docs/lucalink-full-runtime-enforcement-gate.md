# LucaLink Full Runtime Enforcement Gate

PR #197 adds the first staged full-runtime enforcement gate for LucaLink outbound/send-like action paths. The gate is pure by default and returns decisions, warnings, and audit records only; it does not send, emit, persist, open sockets, call backend endpoints, run tools, or execute shell/file/code/browser/payment/robotics/smart-home/physical actions.

## Enforcement modes

- `disabled` — default mode. Runtime behavior is unchanged and results are audit/shadow records only.
- `observe-only` — evaluates the adapter, observer, and soft-enforcement stack but never blocks.
- `high-risk-only` — follows the existing soft-enforcement high-risk gates from PR #191.
- `full-outbound` — explicitly enabled blocking mode for outbound/send-like paths only.

No-argument service enablement uses `observe-only`; `full-outbound` must be requested explicitly.

## Outbound-only first boundary

The gate is intentionally narrow for this PR. It is wired around controlled outbound `send` and `beamPacket` paths first. Pairing, connection setup, relay/local/VPN behavior, guest PIN/auth, WebRTC handshakes, mission sync, and sensor pulse observation are not hardened or blocked broadly in this PR.

## Allowed normal flows

In `full-outbound`, the gate allows low-risk LucaLink flows such as:

- normal conversation messages
- presence and heartbeat
- registry sync
- basic notifications
- guest chat responses that remain in the conversation lane
- safe/diagnostic WebRTC signaling classifications that do not request tool, memory, safety, or identity authority

## Approval-gated flows

High-risk outbound actions are denied or queued for Primary Host approval, including:

- `shell.execute`
- `files.write`
- `code.modify`
- `git.create_pr`
- `browser.control`
- sensitive settings writes
- model mutation signals
- artifact write/delete signals
- guest memory/tool/safety/full-identity attempts
- high/critical unknown actions that are not fresh-confirmation classes

The normal mesh authority term is **Primary Host**. `Origin` remains reserved for LucaOS Creator/source-code authority and is not used as a mesh approval role.

## Fresh-confirmation flows

Payment, physical-world, and critical safety actions require fresh confirmation and are not auto-continued:

- `payment.spend`
- `robotics.motion`
- `smart_home.control`
- actuator or physical-world command hints
- critical safety actions

## Continuation handling

Continuation tokens are evaluated through the controlled continuation bridge. Valid safe continuation tokens can allow or prepare model-only continuation records for safe notification/conversation/message categories. Manual-retry-only, fresh-confirmation, expired, consumed, cancelled, blocked, or context-mismatched tokens are refused and do not execute anything.

## Audit buffer

The service keeps a small in-memory audit buffer for runtime enforcement decisions. Records include timestamp, mode, scope, event name, decision, block/allow status, approval request id when queued, continuation token ids when used or prepared, warnings, errors, and an explanation.

There is no persistence, no storage write, no network telemetry, no approval push notification, and no new socket event.

## Next step

The next hardening step is inbound hardening plus guest/session trust hardening after this outbound-only enforcement foundation has stabilized.

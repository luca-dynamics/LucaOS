# LucaLink Sync Lane Protocol

PR #185 introduces a typed, pure protocol model for future LucaLink Mesh sync traffic. It defines an envelope that can carry lane-specific payloads without changing the current Socket.IO, relay/local/VPN, guest, WebRTC, crypto/session, mission, sensor, Settings, boot, onboarding, theme, shell, or platform-background runtimes.

## Origin vs Primary Host

Origin is reserved for LucaOS Creator/source-code authority and root system blueprint control.
Primary Host is the user's main trusted device inside LucaLink Mesh.
Primary Host can approve mesh/device actions, but it is not Creator/Origin authority.

## Envelope shape

Every protocol message is a `LucaLinkEnvelope` with:

- `version: "luca-link/v1"`
- stable message metadata: `id`, `lane`, `type`, `sourceDeviceId`, `targetDeviceId`, `timestamp`
- `security`: encryption, signature, ack, optional trust-level, and optional expiry metadata
- `routing`: priority, delivery preference, and retry policy
- `payload`: a typed payload for the selected lane

The envelope is transport-neutral. A follow-up adapter can map the existing LucaLink runtime events (`message`, `sync`, `mission`, `SENSOR_PULSE`, guest events, and WebRTC events) into envelopes.

## Lanes

The protocol currently models twelve lanes:

1. `identity` — host manifests, public keys, trust grants, revocation, bootstrap metadata
2. `presence` — online/offline/heartbeat/status updates
3. `conversation` — messages, typing state, handoff, thread state
4. `memory` — memory proposals, accept/reject results, conflicts
5. `settings` — settings sync, diffs, conflicts, acknowledgements
6. `mission` — mission state, progress, handoff, cancellation
7. `sensor` — camera/mic/screen/location/motion/IoT references and metadata
8. `tool` — tool requests/results/approvals/denials
9. `artifact` — artifact create/update/transfer/delete requests
10. `notification` — alerts, approval prompts/results, reminders, progress
11. `model` — model capability and route availability
12. `safety` — kill-switch, revocation, pause/resume sync, key rotation, security alerts

## Security and routing defaults

Factory defaults are conservative protocol defaults only; they do not send, route, enforce, or prompt at runtime.

- Envelopes are signed by default.
- Envelopes are encrypted by default except the presence lane.
- Identity, memory, settings, tool, artifact, and safety envelopes require acknowledgements by default.
- Safety defaults to critical priority and persistent retry.
- Tool, mission, and notification default to high priority.
- Presence defaults to direct delivery; other lanes default to relay delivery.

## Validation

`validateLucaLinkEnvelope` checks the protocol version, required metadata, known lane IDs, finite timestamps, security/routing presence, payload presence, payload `kind`, encryption requirements for sensitive lanes, signature requirements, acknowledgement requirements, safety priority, and expiry warnings.

## Policy evaluation helper

`evaluateEnvelopePolicy` combines envelope validation with the pure trust-policy helpers from PR #184:

- `canHostParticipateInLane(manifest, envelope.lane, options)`
- `evaluateHostPermission(manifest, payload.permission, options)` when a payload carries a permission

This remains policy evaluation only. Live send/receive enforcement is intentionally left for a later routing/adapter PR.

# LucaLink Device Center foundation

## Scope

The Device Center foundation normalizes LucaLink's existing in-memory device
trust registry into a linked-host view. It is a model and disclosure layer: it
does not pair devices, persist trust, disconnect transports, execute remote
actions, or bypass Primary Host approvals.

## Linked-host registry model

`LucaLinkLinkedHostRecord` gives Device Center consumers one stable shape:

- identity: `id`, `displayName`, `createdAt`, and `updatedAt`
- classification: `deviceType`, `hostType`, and `platform`
- presence: `lastSeenAt`, `connectionState`, and optional `activeSessionId`
- governance: `trustState`, `permissionProfile`, and `isCurrentDevice`

The model adapts existing `LucaLinkTrustedDeviceRecord` values. The current
trust registry remains the source of truth; no parallel runtime registry or
transport was introduced.

### Device types

The normalized device vocabulary is `desktop`, `mobile`, `browser`, `display`,
`watch`, `server`, and `unknown`. Existing LucaLink host roles remain available
as `hostType`, preserving distinctions such as Primary Host, companion,
execution, display, sensor, and embodied hosts.

### Connection states

- `online`: currently connected
- `offline`: known but not currently reachable
- `pairing`: known guest/pairing state is incomplete
- `pending_approval`: linked record still requires explicit trust approval
- `revoked`: local trust was revoked
- `blocked`: host is blocked locally

These are display/model states. They do not claim that a remote transport has
been terminated.

### Trust states

- `untrusted`: no trusted access is recorded
- `pending`: explicit trust approval is still required
- `trusted_limited`: scoped trust is recorded
- `trusted_full`: broader device trust is recorded, while sensitive actions
  remain approval-gated
- `revoked`: trust is inactive, including locally blocked records

No transition silently promotes a host. Existing trust mutations remain audited
by the LucaLink device trust registry.

## Permission profiles

Device Center presents these scoped permissions:

- presence, context sync, memory sync, notification relay, and voice relay
- screen sharing, file exchange, remote actions, tool execution, and
  administrative trust

Every permission has a stable identifier, label, short description,
sensitivity marker, and state (`allowed`, `denied`, `requested`, or `pending`).
Screen sharing, file exchange, remote actions, tool execution, and
administrative trust are sensitive.

The profile is deliberately conservative:

- remote actions are denied by this foundation
- tool, file, and administrative access can be shown as pending when existing
  registry capabilities indicate a request path
- revoked and blocked hosts receive no allowed or pending permissions
- a displayed permission is not a runtime enforcement decision

## Experience-mode disclosure

- **Basic** shows linked hosts, current-device identity, connection/trust state,
  last seen, and an allowed/pending permission count.
- **Pro** adds the permission profile and session status.
- **Creator** additionally shows registry capability/denial diagnostics.

Mode disclosure changes information density only. It never changes host trust,
permissions, or runtime authority.

## Implemented in this PR

- typed linked-host, trust-state, connection-state, and permission models
- adapters from the existing device trust registry
- calm display metadata for pending, revoked, and blocked hosts
- current-device marker and experience-aware Device Center details
- focused pure-model tests

## Deferred

- durable linked-host persistence and cross-process synchronization
- automatic pairing (intentionally not supported)
- approval/deny transport wiring beyond existing safe local handlers
- remote action and tool execution enforcement
- active-session lifecycle integration
- transport disconnect/revocation propagation
- Personal Intelligence memory synchronization changes

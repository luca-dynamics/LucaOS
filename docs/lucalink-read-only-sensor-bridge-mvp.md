# LucaLink Read-only Sensor Bridge MVP

## Scope

This track adds a model-only, read-only sensor/status bridge for harmless host
and device readiness metadata. It can create, validate, expire, summarize, and
preview snapshots covering battery and network status, device class, screen
status, OS/browser metadata, activity state, capability availability,
permission readiness, and host health.

The implementation uses static safe fixtures and pure model helpers. It does
not collect live sensor data or call host/device sensor APIs. Every snapshot,
policy evaluation, readiness summary, and audit record has
`sideEffectsPerformed: false`.

## Explicit safety boundary

The bridge does not:

- access or request camera, microphone, precise location, biometric, contact,
  file, or clipboard data;
- access cookies, credentials, tokens, local secrets, raw storage, hidden
  prompts, private reasoning, or raw file payloads;
- poll in the background or perform surveillance;
- send telemetry through LucaLink, Socket.IO, relay, LAN, WebRTC, VPN, QR,
  pairing, guest, or another transport;
- persist snapshots to browser storage, databases, or files;
- execute adapter entrypoints, generated code, tools, shell commands, installs,
  browser automation, or MCP; or
- control a device or mutate transport, Personal Intelligence, model-provider,
  or routing behavior.

Allowed snapshot values are summaries and metadata only. Unknown sensor kinds
and explicitly sensitive kinds are blocked. Expired snapshots are expired, and
any model claiming it is not read-only or has performed side effects is blocked.
Private snapshots require explicit approval metadata by default.

## Adapter sandbox integration

`createSensorSnapshotFromAdapterPlan` accepts only plans requesting
`sensor.read` or `device.status.read`. It inspects the declarative plan and does
not import or execute its entrypoint. A blocked or rejected plan produces a
blocked snapshot, and a request for a sensitive sensor kind remains blocked.
Adapter approval never grants live sensor access.

Both `sensor.read` and `device.status.read` are model-only/readiness-only in this
MVP.

## Device Center preview

The existing LucaLink Device Center includes a **Read-only Sensor Bridge MVP**
card. It shows model-only status, ready snapshot count, allowed and blocked
kinds, a sample host/device, capability and permission summaries, disabled live
collection, and `sideEffectsPerformed: false`.

The card has no live-collection button, permission prompt, polling behavior, or
sensor API call. Readiness means only that the model and preview layer can
represent a safe snapshot; it does not enable runtime collection.

## Future live collection requirements

If live collection is ever proposed, it must be delivered and reviewed as a
separate track with all of the following:

- a network/transport permission model;
- explicit host approval;
- foreground-only collection;
- clear snapshot expiry;
- redaction before model or transport use;
- side-effect-free and persisted audit semantics appropriate to that future
  permission model; and
- clear, user-visible controls for collection and revocation.

No part of this MVP pre-authorizes that future work.

# LucaLink Protocol

## Mission
Maintain one coherent Luca cognition across multiple host bodies.

## Protocol Domains
- Device registry and trust profile
- Pairing/handshake
- Heartbeat and liveness
- Active state sync (NOW layer)
- Memory sync (policy-scoped)
- Mission delegation/handoff
- Conflict resolution and recovery

## Continuity Rules
- One canonical active mission state with deterministic ownership transfer.
- State deltas are signed and ordered.
- On disconnect, preserve local checkpoint and reconcile on reconnect.

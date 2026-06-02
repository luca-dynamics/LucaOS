# LucaLink Legacy Adapter + Runtime Observation

PR #189 adds a pure adapter and observer layer for the current LucaLink runtime shapes. It is a bridge for future shadow-mode wiring only; it does not change live Socket.IO, pairing, relay/local/VPN, guest, WebRTC, mission, sensor, Settings, boot, shell, or background behavior.

## Legacy events mapped

| Legacy shape/event | Mesh output | Notes |
| --- | --- | --- |
| `LucaLinkDevice` registry entries | `LucaHostManifest` | Uses conservative form-factor role mapping; desktop becomes `primary` only with an explicit Primary Host hint. |
| `message` | `conversation` by default | Tool-like payloads map to `tool` only when clearly tool-related. |
| `sync` / `registry` | `presence` or `mission` | Unknown sync becomes a diagnostic notification with a warning. |
| `mission` | `mission` | Summarizes mission state/handoff metadata without parsing or executing mission content. |
| `SENSOR_PULSE` | `sensor` | Produces an `iot-pulse`-style sensor payload without reading sensors or requesting permissions. |
| Guest events | `conversation` or `presence` | Guest messages never become memory/tool/safety lanes. Restricted-looking guest payloads are downgraded with warnings. |
| WebRTC signaling | `notification` | Diagnostic envelope only; no WebRTC behavior is implemented or changed. |

## Observation decisions

The runtime observer adapts a legacy event, validates the envelope, optionally evaluates policy against a manifest, and optionally asks the Host Router for a shadow route. Reports can be `would-allow`, `would-deny`, `would-require-primary-host-approval`, `would-route`, `adapter-warning`, or `adapter-error`.

## Boundary

This layer is observer/model only. It never blocks messages, sends messages, mutates runtime state, writes storage, opens sockets, prompts for permissions, accesses camera/mic/location, or enforces policy. Mesh authority continues to use `Primary Host`; `Origin` remains reserved for LucaOS Creator/source-code authority and is not introduced as a LucaLink host role or approval concept.

## Next step

Future work can wire these helpers into live runtime diagnostics as shadow observation, still before any enforcement path is added.

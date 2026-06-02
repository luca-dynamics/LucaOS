# LucaLink Device Trust Management

PR #199 adds a local, in-memory LucaLink device trust management layer for the Device Center. It lets LucaOS represent known devices, summarize their conservative permissions, and record local trust mutations without changing transport behavior.

## Purpose

The registry gives the Device Center safe controls for:

- renaming known LucaLink devices;
- changing local trust levels within strict safety rules;
- revoking or blocking a device locally;
- unblocking a device without automatically trusting it;
- summarizing capabilities, denied sensitive capabilities, and permission state;
- exposing an in-memory trust audit trail.

The registry is pure and side-effect-free. It does not open sockets, call fetch, write storage, prompt for permissions, execute tools/actions, or persist trust state.

## Trust levels

- `guest`: temporary conversation/WebRTC-limited sessions.
- `paired`: known paired devices with conversation and notification presence only.
- `trusted`: richer known-device status with conservative memory read only when the device advertises and policy supports it.
- `admin`: advanced device management for eligible execution or companion devices. Admin does **not** bypass Primary Host approvals or runtime enforcement.
- `owner`: reserved for the current local Primary Host inside the LucaLink mesh. This PR does not implement owner transfer.

## Roles

- `primary-host`: the current local Primary Host when already clearly known.
- `execution`: desktop, laptop, workstation, or server-like hosts.
- `companion`: phone or tablet devices.
- `guest`: browser, web, or guest sessions.
- `sensor`: camera, watch, sensor, or IoT devices.
- `display`: TV, display, monitor, or projector devices.
- `embodied`: robot, drone, humanoid, or future physical devices.
- `unknown`: retained for unclassified records, though defaults prefer conservative execution/guest behavior depending on evidence.

## Default capability model

Permission summaries are intentionally conservative:

- Guests can use conversation access and remain WebRTC limited. Notifications and sensitive permissions are denied.
- Paired devices can use conversation and notification presence. Memory, tools, files, code, browser, shell, payment, and physical-world actions remain denied.
- Trusted devices may receive memory-read summary only if the capability is explicitly present. Tool, file, code, browser, and shell authority still remains off by default.
- Admin devices may show broader management capability summaries, but high-risk runtime execution remains subject to Primary Host approval and runtime enforcement.
- Payment and physical-world actions stay denied in this PR. Embodied and sensor devices do not receive physical-world authority by default.

## Mutation rules

- Unknown device mutations return structured errors rather than throwing.
- Rename trims names, rejects empty names, and caps display names at 64 characters.
- Guests cannot become admin or owner.
- Sensor and embodied devices cannot become owner.
- Owner assignment is rejected unless the caller explicitly allows owner assignment and the performing device matches the current local Primary Host. This is not a transfer mechanism.
- Admin is limited to execution or companion devices.
- Every trust mutation writes an in-memory audit record capped at 100 records by default.

## Revoke/block boundary

Revoke and block are local-only state changes:

- They mark a record as `revoked` or `blocked`.
- They clear sensitive advertised capabilities from the local summary.
- They do not disconnect sockets.
- They do not emit revoke/block messages.
- They do not add new socket events, backend endpoints, persistence, or network telemetry.

## Explicit non-goals

This PR does not implement Primary Host transfer, owner transfer, mobile approval flow, trust synchronization, remote disconnect, pairing changes, backend persistence, dangerous execution, payment execution, or robotics/smart-home/physical actuation.

No Origin authority is introduced for devices. The reserved Creator/source-code authority term is not used as LucaLink device authority. Normal mesh authority remains Primary Host, with `owner` as the highest user mesh trust level.

## Next steps

Follow-up LucaLink work can build on this local model for Memory / Conversation Handoff or Mobile Approval Flow while preserving the Primary Host boundary and runtime enforcement gates.
